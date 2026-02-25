import asyncio
import collections
import json
import time
import hashlib
import os
from datetime import datetime
from urllib.parse import urlparse, urljoin
from lxml import html

from src.core.crawler import AgentCrawler
from src.core.schema_learner import get_classification_strategy
from src.core.fingerprint import get_structure_hash
from src.database.neo4j_manager import StorageManager
from src.core.config import AUTH_CONFIG, SAFE_INTERACTION_JS, SAFE_FUZZING_PAYLOADS

APP_ID = "juice_shop" 
SESSION_ID = datetime.now().strftime("run_%Y_%m_%d_%H%M%S")
IGNORED_EXTENSIONS = ('.zip', '.exe', '.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.xml', '.json', '.md', '.txt', '.csv')
IGNORED_PATHS = ('/ftp', '/assets', '/static', '/images', '/img', '/videos')

# --- HARD PRODUCTION LIMITS ---
MAX_DEPTH = 3
MAX_STATES_PER_URL = 5
MAX_STATES_GLOBAL = 200
MAX_FUZZ_PER_PAGE = 3
MAX_SCAN_TIME = 900

CONCURRENT_WORKERS = 5 

def log_event(event_type, **kwargs):
    log_entry = {
         "timestamp": datetime.utcnow().isoformat() + "Z",
         "run_id": SESSION_ID,
         "agent": "cartographer",
         "event": event_type,
    }
    log_entry.update(kwargs)
    print(json.dumps(log_entry)) 

def get_spa_clean_url(url):
    parsed = urlparse(url)
    clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    if parsed.query: clean += f"?{parsed.query}"
    if parsed.fragment and parsed.fragment.startswith('/'): clean += f"#{parsed.fragment}"
    return clean.rstrip('/')

def get_path_only(url):
    parsed = urlparse(url)
    return parsed.path + ("#" + parsed.fragment if parsed.fragment else "")

def generate_css_selector(element):
    path = []
    for node in element.iterancestors():
        if node.tag == 'html': break
        if node.get('id'):
            path.append(f"#{node.get('id')}")
            break
        siblings = [s for s in node.itersiblings(preceding=True) if s.tag == node.tag]
        if siblings: path.append(f"{node.tag}:nth-of-type({len(siblings) + 1})")
        else: path.append(node.tag)
    return " > ".join(reversed(path))

def extract_links_with_selectors(html_content, base_url):
    links = []
    try:
        tree = html.fromstring(html_content)
        
        # UPGRADED: Catches React, Angular, Vue routing attributes, and generic data-hrefs
        all_elements = tree.xpath('//a[@href] | //*[@routerLink] | //*[@ng-reflect-router-link] | //*[@data-href] | //*[@ng-href]')

        parsed_base = urlparse(base_url)
        is_spa_hash_routed = "/#" in base_url
        
        # --- NEW: Safe Exploration Control ---
        unsafe_keywords = ['logout', 'signout', 'delete', 'destroy', 'remove']

        for element in all_elements:
            href = element.get('href') or element.get('routerLink') or element.get('ng-reflect-router-link') or element.get('data-href') or element.get('ng-href')
            if not href: continue
            
            href = href.strip()
            
            # SAFE EXPLORATION: Block destructive routes
            if any(k in href.lower() for k in unsafe_keywords): continue
            
            if href.lower().startswith(('mailto:', 'tel:', 'javascript:', 'whatsapp:')): continue
            if "redirect" in href.lower() and ("http" in href.lower() or "to=" in href.lower()): continue
            
            parsed_href = urlparse(href)
            if parsed_href.path.lower().endswith(IGNORED_EXTENSIONS): continue
            if any(parsed_href.path.lower().startswith(p) for p in IGNORED_PATHS): continue

            # --- THE SPA ROUTING FIX ---
            if not href.startswith('http'):
                if is_spa_hash_routed:
                    # If it's a relative link in a hash-routed app, force it behind the hash
                    clean_path = href.lstrip('/')
                    if clean_path.startswith('#'):
                        href = f"{parsed_base.scheme}://{parsed_base.netloc}/{clean_path}"
                    else:
                        href = f"{parsed_base.scheme}://{parsed_base.netloc}/#/{clean_path}"
                else:
                    # Standard URL joining for normal websites
                    href = urljoin(base_url, href)

            selector = generate_css_selector(element)
            text = element.text_content().strip().lower()
            
            # Action Prioritization Heuristic
            priority_score = 10
            if any(k in href.lower() or k in text or k in selector.lower() for k in ['nav', 'menu', 'header', 'sidebar']):
                priority_score = 0
            elif any(k in text or k in selector.lower() for k in ['next', 'submit', 'continue', 'tab']):
                priority_score = 2
            elif 'footer' in selector.lower() or 'bottom' in selector.lower():
                priority_score = 20
                
            links.append({'href': href, 'selector': selector, 'priority': priority_score})
    except Exception: pass
    return links

def is_safe_url(target_url, start_domain):
    try:
        target_netloc = urlparse(target_url).netloc
        if not target_netloc: return True
        return target_netloc == start_domain or target_netloc.endswith("." + start_domain)
    except: return False

