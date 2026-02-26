import asyncio
import json
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

# ── Windows fix: Playwright needs ProactorEventLoop to spawn subprocesses.
# We can't change uvicorn's loop, so we run the agent in a dedicated thread
# with its own asyncio.run() which sets up the correct loop on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

_thread_pool = ThreadPoolExecutor(max_workers=2)

app = FastAPI(title="NexusQA Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j Connection
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

@app.on_event("shutdown")
def shutdown_db_client():
    driver.close()
    _thread_pool.shutdown(wait=False)


# ──────────────────────────────────────────────────────────────
#  WebSocket Connection Manager
# ──────────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)

manager = ConnectionManager()

# This is the callback that crawler.py will call on every page fetch
async def screenshot_broadcast(url: str, screenshot_b64: str):
    await manager.broadcast({
        "type": "screenshot",
        "url": url,
        "data": screenshot_b64
    })

# Agent 1 running flag to prevent double-starts
_agent_running = False

async def broadcast_log(message: str, level: str = "info"):
    await manager.broadcast({"type": "log", "level": level, "message": message})


# ──────────────────────────────────────────────────────────────
#  REST Endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats():
    with driver.session() as session:
        states_count = session.run("MATCH (n:Page) RETURN count(n) AS count").single()["count"]
        issue_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for record in session.run("MATCH (i:Issue) RETURN i.severity AS severity, count(i) AS count"):
            if record["severity"] in issue_counts:
                issue_counts[record["severity"]] = record["count"]
        total_issues = sum(issue_counts.values())
        health_score = max(0, 100 - (issue_counts["CRITICAL"] * 5) - (issue_counts["HIGH"] * 2) - (issue_counts["MEDIUM"] * 1))
        return {"health_score": health_score, "total_states": states_count, "total_issues": total_issues, "severity_breakdown": issue_counts}


@app.get("/api/graph")
def get_graph():
    with driver.session() as session:
        nodes_result = session.run("""
            MATCH (s:Page)
            OPTIONAL MATCH (s)-[:HAS_ISSUE]->(i:Issue)
            WITH s, collect(i.severity) as severities
            RETURN s.id AS id, s.url AS url, s.intent AS intent, s.type AS classification,
                   CASE 
                     WHEN 'CRITICAL' IN severities THEN 'critical'
                     WHEN 'HIGH' IN severities THEN 'risky'
                     WHEN 'MEDIUM' IN severities THEN 'warning'
                     ELSE 'healthy'
                   END as status
        """)
        nodes = [{"id": r["id"], "label": r["classification"] or "PAGE", "url": r["url"], "intent": r["intent"], "status": r["status"]} for r in nodes_result]
        
        edges_result = session.run("MATCH (source:Page)-[r:LINKS_TO]->(target:Page) RETURN source.id AS from_id, target.id AS to_id")
        connections = [{"from": r["from_id"], "to": r["to_id"]} for r in edges_result]
        
        return {"nodes": nodes, "connections": connections}


@app.get("/api/issues")
def get_issues():
    with driver.session() as session:
        query = """
        MATCH (s:Page)-[:HAS_ISSUE]->(i:Issue)
        RETURN elementId(i) as id, i.severity AS severity, i.type AS type, 
               s.url AS location, i.description AS title, i.ai_business_impact AS ai_insight
        ORDER BY CASE i.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC
        """
        issues = []
        for record in session.run(query):
            issue_id = str(record["id"]).replace(":", "-")
            severity = record["severity"]
            label = {"CRITICAL": "Critical", "HIGH": "High", "MEDIUM": "Medium"}.get(severity, "Low")
            location = record["location"]
            issues.append({
                "id": f"ISS-{issue_id[-6:]}",
                "severity": label,
                "type": record["type"],
                "location": location[:50] + "..." if len(location) > 50 else location,
                "title": record["title"],
                "ai_insight": record["ai_insight"],
                "age": "Just now"
            })
        return issues


# ──────────────────────────────────────────────────────────────
#  WebSocket Endpoint  –  ws://localhost:8000/api/ws/agent
# ──────────────────────────────────────────────────────────────
@app.websocket("/api/ws/agent")
async def agent_ws(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; we push data proactively
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ──────────────────────────────────────────────────────────────
#  Admin: Wipe all Neo4j data  –  DELETE /api/admin/wipe
# ──────────────────────────────────────────────────────────────
@app.delete("/api/admin/wipe")
def wipe_database():
    """Clears ALL nodes and relationships from the graph so a fresh scan starts clean."""
    try:
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        return {"status": "wiped", "message": "Database cleared. Ready for a fresh scan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
#  Start Agent 1 Endpoint  –  POST /api/agent/start
# ──────────────────────────────────────────────────────────────
@app.post("/api/agent/start")
async def start_agent(payload: dict, background_tasks: BackgroundTasks):
    global _agent_running
    if _agent_running:
        raise HTTPException(status_code=409, detail="Agent is already running.")
    
    target_url = payload.get("url", "").strip()
    if not target_url:
        raise HTTPException(status_code=422, detail="A target URL is required.")

    background_tasks.add_task(_run_agent_task, target_url)
    return {"status": "started", "url": target_url}


async def _run_agent_task(target_url: str):
    global _agent_running
    _agent_running = True

    # ── Auto-wipe stale data before every new crawl ──────────────
    try:
        with driver.session() as db_sess:
            db_sess.run("MATCH (n) DETACH DELETE n")
        await broadcast_log("🗑️ Database cleared — starting fresh scan...", "info")
    except Exception as e:
        await broadcast_log(f"⚠️ DB wipe warning: {e}", "warning")

    # Capture uvicorn's event loop now (before we enter the thread)
    main_loop = asyncio.get_event_loop()

    def _sync_broadcast(payload: dict):
        """Thread-safe: post a WS broadcast onto the main uvicorn loop."""
        asyncio.run_coroutine_threadsafe(manager.broadcast(payload), main_loop)

    def _thread_main():
        """Runs in a ThreadPoolExecutor with its own ProactorEventLoop on Windows."""

        async def _inner():
            # ── 1. Real-time log streaming ──────────────────────────────────────────
            import src.agents.agent1_cartographer as _carto

            original_log_event = _carto.log_event

            def patched_log_event(event_type, **kwargs):
                original_log_event(event_type, **kwargs)
                try:
                    url_hint = kwargs.get("url", kwargs.get("target", ""))
                    msg = f"[{event_type}]" + (f" → {url_hint}" if url_hint else "")
                    level = "info"
                    if "fail" in event_type or "crash" in event_type:
                        level = "error"
                    elif event_type == "state_created":
                        level = "success"
                        msg = f"✅ New state: {url_hint}"
                    elif event_type == "crawl_stage":
                        msg = f"🔍 [{kwargs.get('stage', '')}] {url_hint}"
                    elif event_type == "auth_success":
                        level = "success"
                        msg = f"🔐 Auth succeeded: {url_hint}"
                    elif event_type == "duplicate_state_prevented":
                        msg = f"⚡ Duplicate skipped: {url_hint}"
                    elif event_type == "lifecycle":
                        msg = f"⚙️ [{kwargs.get('stage', '')}] {url_hint or kwargs.get('target', '')}"
                    _sync_broadcast({"type": "log", "level": level, "message": msg})
                except Exception:
                    pass

            _carto.log_event = patched_log_event

            # ── 2. Live video frame callback ────────────────────────────────────────
            # This is called by AgentCrawler's CDP screencast at ~15fps
            def _frame_callback(url: str, jpeg_b64: str):
                _sync_broadcast({"type": "frame", "url": url, "data": jpeg_b64})

            # ── 3. Run the agent with live video wired in ───────────────────────────
            from src.agents.agent1_cartographer import run_agent
            await run_agent(target_url, frame_callback=_frame_callback)

            # ── 4. Restore patches ──────────────────────────────────────────────────
            _carto.log_event = original_log_event

        asyncio.run(_inner())

    try:
        _sync_broadcast({"type": "log", "level": "info", "message": f"🚀 Agent 1 starting on: {target_url}"})
        await asyncio.get_event_loop().run_in_executor(_thread_pool, _thread_main)
        await broadcast_log("✅ Agent 1 finished. Graph is ready!", "success")
    except Exception:
        await broadcast_log(f"❌ Crashed: {traceback.format_exc()}", "error")
    finally:
        _agent_running = False
# Agent 2 running flag
_agent2_running = False

@app.post("/api/agent2/start")
async def start_agent2(background_tasks: BackgroundTasks):
    global _agent2_running
    if _agent2_running:
        raise HTTPException(status_code=409, detail="Agent 2 is already running.")
    background_tasks.add_task(_run_agent2_task)
    return {"status": "started"}

async def _run_agent2_task():
    global _agent2_running
    _agent2_running = True
    main_loop = asyncio.get_event_loop()

    def _sync_broadcast(payload: dict):
        asyncio.run_coroutine_threadsafe(manager.broadcast(payload), main_loop)

    def _thread_main():
        import src.agents.agent2_inspector as _insp
        original_log = _insp.log_event

        def patched_log(event_type, **kwargs):
            original_log(event_type, **kwargs)
            try:
                level = "info"
                msg = f"[{event_type}]"
                if event_type == "issue_found":
                    sev = kwargs.get("severity", "")
                    level = "error" if sev == "CRITICAL" else "warning" if sev == "HIGH" else "info"
                    msg = f"🔍 [{sev}] {kwargs.get('issue_type','')} @ {kwargs.get('url','')[:60]}"
                elif event_type == "inspection_started":
                    msg = f"🔎 Inspecting: {kwargs.get('url', '')[:70]}"
                elif event_type == "lifecycle":
                    stage = kwargs.get('stage', '')
                    level = "success" if stage == "agent_shutdown" else "info"
                    msg = f"⚙️ [{stage}] {kwargs.get('description', '')}"
                _sync_broadcast({"type": "log", "level": level, "message": msg})
            except Exception:
                pass

        _insp.log_event = patched_log
        try:
            _insp.run_inspector()
        finally:
            _insp.log_event = original_log

    try:
        _sync_broadcast({"type": "log", "level": "info", "message": "🕵️ Agent 2 (Inspector) starting 5-layer analysis..."})
        await asyncio.get_event_loop().run_in_executor(_thread_pool, _thread_main)
        await manager.broadcast({"type": "log", "level": "success", "message": "✅ Agent 2 finished. Issues mapped to Neo4j!"})
    except Exception:
        await manager.broadcast({"type": "log", "level": "error", "message": f"❌ Agent 2 crashed: {traceback.format_exc()}"})
    finally:
        _agent2_running = False


@app.post("/api/agent3/start")
async def start_agent3():
    """Run Agent 3 (Strategist) synchronously and return the risk report."""
    def _run():
        from src.agents.agent3_strategist import analyze_risk
        return analyze_risk()

    loop = asyncio.get_event_loop()
    try:
        report = await loop.run_in_executor(_thread_pool, _run)
        if report is None:
            raise HTTPException(status_code=404, detail="No data found. Run Agent 1 and Agent 2 first.")
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
