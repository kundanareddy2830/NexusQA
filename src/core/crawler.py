import asyncio
import aiohttp
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

API_INTERCEPTOR_JS = """
(function() {
    if (window._telemetrySetup) return;
    window._telemetrySetup = true;
    
    window.interceptedAPIs = [];
    window._telemetry = { consoleErrors: 0, networkFailures: 0, slowApis: 0, tokens: {} };

    // TOKEN CAPTURE: Natively intercepts JWTs and Session Tokens
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session')) {
            window._telemetry.tokens[key] = value.substring(0, 50) + '...[REDACTED]'; 
        }
        origSetItem.apply(this, arguments);
    };

    const origError = console.error;
    console.error = function(...args) {
        window._telemetry.consoleErrors++;
        origError.apply(console, args);
    };

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                    if (entry.name.includes('/api/') || entry.name.includes('/rest/')) {
                        // Note: PerformanceResourceTiming doesn't give us status code or method natively,
                        // so we rely on the fetch override below for comprehensive details.
                        // We use the observer mostly as a fallback for latency if fetch intercept misses it.
                        let size = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
                        window.interceptedAPIs.push({
                            endpoint: entry.name,
                            method: 'UNKNOWN',
                            status_code: 0,
                            payload_size: size,
                            latency: entry.duration
                        });
                    }
                    if (entry.duration > 1000) window._telemetry.slowApis++;
                }
            }
        });
        observer.observe({ entryTypes: ['resource'] });
    } catch(e) {}

    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0] instanceof Request ? args[0].url : args[0];
        const method = (args[0] instanceof Request ? args[0].method : (args[1] && args[1].method)) || 'GET';
        const startTime = performance.now();
        
        try {
            const res = await origFetch.apply(window, args);
            const latency = performance.now() - startTime;
            
            if (url.includes('/api/') || url.includes('/rest/')) {
                // To get the payload size without consuming the body, we try to read Content-Length
                const contentLength = res.headers.get('content-length');
                const size = contentLength ? parseInt(contentLength, 10) : 0;
                
                window.interceptedAPIs.push({
                    endpoint: url,
                    method: method.toUpperCase(),
                    status_code: res.status,
                    payload_size: size,
                    latency: latency
                });
            }
            
            if (!res.ok) window._telemetry.networkFailures++;
            return res;
        } catch(e) {
            window._telemetry.networkFailures++;
            throw e;
        }
    };

    setInterval(() => {
        if (document.head) {
            let scriptObj = document.getElementById('agent-telemetry-data');
            if (!scriptObj) {
                scriptObj = document.createElement('script');
                scriptObj.id = 'agent-telemetry-data';
                scriptObj.type = 'application/json';
                document.head.appendChild(scriptObj);
            }
            
            let t = window.performance.timing;
            let loadTime = t.loadEventEnd > 0 ? (t.loadEventEnd - t.navigationStart) : 0;
            let domReady = t.domContentLoadedEventEnd > 0 ? (t.domContentLoadedEventEnd - t.navigationStart) : 0;
            
            // Deduplicate intercepted APIs by endpoint and method
            const uniqueApis = [];
            const seen = new Set();
            for (const api of window.interceptedAPIs) {
                const key = api.endpoint + '|' + api.method;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueApis.push(api);
                }
            }
            
            scriptObj.text = JSON.stringify({
                apis: uniqueApis,
                final_url: window.location.href,
                telemetry: {
                    consoleErrors: window._telemetry.consoleErrors,
                    networkFailures: window._telemetry.networkFailures,
                    slowApis: window._telemetry.slowApis,
                    loadTimeMs: loadTime,
                    domReadyTimeMs: domReady,
                    capturedTokens: window._telemetry.tokens
                }
            });
        }
    }, 500); 
})();
"""

class FetchResult:
    def __init__(self, success=False, html="", is_http_auth=False, auth_type="NONE", status_code=0, final_url=""):
        self.success = success
        self.html = html
        self.is_http_auth = is_http_auth
        self.auth_type = auth_type
        self.status_code = status_code
        self.final_url = final_url

class AgentCrawler:
    def __init__(self):
        self.browser_config = BrowserConfig(headless=False, verbose=True, text_mode=True)
        self.crawler = None

    async def __aenter__(self):
        self.crawler = AsyncWebCrawler(config=self.browser_config)
        await self.crawler.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.crawler: await self.crawler.close()

    async def check_http_auth(self, url: str):
        """Fallback to deterministically check WWW-Authenticate headers."""
        try:
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 401:
                        auth_header = response.headers.get('WWW-Authenticate', '').lower()
                        if 'basic' in auth_header: return "HTTP_BASIC"
                        if 'digest' in auth_header: return "HTTP_DIGEST"
                        return "UNKNOWN_HTTP_AUTH"
        except Exception:
            pass
        return "NONE"

    async def trace_redirects(self, url: str):
        """Pre-flight check to trace redirect chains, especially for external SSO hops."""
        chain = []
        try:
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(url, allow_redirects=True, timeout=10) as response:
                    for resp in response.history:
                        chain.append({
                            "url": str(resp.url),
                            "status": resp.status
                        })
                    chain.append({
                        "url": str(response.url),
                        "status": response.status
                    })
        except Exception:
            pass
        return chain

    async def fetch_page(self, url: str, strategy=None, session_id=None, custom_js=None):
        if not self.crawler: raise RuntimeError("Crawler not started.")
        
        combined_js = API_INTERCEPTOR_JS
        if custom_js: combined_js += f"\n{custom_js}"

        config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            delay_before_return_html=3.0, 
            magic=True,
            page_timeout=300000, 
            wait_for="js:() => document.readyState === 'complete'", 
            js_code=combined_js,
            session_id=session_id 
        )
        if strategy: config.extraction_strategy = strategy
        
        try:
            res = await self.crawler.arun(url=url, config=config)
            
            # 1. Native status code check
            if hasattr(res, 'status_code') and res.status_code == 401:
                auth_type = await self.check_http_auth(url)
                return FetchResult(success=False, html="", is_http_auth=True, auth_type=auth_type, status_code=401)
                
            # 2. Catch trapped Playwright errors inside the result object
            if not res.success and hasattr(res, 'error_message') and res.error_message:
                err_str = res.error_message
                if "ERR_INVALID_AUTH_CREDENTIALS" in err_str or "401" in err_str:
                    auth_type = await self.check_http_auth(url)
                    if auth_type != "NONE":
                        return FetchResult(success=False, html="", is_http_auth=True, auth_type=auth_type, status_code=401)
            
            return FetchResult(success=res.success, html=res.html, final_url=getattr(res, 'url', url))
            
        except Exception as e:
            error_str = str(e)
            
            # 3. Standard Exception Catch (just in case it throws directly)
            if "ERR_INVALID_AUTH_CREDENTIALS" in error_str or "401" in error_str:
                auth_type = await self.check_http_auth(url)
                if auth_type != "NONE":
                    return FetchResult(success=False, html="", is_http_auth=True, auth_type=auth_type, status_code=401)

            print(f"[CRAWLER ERROR] Failed to load {url}: {e}")
            return FetchResult(success=False, html="")