def extract_dom_and_telemetry(html_content):
    intelligence = {
        "forms": 0, "inputs": [], "buttons": [], "api_calls": [], "telemetry": {},
        "has_password_field": False, "has_file_upload": False, "has_oauth_links": False,
        "interactions": [], "composition_vector": {} 
    }
    try:
        tree = html.fromstring(html_content)
        
        all_inputs = tree.xpath('//input[not(@type="hidden")] | //textarea | //select | //*[@contenteditable="true"] | //*[@role="textbox"] | //*[@role="combobox"] | //*[@role="searchbox"]')
        all_buttons = tree.xpath('//button | //input[@type="submit"] | //input[@type="button"] | //*[@role="button"] | //a[contains(@class, "btn") or contains(@class, "button")]')
        all_links = tree.xpath('//a[@href] | //*[@routerLink] | //*[@href]')
        
        intelligence["composition_vector"] = {
            "dom_nodes": len(tree.xpath('//*')),
            "total_inputs": len(all_inputs),
            "required_inputs": len(tree.xpath('//*[@required] | //*[@aria-required="true"]')),
            "total_buttons": len(all_buttons),
            "total_links": len(all_links),
            "tables": len(tree.xpath('//table | //*[@role="grid"] | //*[@role="table"]')),
            "table_rows": len(tree.xpath('//tr | //*[@role="row"]')),
            "forms": len(tree.xpath('//form | //*[@role="form"]')),
            "modals_or_dialogs": len(tree.xpath('//*[contains(@class, "modal") or contains(@role, "dialog")]')),
            "charts_or_svgs": len(tree.xpath('//canvas | //svg[not(ancestor::button) and not(ancestor::a) and not(ancestor::*[@role="button"])]')),
            "tabs": len(tree.xpath('//*[@role="tab"]')),
            "toggles_switches": len(tree.xpath('//*[@role="switch"] | //input[@type="checkbox" and contains(@class, "toggle")]')),
            "accordions_expandables": len(tree.xpath('//details | //*[@aria-expanded] | //*[@data-toggle]')),
            "menus_listboxes": len(tree.xpath('//*[@role="menu"] | //*[@role="listbox"] | //*[@role="tree"]')),
            "sliders_ranges": len(tree.xpath('//input[@type="range"] | //*[@role="slider"]')),
            "media_iframes": len(tree.xpath('//video | //audio | //iframe'))
        }

        for noise in tree.xpath('//footer'):
            noise.getparent().remove(noise)

        for inp in all_inputs:
            if inp.get('type') == 'hidden': continue
            
            inp_type = inp.get('type') or inp.get('role') or ('contenteditable' if inp.get('contenteditable') == 'true' else inp.tag)
            inp_type = inp_type.lower()
            
            if inp_type == 'password': intelligence["has_password_field"] = True
            if inp_type == 'file': intelligence["has_file_upload"] = True
            
            is_required = bool(inp.get('required') is not None or inp.get('aria-required') == 'true')
            intelligence["inputs"].append({"tag": inp.tag, "id": inp.get('id', ''), "type": inp_type, "required": is_required})
            intelligence["interactions"].append(f"input_field:{inp_type}")
            
        destructive_count = 0
        financial_count = 0
        oauth_keywords = ['google', 'github', 'microsoft', 'okta', 'sso', 'saml', 'azure']
        
        for element in all_links:
            text = element.text_content().lower()
            href = element.get('href', '').lower()
            if any(k in text or k in href for k in oauth_keywords) and ('sign in' in text or 'log in' in text or 'continue with' in text):
                intelligence["has_oauth_links"] = True

        for btn in all_buttons:
            text = btn.text_content().strip() if btn.tag != 'input' else btn.get('value', '')
            btn_id = btn.get('id', '')
            
            combined_txt = f"{text} {btn_id} {btn.get('aria-label', '')}".lower()
            
            # --- NEW: Safe Exploration Control ---
            # Do NOT even record destructive actions to prevent accidental triggers later by heuristics
            if any(w in combined_txt for w in ['delete', 'remove', 'clear', 'destroy', 'erase']): 
                destructive_count += 1
                continue 
                
            if any(w in combined_txt for w in ['pay', 'checkout', 'buy', 'cart', 'card', 'billing']): financial_count += 1
            
            if not text and not btn_id and not btn.get('aria-label'): continue
            
            btn_type = btn.get('type') or btn.get('role') or 'button'
            intelligence["buttons"].append({"id": btn_id, "text": ' '.join(text.split())[:30], "type": btn_type.lower()})
            label = btn.get('id') or btn.get('aria-label') or text[:20]
            intelligence["interactions"].append(f"button_click:{label}")

        actual_forms = intelligence["composition_vector"]["forms"]
        if actual_forms > 0: 
            intelligence["forms"] = actual_forms
            intelligence["interactions"].append("form_submit")
        elif len(intelligence["inputs"]) >= 1 and len(intelligence["buttons"]) >= 1: 
            intelligence["forms"] = 1 
            intelligence["interactions"].append("virtual_form_submit")

        form_complexity = intelligence["composition_vector"]["required_inputs"] + (actual_forms * 2)
        interaction_density = intelligence["composition_vector"]["total_inputs"] + intelligence["composition_vector"]["total_buttons"]
        
        risk_score = 0
        if intelligence["has_password_field"]: risk_score += 5
        if intelligence["has_file_upload"]: risk_score += 3
        risk_score += (destructive_count * 4)
        risk_score += (financial_count * 3)
        risk_score += (form_complexity * 2)

        intelligence["composition_vector"]["destructive_actions"] = destructive_count
        intelligence["composition_vector"]["financial_actions"] = financial_count
        intelligence["composition_vector"]["form_complexity"] = form_complexity
        intelligence["composition_vector"]["interaction_density"] = interaction_density
        intelligence["composition_vector"]["risk_score"] = risk_score

        api_scripts = tree.xpath('//script[@id="agent-telemetry-data"]')
        if api_scripts:
            try:
                data = json.loads(api_scripts[0].text_content())
                # Ensure we store the entire object (endpoint, method, payload_size, latency)
                intelligence["api_calls"] = data.get("apis", [])
                intelligence["telemetry"] = data.get("telemetry", {})
                if "final_url" in data:
                    intelligence["final_url"] = data["final_url"]
            except Exception: pass

    except Exception: pass
    return intelligence

