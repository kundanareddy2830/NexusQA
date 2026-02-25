import json
from statistics import mean
from src.database.neo4j_manager import StorageManager

APP_ID = "juice_shop"
OUTPUT_FILE = "agent1_world_model.json"

def safe_json_parse(value, default=None):
    if not value: return default or {}
    try: return json.loads(value)
    except Exception: return default or {}

def generate_world_model():
    storage = StorageManager()
    report = {
        "crawl_summary": {}, "page_inventory": [], "navigation_graph": [],
        "navigation_intelligence": {}, "raw_telemetry": []
    }

    with storage.driver.session() as session:
        result = session.run("MATCH (s:State {application_id: $app_id}) RETURN s.crawl_session_id AS session_id ORDER BY s.last_seen DESC LIMIT 1", app_id=APP_ID)
        latest = result.single()
        if not latest: print("❌ No crawl data found."); return
        sid = latest["session_id"]

        gates = session.run("MATCH (s:State {crawl_session_id: $sid, is_auth_gate: true}) RETURN s.url AS url, s.auth_type AS type", sid=sid)
        report["navigation_intelligence"]["auth_gates"] = [{"url": r["url"], "type": r["type"]} for r in gates]

        dead_ends = session.run("MATCH (s:State {crawl_session_id: $sid}) WHERE NOT (s)-[:NAVIGATES_TO]->() RETURN s.url AS url", sid=sid)
        report["navigation_intelligence"]["dead_ends"] = [r["url"] for r in dead_ends]

        entry_nodes = session.run("MATCH (s:State {crawl_session_id: $sid}) WHERE NOT ()-[:NAVIGATES_TO]->(s) RETURN s.url AS url", sid=sid)
        report["navigation_intelligence"]["entry_nodes"] = [r["url"] for r in entry_nodes]

        weighted_centrality = session.run("""
            MATCH (s:State {crawl_session_id: $sid})
            OPTIONAL MATCH ()-[in:NAVIGATES_TO]->(s)
            OPTIONAL MATCH (s)-[out:NAVIGATES_TO]->()
            WITH s, count(DISTINCT in) AS in_degree, count(DISTINCT out) AS out_degree
            WITH s, in_degree, out_degree,
                 CASE WHEN s.auth_context = 'AUTHENTICATED' THEN 2.0 ELSE 1.0 END AS auth_weight,
                 (1.0 + (COALESCE(s.depth, 0) * 0.5)) AS depth_weight
            WITH s, in_degree, out_degree, ((in_degree + 1) * (out_degree + 1) * auth_weight * depth_weight) AS criticality
            RETURN s.url AS url, in_degree, out_degree, s.auth_context AS context, round(criticality, 2) AS criticality
            ORDER BY criticality DESC LIMIT 5
        """, sid=sid)
        report["navigation_intelligence"]["hubs"] = [{"url": r["url"], "criticality": r["criticality"], "context": r["context"]} for r in weighted_centrality]

        critical_paths = session.run("""
            MATCH (s:State {crawl_session_id: $sid})
            WHERE s.workflow_path IS NOT NULL AND s.workflow_path CONTAINS "->"
            WITH s, s.workflow_path AS flow, size(split(s.workflow_path, "->")) AS funnel_depth
            WITH flow, funnel_depth, s.risk_score AS terminal_risk, (funnel_depth + s.risk_score) AS funnel_score
            RETURN flow, funnel_depth, funnel_score
            ORDER BY funnel_score DESC, funnel_depth DESC LIMIT 3
        """, sid=sid)
        report["navigation_intelligence"]["critical_paths"] = [{"flow": r["flow"], "depth": r["funnel_depth"], "score": r["funnel_score"]} for r in critical_paths]

        auth_stats = session.run("MATCH (s:State {crawl_session_id: $sid}) RETURN s.auth_context AS context, count(s) AS count", sid=sid)
        report["navigation_intelligence"]["auth_contexts"] = {r["context"]: r["count"] for r in auth_stats}

        intent_stats = session.run("MATCH (s:State {crawl_session_id: $sid}) RETURN s.intent AS intent, count(s) AS count ORDER BY count DESC", sid=sid)
        report["navigation_intelligence"]["intents"] = {r["intent"]: r["count"] for r in intent_stats}

        # --- MODIFIED: Pulling AI Intelligence to display the fingerprint ---
        high_risk_nodes = session.run("MATCH (s:State {crawl_session_id: $sid}) WHERE s.risk_score > 0 RETURN s.url AS url, s.risk_score AS risk, s.ai_intelligence AS ai ORDER BY s.risk_score DESC LIMIT 3", sid=sid)
        report["navigation_intelligence"]["high_risk"] = [{"url": r["url"], "risk": r["risk"], "ai": safe_json_parse(r["ai"])} for r in high_risk_nodes]

        states = session.run("MATCH (s:State {crawl_session_id: $sid}) RETURN s", sid=sid)
        total_pages = 0; load_times = []; dom_times = []
        
        for record in states:
            s = record["s"]
            total_pages += 1
            ai_intel = safe_json_parse(s.get("ai_intelligence"))
            telemetry = safe_json_parse(s.get("telemetry"))

            if telemetry.get("loadTimeMs"): load_times.append(telemetry.get("loadTimeMs"))
            if telemetry.get("domReadyTimeMs"): dom_times.append(telemetry.get("domReadyTimeMs"))

            report["page_inventory"].append({
                "url": s.get("url"), "page_type": s.get("type"),
                "intent": s.get("intent", "UNKNOWN"),
                "risk_score": s.get("risk_score", 0),
                "confidence": ai_intel.get("confidence", 0.0),
                "composition_vector": ai_intel.get("composition_vector", {})
            })

    storage.close()

    with open(OUTPUT_FILE, "w") as f:
        json.dump(report, f, indent=2)

    print("\n=======================================================")
    print(" 🌍 AGENT 1: WORLD MODEL (SYSTEM UNDERSTANDING ENGINE) ")
    print("=======================================================")
    print(f" Pages Mapped: {total_pages} | Avg Load: {mean(load_times) if load_times else 0:.0f}ms")
    
    print("\n--- 🔐 STRUCTURAL AUTHENTICATION BOUNDARIES ---")
    for gate in report['navigation_intelligence']['auth_gates']:
        print(f" 🚫 Auth Gate Detected: {gate['url']} [Type: {gate['type']}]")
    for context, count in report.get("navigation_intelligence", {}).get("auth_contexts", {}).items():
        print(f" {context} Area: {count} Pages")

    print("\n--- 🚦 RISK & INTENT ENGINE ---")
    for intent, count in report.get("navigation_intelligence", {}).get("intents", {}).items():
        print(f" Intent [{intent}] : {count} Pages")
    print("\n Highest Risk Targets (With Fingerprint):")
    for risk in report['navigation_intelligence']['high_risk']:
        vector = risk['ai'].get('composition_vector', {})
        print(f"   [Risk Score: {risk['risk']}] {risk['url']}")
        print(f"      ↳ Fingerprint: Inputs:{vector.get('total_inputs', 0)} | Buttons:{vector.get('total_buttons', 0)} | Forms:{vector.get('forms', 0)} | Tables:{vector.get('tables', 0)}")

    print("\n--- 🧠 NAVIGATION INTELLIGENCE ---")
    print(f" 🚪 Entry/Orphan Nodes : {len(report['navigation_intelligence']['entry_nodes'])}")
    print(f" 🛑 Dead End Workflows : {len(report['navigation_intelligence']['dead_ends'])}")
    
    print("\n 🎯 Top Business Criticality Hubs (Weighted):")
    for hub in report['navigation_intelligence']['hubs']:
        print(f"   {hub['url']} (Score: {hub['criticality']}, Context: {hub['context']})")
        
    print("\n 🛣️ Critical Workflow Funnels Detected:")
    for path in report['navigation_intelligence']['critical_paths']:
        print(f"   [Depth: {path['depth']} | Funnel Score: {path['score']}] {path['flow']}")

if __name__ == "__main__":
    generate_world_model()