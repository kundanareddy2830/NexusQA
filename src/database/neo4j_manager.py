from neo4j import GraphDatabase
import json
import hashlib

class StorageManager:
    def __init__(self, uri="bolt://localhost:7687", user="neo4j", password="password"):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def verify_connection(self):
        with self.driver.session() as session:
            session.run("RETURN 1")

    def init_scan_session(self, app_id, session_id):
        query = """
        MERGE (sess:ScanSession {id: $session_id})
        ON CREATE SET sess.application_id = $app_id, sess.start_time = timestamp()
        """
        with self.driver.session() as session:
            session.run(query, app_id=app_id, session_id=session_id)

    def save_digital_twin(self, state_id, template_id, url, page_type, app_id, session_id, dom_data, telemetry, ai_intel=None, auth_context="PUBLIC", depth=0, workflow_path="", is_auth_gate=False, auth_type="NONE"):
        # We rename state_id -> page_id for clarity with the new schema, but we keep the parameter name to not break caller
        page_id = state_id 
        dom_json = json.dumps(dom_data) if dom_data else "{}"
        telemetry_json = json.dumps(telemetry) if telemetry else "{}"
        ai_json = json.dumps(ai_intel) if ai_intel else "{}"
        
        api_calls = dom_data.get("api_calls", []) if dom_data else []
        buttons = dom_data.get("buttons", []) if dom_data else []
        forms_count = dom_data.get("forms", 0) if dom_data else 0
        inputs = dom_data.get("inputs", []) if dom_data else []
        
        risk_score = ai_intel.get("composition_vector", {}).get("risk_score", 0) if ai_intel else 0
        intent = ai_intel.get("intent", "UNKNOWN") if ai_intel else "UNKNOWN"

        query = """
        // 1. Ensure ScanSession exists
        MERGE (sess:ScanSession {id: $session_id})
        ON CREATE SET sess.application_id = $app_id, sess.start_time = timestamp()
        
        // 2. Create the Page Node
        MERGE (p:Page {id: $page_id})
        ON CREATE SET 
            p.application_id = $app_id,
            p.url = $url, 
            p.type = $page_type, 
            p.telemetry = $telemetry_json,
            p.ai_intelligence = $ai_json, 
            p.auth_context = $auth_context,
            p.risk_score = $risk_score, 
            p.intent = $intent, 
            p.depth = $depth, 
            p.workflow_path = $workflow_path,
            p.is_auth_gate = $is_auth_gate, 
            p.auth_type = $auth_type,
            p.dom_fingerprint = $template_id,
            p.first_seen = timestamp(), 
            p.last_seen = timestamp()
        ON MATCH SET 
            p.last_seen = timestamp(),
            p.type = CASE WHEN p.type = 'GENERIC_STATE' THEN $page_type ELSE p.type END,
            p.depth = CASE WHEN $depth < coalesce(p.depth, 999) THEN $depth ELSE p.depth END
            
        // 3. Link Page to Session
        MERGE (p)-[:PART_OF_SESSION]->(sess)
        
        // 4. Create Action Nodes for Forms
        WITH p, sess
        FOREACH (ignoreMe IN CASE WHEN $forms_count > 0 THEN [1] ELSE [] END |
            MERGE (a:Action {id: p.id + '_form'})
            ON CREATE SET 
                a.type = 'FORM_SUBMIT', 
                a.description = 'Form Submission Area',
                a.application_id = $app_id
            MERGE (p)-[:TRIGGERS]->(a)
            MERGE (a)-[:PART_OF_SESSION]->(sess)
        )
        
        // 5. Create API Call Nodes
        WITH p, sess
        UNWIND (CASE WHEN size($api_calls) > 0 THEN $api_calls ELSE [null] END) AS api
        CALL (p, sess, api) {
            WITH p, sess, api
            WITH p, sess, api WHERE api IS NOT NULL
            MERGE (api_node:`API Call` {id: api.endpoint + '_' + api.method})
            ON CREATE SET 
                api_node.endpoint = api.endpoint,
                api_node.method = api.method,
                api_node.status_code = api.status_code,
                api_node.payload_size = api.payload_size,
                api_node.latency = api.latency,
                api_node.application_id = $app_id
            MERGE (p)-[:CALLS_API]->(api_node)
            MERGE (api_node)-[:PART_OF_SESSION]->(sess)
            RETURN count(*) AS dummy
        }
        RETURN p.id
        """
        
        # Format the APIs to handle the new dict structure from our JS interceptor
        formatted_apis = []
        for api in api_calls:
            if isinstance(api, dict):
                formatted_apis.append(api)
            else:
                # Fallback for old string format just in case
                formatted_apis.append({
                    "endpoint": str(api),
                    "method": "UNKNOWN",
                    "status_code": 0,
                    "payload_size": 0,
                    "latency": 0
                })
        
        with self.driver.session() as session:
            session.run(query, page_id=page_id, template_id=template_id, url=url, 
                        page_type=page_type, telemetry_json=telemetry_json,
                        ai_json=ai_json, app_id=app_id, session_id=session_id, 
                        forms_count=forms_count, api_calls=formatted_apis, auth_context=auth_context,
                        risk_score=risk_score, intent=intent, depth=depth, workflow_path=workflow_path,
                        is_auth_gate=is_auth_gate, auth_type=auth_type)
            
            # Sub-query to add buttons as Actions
            if buttons:
                btn_query = """
                MATCH (p:Page {id: $page_id})
                MATCH (sess:ScanSession {id: $session_id})
                UNWIND $buttons AS btn
                MERGE (a:Action {id: p.id + '_btn_' + coalesce(btn.id, btn.text)})
                ON CREATE SET 
                    a.type = 'BUTTON_CLICK',
                    a.description = btn.text,
                    a.element_id = btn.id,
                    a.application_id = $app_id
                MERGE (p)-[:TRIGGERS]->(a)
                MERGE (a)-[:PART_OF_SESSION]->(sess)
                """
                session.run(btn_query, page_id=page_id, session_id=session_id, app_id=app_id, buttons=buttons)

    def save_navigation(self, from_state_id, to_state_id, action_type, selector, app_id, session_id):
        query = """
        MATCH (a:Page {id: $from_id})
        MATCH (b:Page {id: $to_id})
        MERGE (a)-[r:LINKS_TO {selector: $selector}]->(b)
        ON CREATE SET r.action = $action_type, r.application_id = $app_id, r.session_id = $session_id
        """
        with self.driver.session() as session:
            session.run(query, from_id=from_state_id, to_id=to_state_id, action_type=action_type, selector=selector, app_id=app_id, session_id=session_id)

    def save_virtual_interaction(self, base_state_id, virtual_state_id, action_type, app_id, session_id):
        query = """
        MATCH (a:Page {id: $base_id})
        MATCH (b:Page {id: $virtual_id})
        MERGE (a)-[r:LINKS_TO {type: 'VIRTUAL_STATE_EXPANSION'}]->(b)
        ON CREATE SET r.action = $action_type, r.application_id = $app_id, r.session_id = $session_id
        """
        with self.driver.session() as session:
            session.run(query, base_id=base_state_id, virtual_id=virtual_state_id, action_type=action_type, app_id=app_id, session_id=session_id)

    def log_trap(self, url, struct_hash, app_id, session_id):
        query = """
        MERGE (sess:ScanSession {id: $session_id})
        MERGE (t:Trap {url: $url, struct_hash: $struct_hash, application_id: $app_id}) 
        ON CREATE SET t.first_seen = timestamp()
        MERGE (t)-[:PART_OF_SESSION]->(sess)
        """
        with self.driver.session() as session:
            session.run(query, url=url, struct_hash=struct_hash, app_id=app_id, session_id=session_id)

    def save_redirect_chain(self, source_url, redirect_chain, app_id, session_id):
        if len(redirect_chain) <= 1: return
        
        with self.driver.session() as session:
            for i in range(len(redirect_chain) - 1):
                from_url = redirect_chain[i]['url']
                to_url = redirect_chain[i+1]['url']
                
                from_id = f"{app_id}::STATE::{hashlib.md5(from_url.encode()).hexdigest()}"
                to_id = f"{app_id}::STATE::{hashlib.md5(to_url.encode()).hexdigest()}"
                
                query = """
                MERGE (sess:ScanSession {id: $session_id})
                MERGE (a:Page {id: $from_id})
                ON CREATE SET a.url = $from_url, a.application_id = $app_id
                
                MERGE (b:Page {id: $to_id})
                ON CREATE SET 
                    b.url = $to_url,
                    b.application_id = $app_id,
                    b.type = 'EXTERNAL_AUTH_PROVIDER',
                    b.is_auth_gate = true
                
                MERGE (a)-[r:LINKS_TO {type: 'REDIRECT'}]->(b)
                ON CREATE SET r.application_id = $app_id, r.session_id = $session_id
                MERGE (a)-[:PART_OF_SESSION]->(sess)
                MERGE (b)-[:PART_OF_SESSION]->(sess)
                """
                session.run(query, from_id=from_id, to_id=to_id, from_url=from_url, to_url=to_url, app_id=app_id, session_id=session_id)

    # ==========================================================
    # --- AGENT 2 (INSPECTOR) UPDATED SCHEMA METHODS ---
    # ==========================================================

    def get_mapped_states(self, app_id, session_id=None):
        """Fetches all States mapped by Agent 1 to pass to Agent 2's scanners. Returns Page nodes."""
        
        if session_id:
            query = """
            MATCH (sess:ScanSession {application_id: $app_id, id: $session_id})<-[:PART_OF_SESSION]-(s:Page)
            RETURN s.id AS state_id, s.url AS url, s.telemetry AS telemetry, 
                   s.ai_intelligence AS ai_intel, s.intent AS intent,
                   s.type AS page_type, s.auth_context AS auth_context,
                   sess.id AS session_id
            """
        else:
            query = """
            MATCH (sess:ScanSession {application_id: $app_id})
            WITH sess ORDER BY sess.start_time DESC LIMIT 1
            MATCH (sess)<-[:PART_OF_SESSION]-(s:Page)
            RETURN s.id AS state_id, s.url AS url, s.telemetry AS telemetry, 
                   s.ai_intelligence AS ai_intel, s.intent AS intent,
                   s.type AS page_type, s.auth_context AS auth_context,
                   sess.id AS session_id
            """
        
        states = []
        with self.driver.session() as session:
            result = session.run(query, app_id=app_id, session_id=session_id)
            for record in result:
                states.append({
                    "state_id": record["state_id"],
                    "url": record["url"],
                    "page_type": record["page_type"],
                    "auth_context": record["auth_context"],
                    "session_id": record["session_id"],
                    "intent": record["intent"],
                    "telemetry": json.loads(record["telemetry"]) if record["telemetry"] else {},
                    "ai_intel": json.loads(record["ai_intel"]) if record["ai_intel"] else {}
                })
        return states

    def save_issue(self, state_id, issue, app_id, session_id):
        """Saves a normalized issue and links it to the Page."""
        query = """
        MATCH (s:Page {id: $state_id})
        MERGE (d:Issue {id: $issue_id})
        ON CREATE SET 
            d.type = $type,
            d.subtype = $subtype,
            d.severity = $severity, 
            d.layer = $layer,
            d.description = $description,
            d.detected_by = $detected_by,
            d.application_id = $app_id, 
            d.crawl_session_id = $session_id,
            d.first_seen = timestamp()
        MERGE (s)-[r:HAS_ISSUE]->(d)
        ON CREATE SET r.crawl_session_id = $session_id
        """
        
        if "ai_insight" in issue:
            query += " SET d.ai_business_impact = $ai_insight "
            
        with self.driver.session() as session:
            session.run(query, 
                        state_id=state_id, 
                        issue_id=issue["issue_id"],
                        type=issue["type"], 
                        subtype=issue.get("subtype", "GENERAL"),
                        severity=issue["severity"], 
                        layer=issue["layer"],
                        description=issue["description"], 
                        detected_by=issue["detected_by"],
                        app_id=app_id, 
                        session_id=session_id,
                        ai_insight=issue.get("ai_insight", ""))

    def get_agent3_risk_data(self, app_id, session_id=None):
        """Fetches flat topology data, issues, and graph inward edge density for Agent 3 routing."""
        query = """
        MATCH (p:Page {application_id: $app_id})
        OPTIONAL MATCH (p)-[:HAS_ISSUE]->(i:Issue)
        OPTIONAL MATCH ()-[r:LINKS_TO]->(p)
        RETURN 
            p.id AS state_id, 
            p.url AS url, 
            p.intent AS intent,
            count(DISTINCT r) AS incoming_edges,
            collect(DISTINCT {
                issue_id: i.id,
                severity: i.severity,
                layer: i.layer,
                type: i.type,
                description: i.description
            }) AS raw_issues
        """
        results = []
        with self.driver.session() as session:
            res = session.run(query, app_id=app_id)
            for record in res:
                # Filter out the [None] elements created by collect() on OPTIONAL MATCH misses
                issues = [ish for ish in record["raw_issues"] if ish.get("issue_id") is not None]
                results.append({
                    "state_id": record["state_id"],
                    "url": record["url"],
                    "intent": record["intent"],
                    "incoming_edges": record["incoming_edges"],
                    "issues": issues
                })
        return results