def behavioral_classify(url, dom_data):
    vec = dom_data.get("composition_vector", {})
    url_lower = url.lower()
    
    if dom_data.get("has_password_field") or dom_data.get("has_oauth_links"): intent = "AUTHENTICATION"
    elif vec.get("financial_actions", 0) > 0 or any(x in url_lower for x in ['cart', 'checkout', 'pay', 'billing']): intent = "TRANSACTIONAL"
    elif vec.get("destructive_actions", 0) > 0: intent = "ADMIN_OR_CRITICAL"
    elif vec.get("toggles_switches", 0) > 2 or any(x in url_lower for x in ['settings', 'preferences']): intent = "ACCOUNT_MANAGEMENT"
    elif vec.get("media_iframes", 0) > 0: intent = "MEDIA_CONSUMPTION" 
    elif vec.get("form_complexity", 0) > 3 or any(x in url_lower for x in ['register', 'signup']): intent = "DATA_ENTRY"
    elif any(x in url_lower for x in ['search', 'query', 'filter']): intent = "SEARCH_DISCOVERY"
    elif any(x in url_lower for x in ['help', 'faq', 'docs', 'support', 'contact']): intent = "SUPPORT_ROUTING"
    elif vec.get("charts_or_svgs", 0) > 2: intent = "ANALYTICS_DASHBOARD"
    else: intent = "INFO_RETRIEVAL"

    page_type = "GENERIC_STATE"
    confidence = 0.50
    reason = "Lacks strong structural signatures."
    auth_type = "NONE"

    if "login" in url_lower or (dom_data.get("has_password_field") and "register" not in url_lower):
        page_type, confidence, reason = "LOGIN", 0.98, "Explicit Authentication Route or Credential Input Detected."
        auth_type = "OAUTH" if dom_data.get("has_oauth_links") else "FORM"
    elif "register" in url_lower or (dom_data.get("has_password_field") and vec.get("total_inputs", 0) > 3):
         page_type, confidence, reason = "REGISTER", 0.95, "Signup Route Detected."
    elif vec.get("tables", 0) > 0 and vec.get("table_rows", 0) > 5:
        page_type, confidence, reason = "REPORT_OR_GRID", 0.90, f"High data density: {vec['tables']} tables, {vec['table_rows']} rows."
    elif vec.get("charts_or_svgs", 0) > 2 and vec.get("total_inputs", 0) < 3:
        page_type, confidence, reason = "DASHBOARD", 0.85, f"Data visualization detected: {vec['charts_or_svgs']} charts/SVGs."
    elif vec.get("forms", 0) > 0 and vec.get("total_inputs", 0) > 4:
        page_type, confidence, reason = "COMPLEX_FORM", 0.88, f"High input surface: {vec['total_inputs']} inputs."
    elif intent == "TRANSACTIONAL": 
        page_type, confidence, reason = "CHECKOUT", 0.90, "E-commerce transaction routing detected."
    elif vec.get("total_buttons", 0) > 5 and vec.get("total_inputs", 0) < 3:
        page_type, confidence, reason = "PRODUCT_OR_LISTING", 0.80, "High density of actionable elements indicative of a catalog."
    elif vec.get("total_inputs", 0) == 0 and vec.get("total_buttons", 0) <= 1:
        page_type, confidence, reason = "STATIC", 0.95, "Minimal interaction surface."

    return page_type, confidence, reason, intent, auth_type

def get_deterministic_auth_js(user, pwd):
    return f"""
    (async function() {{
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dismissWords = ['dismiss', 'accept', 'agree', 'got it', 'close', 'me want it'];
        document.querySelectorAll('button, a, [role="button"], .mat-button-wrapper, span').forEach(el => {{
            const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
            if (dismissWords.some(w => text.includes(w))) {{ try {{ el.click(); }} catch(e) {{}} }}
        }});
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const passField = document.querySelector('input[type="password"]');
        if (!passField) return;
        
        let userField = null;
        const form = passField.closest('form');
        if (form) {{
            userField = form.querySelector('input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"], input[id*="user"], input[id*="email"], input[type="text"]:not([type="hidden"])');
        }}
        if (!userField) {{
            const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
            const pIdx = allInputs.indexOf(passField);
            if (pIdx > 0) userField = allInputs[pIdx - 1];
        }}
        
        let btn = null;
        if (form) {{
            btn = form.querySelector('button[type="submit"], input[type="submit"]');
            if (!btn) {{
                const btns = Array.from(form.querySelectorAll('button'));
                btn = btns.find(b => /login|sign in|submit/i.test(b.innerText || '')) || btns[0];
            }}
        }} else {{
            btn = document.querySelector('button[type="submit"]') || document.querySelector('button');
        }}
        
        if (userField && passField && btn) {{
            console.log("[AGENT 1] Deterministic Auth Reflex Triggered.");
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            
            nativeInputValueSetter.call(userField, "{user}");
            userField.dispatchEvent(new Event('input', {{ bubbles: true }}));
            userField.dispatchEvent(new Event('change', {{ bubbles: true }}));
            userField.dispatchEvent(new Event('blur', {{ bubbles: true }}));
            
            nativeInputValueSetter.call(passField, "{pwd}");
            passField.dispatchEvent(new Event('input', {{ bubbles: true }}));
            passField.dispatchEvent(new Event('change', {{ bubbles: true }}));
            passField.dispatchEvent(new Event('blur', {{ bubbles: true }}));
            
            await new Promise(resolve => setTimeout(resolve, 500)); 
            btn.disabled = false;
            btn.click();
            await new Promise(resolve => setTimeout(resolve, 3500)); 
        }}
    }})();
    """

def get_safe_fuzzing_js(payloads):
    """
    V6.0 FORM FUZZING: Safely injects test data into generic inputs 
    and attempts to trigger frontend validation/routing without destructive sumbits.
    """
    return f"""
    (async function() {{
        const payloads = {json.dumps(payloads)};
        let interacted = false;
        
        document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {{
            const type = (el.getAttribute('type') || 'text').toLowerCase();
            const id = (el.getAttribute('id') || '').toLowerCase();
            const name = (el.getAttribute('name') || '').toLowerCase();
            const pClass = (el.getAttribute('class') || '').toLowerCase();
            
            let val = payloads.text;
            if (type === 'email' || id.includes('email') || name.includes('email')) val = payloads.email;
            else if (type === 'password' || id.includes('pass') || name.includes('pass')) val = payloads.password;
            else if (type === 'number' || type === 'tel') val = payloads.number;
            else if (type === 'search' || id.includes('search') || name.includes('search') || pClass.includes('search') || el.placeholder.toLowerCase().includes('search')) val = payloads.search;
            
            try {{
                // Angular/React specific deep setter
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                
                if (el.tagName === 'INPUT') nativeInputValueSetter.call(el, val);
                else nativeTextAreaValueSetter.call(el, val);
                
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                el.dispatchEvent(new KeyboardEvent('keyup', {{ bubbles: true, key: 'a' }})); 
                el.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                interacted = true;
                
                // Force an enter keypress on the element itself, specifically useful for search bars
                el.dispatchEvent(new KeyboardEvent('keydown', {{ bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }}));
                el.dispatchEvent(new KeyboardEvent('keyup', {{ bubbles: true, key: 'Enter', code: 'Enter', keyCode: 13 }}));

            }} catch(e) {{}}
        }});

        if (interacted) {{
            const safeBtns = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"], mat-icon')).filter(b => {{
                const txt = (b.innerText || !!b.getAttribute('aria-label') || '').toLowerCase();
                return txt.includes('search') || txt.includes('next') || txt.includes('continue') || b.closest('form') || b.textContent.includes('search');
            }});
            
            if (safeBtns.length > 0 && !safeBtns[0].innerText.toLowerCase().includes('delete') && !safeBtns[0].innerText.toLowerCase().includes('pay')) {{
                safeBtns[0].click();
            }}
            await new Promise(resolve => setTimeout(resolve, 2000));
        }}
    }})();
    """

async def worker(worker_id, queue, crawler, storage, strategy, visited_states, queued_urls, start_domain, template_counter, global_state, auth_lock):
    log_event("worker_start", worker_id=worker_id)
    worker_session_id = f"shared_auth_{SESSION_ID}"

    cfg_creds = AUTH_CONFIG.get("credentials", {})
    target_user = os.getenv("CRAWL_USER") or cfg_creds.get("username")
    target_pass = os.getenv("CRAWL_PASS") or cfg_creds.get("password")
    has_credentials = bool(target_user and target_pass)

    while True:
        priority, payload = await queue.get()
        current_url, depth, previous_state_id, inbound_selector, workflow_chain = payload
        
        try:
            # All processing logic for a single queue item goes here.
            # queue.task_done() will be called exactly once in the outer finally block.

            if depth > MAX_DEPTH: 
                # No queue.task_done() here, it will be handled by the outer finally
                continue

            clean_url = get_spa_clean_url(current_url)
            current_path = get_path_only(clean_url) or "root"
            new_workflow_chain = f"{workflow_chain} -> {current_path}" if workflow_chain else current_path

            start_time = time.time()
            current_auth_context = "AUTHENTICATED" if global_state["is_authenticated"] else "PUBLIC"

            # --- REDIRECT & OAUTH TRACING ---
            async with auth_lock:
                redirect_chain = await crawler.trace_redirects(clean_url)
            
            if len(redirect_chain) > 1:
                final_url = redirect_chain[-1]['url']
                final_domain = urlparse(final_url).netloc
                
                if final_domain != start_domain or any(urlparse(hop['url']).netloc != start_domain for hop in redirect_chain):
                    log_event("sso_redirect_detected", url=clean_url, hops=len(redirect_chain))
                    storage.save_redirect_chain(clean_url, redirect_chain, APP_ID, SESSION_ID)
                    
                    if final_domain != start_domain:
                        log_event("external_provider_blocked", url=clean_url, provider=final_domain)
                        # No queue.task_done() here
                        continue
                    else:
                        clean_url = get_spa_clean_url(final_url)

            # PRE-FETCH DEDUPLICATION
            page_visit_key = f"{clean_url}_{current_auth_context}"
            if page_visit_key in global_state["visited_pages"]:
                log_event("crawl_skip_already_visited", url=clean_url)
                # No queue.task_done() here
                continue
            global_state["visited_pages"].add(page_visit_key)

            # Proceed to standard Playwright fetch (PASS 1)
            async with auth_lock:
                result = await crawler.fetch_page(clean_url, strategy=strategy, session_id=worker_session_id)
            
            if not result.success and not getattr(result, 'is_http_auth', False):
                global_state["metrics"]["total_fetch_failures"] += 1
                # No queue.task_done() here
                continue
            
            raw_intel = extract_dom_and_telemetry(result.html)
            py_load_time = round(time.time() - start_time, 2)
            log_event("crawl_stage", stage="fetch", worker_id=worker_id, url=clean_url, depth=depth, auth_context=current_auth_context, duration_ms=int((time.time() - start_time) * 1000), status="success" if result.success else "failed", http_status=getattr(result, 'status_code', 0), console_errors=raw_intel.get("telemetry", {}).get("consoleErrors", 0), network_failures=raw_intel.get("telemetry", {}).get("networkFailures", 0))
            
            # --- DETERMINISTIC HTTP AUTH BOUNDARY INTERCEPTION ---
            if getattr(result, 'is_http_auth', False):
                log_event("http_auth_boundary", url=clean_url, auth_type=result.auth_type, state_type="auth_transition_state")
                
                state_id = f"{APP_ID}::STATE::{hashlib.md5((clean_url + current_auth_context).encode()).hexdigest()}"
                template_hash = hashlib.md5(f"HTTP_AUTH_GATE_{result.auth_type}".encode()).hexdigest()
                template_id = f"{APP_ID}::TEMPLATE::{template_hash}"
                
                telemetry = {"crawler_load_time": py_load_time, "success": False, "status_code": 401}
                ai_intel = {
                    "confidence": 1.0, 
                    "classification_reason": "Deterministic WWW-Authenticate Header Interception", 
                    "intent": "AUTHENTICATION", 
                    "composition_vector": {"risk_score": 5, "form_complexity": 0, "interaction_density": 0}
                }
                
                storage.save_digital_twin(
                    state_id, template_id, clean_url, "LOGIN", APP_ID, SESSION_ID, 
                    dom_data=None, telemetry=telemetry, ai_intel=ai_intel, 
                    auth_context=current_auth_context, depth=depth, 
                    workflow_path=new_workflow_chain, is_auth_gate=True, auth_type=result.auth_type
                )
                
                if previous_state_id != "ROOT" and previous_state_id != state_id:
                    storage.save_navigation(previous_state_id, state_id, "NAVIGATE", inbound_selector, APP_ID, SESSION_ID)
                    log_event("edge_created", source=previous_state_id, target=state_id, trigger=inbound_selector, relation="NAVIGATE")
                    global_state["metrics"]["total_edges"] += 1
                
                visited_states.add(state_id)
                # No queue.task_done() here
                continue
            
            if not result.success:
                # No queue.task_done() here
                continue

            # raw_intel = extract_dom_and_telemetry(result.html) # Moved up
            page_type, confidence, reason, intent, auth_type = behavioral_classify(clean_url, raw_intel)
            
            is_auth_gate = False
            public_state_id = f"{APP_ID}::STATE::{hashlib.md5((clean_url + 'PUBLIC').encode()).hexdigest()}"
            
            if page_type == "LOGIN":
                is_auth_gate = True
                
                if auth_type == "OAUTH":
                    log_event("oauth_boundary", url=clean_url)
                
                elif auth_type == "FORM":
                    if has_credentials and not global_state["is_authenticated"]:
                        log_event("auth_attempt", url=clean_url, strategy="deterministic_form_injection")
                        auth_js = get_deterministic_auth_js(target_user, target_pass)
                        
                        async with auth_lock:
                            auth_result = await crawler.fetch_page(clean_url, strategy=strategy, session_id=worker_session_id, custom_js=auth_js)
                        
                        auth_intel = extract_dom_and_telemetry(auth_result.html) 
                        captured_tokens = auth_intel.get("telemetry", {}).get("capturedTokens", {})
                        dom_changed = not auth_intel.get("has_password_field")
                        
                        if captured_tokens or dom_changed:
                            log_event("auth_success", url=clean_url, context_switched=True, state_type="auth_transition_state")
                            global_state["is_authenticated"] = True 
                            current_auth_context = "AUTHENTICATED"
                            
                            # --- CREATE PUBLIC LAYER NODE BEFORE TRANSITION ---
                            template_hash, dom_metadata = get_structure_hash(clean_url, result.html)
                            template_id = f"{APP_ID}::TEMPLATE::{template_hash}"
                            ai_intel = {
                                "confidence": confidence, "classification_reason": reason, "intent": intent, 
                                "interactions": list(set(raw_intel.get("interactions", []))), "composition_vector": raw_intel.get("composition_vector", {})
                            }
                            storage.save_digital_twin(public_state_id, template_id, clean_url, page_type, APP_ID, SESSION_ID, raw_intel, {"crawler_load_time": py_load_time}, ai_intel, auth_context="PUBLIC", depth=depth, workflow_path=new_workflow_chain, is_auth_gate=True, auth_type=auth_type)
                            if previous_state_id != "ROOT" and previous_state_id != public_state_id:
                                storage.save_navigation(previous_state_id, public_state_id, "NAVIGATE", inbound_selector, APP_ID, SESSION_ID)
                                log_event("edge_created", source=previous_state_id, target=public_state_id, trigger=inbound_selector, relation="NAVIGATE")
                                global_state["metrics"]["total_edges"] += 1
                            visited_states.add(public_state_id)
                            global_state["states_discovered"] += 1
                                
                            result = auth_result
                            raw_intel = auth_intel
                            page_type, confidence, reason, intent, auth_type = behavioral_classify(clean_url, raw_intel)
                            
                            root_url = get_spa_clean_url(f"{urlparse(clean_url).scheme}://{urlparse(clean_url).netloc}")
                            
                            # Queue ROOT post-auth and force the AUTH_TRANSITION edge inside the queue payload or logic
                            # We'll explicitly map an AUTH_TRANSITION edge instead of standard CLICK
                            auth_root_id = f"{APP_ID}::STATE::{hashlib.md5((root_url + 'AUTHENTICATED').encode()).hexdigest()}"
                            storage.save_navigation(public_state_id, auth_root_id, "AUTH_TRANSITION", "login_submit", APP_ID, SESSION_ID)
                            log_event("edge_created", source=public_state_id, target=auth_root_id, trigger="login_submit", relation="AUTH_TRANSITION")
                            global_state["metrics"]["total_auth_transitions"] += 1
                            global_state["metrics"]["total_edges"] += 1
                            
                            await queue.put((0, (root_url, depth + 1, public_state_id, "AUTH_REDIRECT", new_workflow_chain)))
                        else:
                            log_event("auth_failure", url=clean_url)
                    elif not has_credentials:
                        log_event("auth_bypassed_no_creds", url=clean_url)

            route_signature = urlparse(clean_url).path
            template_hash, dom_metadata = get_structure_hash(clean_url, result.html)
            # LEVEL 1 & 2 DEDUP: Route + Layout Hash + Context handles minor text/fuzz variability
            state_key = hashlib.md5((route_signature + template_hash + current_auth_context).encode()).hexdigest()
            state_id = f"{APP_ID}::STATE::{state_key}"
            template_id = f"{APP_ID}::TEMPLATE::{template_hash}"

            if template_counter[clean_url] > MAX_STATES_PER_URL:
                storage.log_trap(clean_url, template_hash, APP_ID, SESSION_ID)
                # No queue.task_done() here
                continue
            template_counter[clean_url] += 1

            telemetry = raw_intel.pop("telemetry", {})
            telemetry["crawler_load_time"] = py_load_time
            telemetry["success"] = result.success
            telemetry["page_metrics"] = {
                "dom_nodes": raw_intel.get("composition_vector", {}).get("dom_nodes", 0),
                "interactive_elements": raw_intel.get("composition_vector", {}).get("total_inputs", 0) + raw_intel.get("composition_vector", {}).get("total_buttons", 0) + raw_intel.get("composition_vector", {}).get("total_links", 0),
                "forms": raw_intel.get("composition_vector", {}).get("forms", 0),
                "console_errors": telemetry.get("consoleErrors", 0),
                "network_failures": telemetry.get("networkFailures", 0),
                "slow_apis": telemetry.get("slowApis", 0)
            }

            ai_intel = {
                "confidence": confidence,
                "classification_reason": reason,
                "intent": intent, 
                "interactions": list(set(raw_intel.get("interactions", []))),
                "composition_vector": raw_intel.get("composition_vector", {}) 
            }
            
            # --- GLOBAL STATE DEDUPLICATION WITH HASH COLLISION SAFETY ---
            is_duplicate = False
            if template_hash in global_state["state_registry"]:
                existing_entry = global_state["state_registry"][template_hash]
                existing_state_id = existing_entry["id"]
                dom_diff = abs(len(result.html) - existing_entry["dom_length"])
                
                if dom_diff > 5000:
                    log_event("hash_collision_warning", url=clean_url, state_hash=template_hash, diff_bytes=dom_diff)
                    
                log_event("duplicate_state_prevented", url=clean_url, state_hash=template_hash, existing_node=existing_state_id)
                global_state["metrics"]["total_duplicates_prevented"] += 1
                state_id = existing_state_id # Re-route to existing node
                is_duplicate = True
            else:
                global_state["state_registry"][template_hash] = {"id": state_id, "dom_length": len(result.html)}
                global_state["states_discovered"] += 1
                visited_states.add(state_id)
                log_event("state_created", url=clean_url, state_hash=template_hash, state_type="navigation_state", page_metrics=telemetry["page_metrics"], dom_normalization_metadata=dom_metadata)
                storage.save_digital_twin(state_id, template_id, clean_url, page_type, APP_ID, SESSION_ID, raw_intel, telemetry, ai_intel, auth_context=current_auth_context, depth=depth, workflow_path=new_workflow_chain, is_auth_gate=is_auth_gate, auth_type=auth_type)

            if previous_state_id != "ROOT" and previous_state_id != state_id and previous_state_id != public_state_id:
                # Track user interactions properly as requested. The selector implies the action element.
                storage.save_navigation(previous_state_id, state_id, "PERFORMED", inbound_selector, APP_ID, SESSION_ID)
                log_event("edge_created", source=previous_state_id, target=state_id, trigger=inbound_selector, relation="PERFORMED")
                global_state["metrics"]["total_edges"] += 1

            if is_duplicate:
                # We already processed this State ID earlier in this worker OR another.
                # No queue.task_done() here
                continue

            # --- NEW: TWO-PASS JS INTERACTION DISCOVERY ---
            # If the page has buttons/tabs/expandables, attempt to expand hidden UI states
            vec = ai_intel.get("composition_vector", {})
            has_safe_interactions = vec.get("tabs", 0) > 0 or vec.get("accordions_expandables", 0) > 0 or any(btn.get("type") not in ["submit", "reset"] for btn in raw_intel.get("buttons", []))
            
            if has_safe_interactions and not is_auth_gate:
                budget_rem = MAX_STATES_GLOBAL - global_state["states_discovered"]
                log_event("crawl_phase", url=clean_url, phase="pass_2_ui_interactions", interaction_budget_remaining=budget_rem)
                async with auth_lock:
                    virtual_result = await crawler.fetch_page(clean_url, strategy=strategy, session_id=worker_session_id, custom_js=SAFE_INTERACTION_JS)
                
                if virtual_result.success:
                    virt_intel = extract_dom_and_telemetry(virtual_result.html)
                    virt_url = get_spa_clean_url(virt_intel["final_url"]) if virt_intel.get("final_url") else (get_spa_clean_url(virtual_result.final_url) if virtual_result.final_url else clean_url)
                    virtual_template_hash, virt_dom_metadata = get_structure_hash(virt_url, virtual_result.html)
                    
                    if virtual_template_hash != template_hash:
                        virtual_template_id = f"{APP_ID}::TEMPLATE::{virtual_template_hash}"
                        
                        if virtual_template_hash in global_state["state_registry"]:
                            existing_vstate = global_state["state_registry"][virtual_template_hash]
                            log_event("duplicate_state_prevented", url=virt_url, trigger_type="dom_interaction", state_hash=virtual_template_hash, existing_node=existing_vstate["id"])
                            global_state["metrics"]["total_duplicates_prevented"] += 1
                            virtual_state_id = existing_vstate["id"]
                        else:
                            virtual_state_id = f"{APP_ID}::STATE::{hashlib.md5((virt_url + virtual_template_hash + current_auth_context).encode()).hexdigest()}"
                            global_state["state_registry"][virtual_template_hash] = {"id": virtual_state_id, "dom_length": len(virtual_result.html)}
                            
                            log_event("hidden_state_discovered", url=virt_url, parent_url=clean_url, trigger_type="dom_interaction", state_hash=virtual_template_hash, graph_node_created=True, state_type="interaction_state", dom_normalization_metadata=virt_dom_metadata)
                            
                            virt_page_type, virt_conf, virt_reason, virt_intent, virt_auth = behavioral_classify(virt_url, virt_intel)
                            
                            v_ai = {
                                "confidence": virt_conf, "classification_reason": "Virtual State via JS Interaction",
                                "intent": virt_intent, "interactions": list(set(virt_intel.get("interactions", []))),
                                "composition_vector": virt_intel.get("composition_vector", {})
                            }
                            
                            # Save the virtual state and connect it
                            storage.save_digital_twin(
                                virtual_state_id, virtual_template_id, virt_url, f"VIRTUAL_{virt_page_type}", 
                                APP_ID, SESSION_ID, virt_intel, telemetry, v_ai, 
                                auth_context=current_auth_context, depth=depth, 
                                workflow_path=new_workflow_chain + " -> [UI_EXPANDED]"
                            )
                            global_state["states_discovered"] += 1
                            global_state["metrics"]["total_interaction_states"] += 1
                            visited_states.add(virtual_state_id)
                            
                        storage.save_virtual_interaction(state_id, virtual_state_id, "EXPAND_UI", APP_ID, SESSION_ID)
                        log_event("edge_created", source=state_id, target=virtual_state_id, trigger="EXPAND_UI", relation="VIRTUAL_EXPAND")
                        global_state["metrics"]["total_edges"] += 1
                        
                        # Extract links from the newly revealed virtual state
                        virt_links = extract_links_with_selectors(virtual_result.html, virt_url)
                        for link in virt_links:
                            t_url = get_spa_clean_url(link['href'])
                            if not is_safe_url(t_url, start_domain) or t_url in queued_urls: continue
                            queued_urls.add(t_url)
                            await queue.put(((depth + 1) * 100 + link.get('priority', 10), (t_url, depth + 1, virtual_state_id, link['selector'], new_workflow_chain + " -> [UI_EXPANDED]")))
            # --- END TWO-PASS DISCOVERY ---
            
            # --- NEW V6.0: THREE-PASS FORM FUZZING ---
            interactions = ai_intel.get("interactions", [])
            has_text_inputs = vec.get("total_inputs", 0) > 0 and len(raw_intel.get("inputs", [])) > 0
            
            if has_text_inputs and not is_auth_gate and global_state.get("fuzz_counter", collections.Counter())[clean_url] < MAX_FUZZ_PER_PAGE:
                attempts = global_state.setdefault("fuzz_counter", collections.Counter())[clean_url] + 1
                log_event("crawl_phase", url=clean_url, phase="pass_3_form_fuzzing", fuzz_attempt_index=attempts, fuzz_budget_remaining=MAX_FUZZ_PER_PAGE - attempts)
                fuzz_js = get_safe_fuzzing_js(SAFE_FUZZING_PAYLOADS)
                async with auth_lock:
                    fuzz_result = await crawler.fetch_page(clean_url, strategy=strategy, session_id=worker_session_id, custom_js=fuzz_js)
                
                if fuzz_result.success:
                    fuzz_intel = extract_dom_and_telemetry(fuzz_result.html)
                    fuzz_url = get_spa_clean_url(fuzz_intel["final_url"]) if fuzz_intel.get("final_url") else (get_spa_clean_url(fuzz_result.final_url) if fuzz_result.final_url else clean_url)
                    fuzz_template_hash, fuzz_dom_metadata = get_structure_hash(fuzz_url, fuzz_result.html)
                    fuzz_route = urlparse(fuzz_url).path
                    fuzz_state_key = hashlib.md5((fuzz_route + fuzz_template_hash + current_auth_context).encode()).hexdigest()
                    
                    # STRICT Deduplication for Fuzzing
                    if fuzz_state_key != state_key and fuzz_state_key != locals().get('virtual_state_key', ''):
                        global_state.setdefault("fuzz_counter", collections.Counter())[clean_url] += 1
                        fuzz_template_id = f"{APP_ID}::TEMPLATE::{fuzz_template_hash}"
                        
                        if fuzz_template_hash in global_state["state_registry"]:
                            existing_fuzz_state = global_state["state_registry"][fuzz_template_hash]
                            log_event("duplicate_state_prevented", url=fuzz_url, trigger_type="form_fuzz", state_hash=fuzz_template_hash, existing_node=existing_fuzz_state["id"])
                            global_state["metrics"]["total_duplicates_prevented"] += 1
                            fuzz_state_id = existing_fuzz_state["id"]
                        else:
                            fuzz_state_id = f"{APP_ID}::STATE::{fuzz_state_key}"
                            global_state["state_registry"][fuzz_template_hash] = {"id": fuzz_state_id, "dom_length": len(fuzz_result.html)}
                            log_event("fuzzed_state_discovered", url=fuzz_url, parent_url=clean_url, trigger_type="form_fuzz", state_hash=fuzz_template_hash, graph_node_created=True, state_type="fuzz_state", dom_normalization_metadata=fuzz_dom_metadata)
                            
                            fuzz_page_type, fuzz_conf, fuzz_reason, fuzz_intent, fuzz_auth = behavioral_classify(fuzz_url, fuzz_intel)
                            
                            v_ai = {
                                "confidence": fuzz_conf, "classification_reason": "State Mated via Safe Form Fuzzing",
                                "intent": fuzz_intent, "interactions": list(set(fuzz_intel.get("interactions", []))),
                                "composition_vector": fuzz_intel.get("composition_vector", {})
                            }
                            
                            storage.save_digital_twin(
                                fuzz_state_id, fuzz_template_id, fuzz_url, f"FUZZED_{fuzz_page_type}", 
                                APP_ID, SESSION_ID, fuzz_intel, telemetry, v_ai, 
                                auth_context=current_auth_context, depth=depth, 
                                workflow_path=new_workflow_chain + " -> [FUZZED]"
                            )
                            global_state["states_discovered"] += 1
                            global_state["metrics"]["total_fuzz_states"] += 1
                            visited_states.add(fuzz_state_id)
                        
                        storage.save_virtual_interaction(state_id, fuzz_state_id, "FUZZ_FORM", APP_ID, SESSION_ID)
                        log_event("edge_created", source=state_id, target=fuzz_state_id, trigger="FUZZ_FORM", relation="FUZZED")
                        global_state["metrics"]["total_edges"] += 1
                        
                        fuzz_links = extract_links_with_selectors(fuzz_result.html, fuzz_url)
                        
                        fuzz_queued = 0
                        for link in fuzz_links:
                            if fuzz_queued >= MAX_FUZZ_PER_PAGE: break
                            t_url = get_spa_clean_url(link['href'])
                            if not is_safe_url(t_url, start_domain) or t_url in queued_urls: continue
                            queued_urls.add(t_url)
                            fuzz_queued += 1
                            await queue.put(((depth + 1) * 100 + link.get('priority', 10), (t_url, depth + 1, fuzz_state_id, link['selector'], new_workflow_chain + " -> [FUZZED]")))
            # --- END THREE-PASS DISCOVERY ---

            # Standard Link Extraction (Pass 1)
            annotated_links = extract_links_with_selectors(result.html, clean_url)
            for link in annotated_links:
                target_url = get_spa_clean_url(link['href'])
                if not is_safe_url(target_url, start_domain) or target_url in queued_urls: continue
                queued_urls.add(target_url)
                await queue.put(((depth + 1) * 100 + link.get('priority', 10), (target_url, depth + 1, state_id, link['selector'], new_workflow_chain)))

        except asyncio.CancelledError:
            return
        except Exception as e: 
            print(f"[FATAL ERROR] Worker {worker_id} crashed on {current_url}: {e}")
        finally:
            queue.task_done()

async def run_agent(start_url):
    storage = StorageManager()
    strategy = get_classification_strategy()
    start_domain = urlparse(start_url).netloc
    
    queue = asyncio.PriorityQueue()
    await queue.put((0, (start_url, 0, "ROOT", None, "")))
    queued_urls = {start_url}
    visited_states = set()
    template_counter = collections.Counter()
    
    global_state = {
        "is_authenticated": False, 
        "states_discovered": 0, 
        "start_time": time.time(),
        "state_registry": {},
        "visited_pages": set(),
        "fuzz_counter": collections.Counter(),
        "metrics": {
            "total_edges": 0,
            "total_duplicates_prevented": 0,
            "total_auth_transitions": 0,
            "total_fuzz_states": 0,
            "total_interaction_states": 0,
            "total_fetch_failures": 0
        }
    }
    auth_lock = asyncio.Lock()

    log_event("lifecycle", stage="agent_start", target=start_url)
    
    # --- NEW SCHEMA: Ensure ScanSession node exists ---
    storage.init_scan_session(APP_ID, SESSION_ID)
    
    async def time_watcher():
        while True:
            await asyncio.sleep(10)
            if time.time() - global_state["start_time"] > MAX_SCAN_TIME:
                log_event("lifecycle", stage="hard_limit_reached", reason="MAX_SCAN_TIME", limit=MAX_SCAN_TIME)
                [w.cancel() for w in workers]
                break
            if global_state["states_discovered"] >= MAX_STATES_GLOBAL:
                log_event("lifecycle", stage="hard_limit_reached", reason="MAX_STATES_GLOBAL", limit=MAX_STATES_GLOBAL)
                [w.cancel() for w in workers]
                break

    async with AgentCrawler() as crawler:
        workers = [asyncio.create_task(worker(i, queue, crawler, storage, strategy, visited_states, queued_urls, start_domain, template_counter, global_state, auth_lock)) for i in range(CONCURRENT_WORKERS)]
        
        watcher_task = asyncio.create_task(time_watcher())
        
        try:
            await asyncio.wait([queue.join(), watcher_task], return_when=asyncio.FIRST_COMPLETED)
        except Exception:
            pass
            
        for w in workers: w.cancel()
        watcher_task.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
    
    log_event("lifecycle", stage="agent_shutdown", total_states=global_state["states_discovered"], crawl_strategy_summary=global_state["metrics"])
    print("\n\n>>> AGENT 1 (CARTOGRAPHER) COMPLETE. Neo4j Graph Model Built.")
    storage.close()

if __name__ == "__main__":
    target = "http://localhost:4000/" 
    asyncio.run(run_agent(target))