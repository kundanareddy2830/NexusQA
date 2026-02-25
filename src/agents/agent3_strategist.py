import os
import json
import datetime
from src.database.neo4j_manager import StorageManager

APP_ID = "juice_shop"

# Mathematical Scoring Weights
SEVERITY_WEIGHTS = {"CRITICAL": 5.0, "HIGH": 3.0, "MEDIUM": 1.0, "LOW": 0.5}
INTENT_WEIGHTS = {"AUTHENTICATION": 1.5, "TRANSACTIONAL": 1.2, "DATA_ENTRY": 1.0, "STATIC": 0.5}
LAYER_WEIGHTS = {
    "Structural Integrity Layer": 1.2,
    "Functional Behavior Layer": 1.1,
    "Visual & Accessibility Layer": 0.8,
    "Performance Intelligence Layer": 1.0,
    "Hygiene & UX Health Layer": 0.5
}

DEFAULT_INTENT = 1.0
DEFAULT_LAYER = 1.0
SYSTEMIC_ALLOWED_TYPES = {"SECURITY", "INJECTION_SURFACE", "AUTHORIZATION", "AUTHENTICATION", "DATA_EXPOSURE", "STRUCTURAL"}

def log_event(event_type, **kwargs):
    payload = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "agent": "strategist",
        "event": event_type
    }
    payload.update(kwargs)
    print(json.dumps(payload))

def analyze_risk():
    storage = StorageManager()
    log_event("lifecycle", stage="agent_start", description="Launching Agent 3 (The Strategist)")
    
    nodes = storage.get_agent3_risk_data(APP_ID)
    storage.close()
    
    if not nodes:
        log_event("lifecycle", stage="abort", reason="No data mapped.")
        return None
        
    log_event("lifecycle", stage="graph_loaded", total_nodes=len(nodes))

    total_risk_score = 0.0
    node_risks = []
    
    intent_risk = {"AUTHENTICATION": 0.0, "TRANSACTIONAL": 0.0, "PUBLIC": 0.0}
    
    multi_layer_nodes = []
    exploitation_paths = []
    systemic_issues = {} 

    # Pre-process nodes into Canonical URLs to prevent duplicate path score amplification
    canonical_nodes = {}
    for node in nodes:
        url = node["url"]
        canonical_url = url.replace("/#/", "#/")
        
        if canonical_url not in canonical_nodes:
            canonical_nodes[canonical_url] = {
                "url": canonical_url,
                "intent": node["intent"],
                "incoming_edges": node["incoming_edges"],
                "issues": list(node["issues"])
            }
        else:
            canonical_nodes[canonical_url]["incoming_edges"] += node["incoming_edges"]
            # Deduplicate issues based on issue_id
            existing_issue_ids = {i["issue_id"] for i in canonical_nodes[canonical_url]["issues"]}
            for issue in node["issues"]:
                if issue["issue_id"] not in existing_issue_ids:
                    canonical_nodes[canonical_url]["issues"].append(issue)
                    existing_issue_ids.add(issue["issue_id"])
                    
    processed_nodes = list(canonical_nodes.values())

    # 1. Base Score Calculation
    for node in processed_nodes:
        intent = node["intent"]
        incoming = node["incoming_edges"]
        issues = node["issues"]
        url = node["url"]
        
        node_risk = 0.0
        layers_affected = set()
        has_high_crit = False
        
        intent_category = "PUBLIC"
        if intent in ["AUTHENTICATION", "AUTHORIZATION"]: intent_category = "AUTHENTICATION"
        elif intent in ["TRANSACTIONAL", "CHECKOUT", "DATA_ENTRY"]: intent_category = "TRANSACTIONAL"
        
        for issue in issues:
            sev_w = SEVERITY_WEIGHTS.get(issue["severity"], 1.0)
            int_w = INTENT_WEIGHTS.get(intent, DEFAULT_INTENT)
            lay_w = LAYER_WEIGHTS.get(issue["layer"], DEFAULT_LAYER)
            
            issue_risk = sev_w * int_w * lay_w
            node_risk += issue_risk
            
            layers_affected.add(issue["layer"])
            if issue["severity"] in ["HIGH", "CRITICAL"]:
                has_high_crit = True
                
            # Track for Systemic Bonus (Filtered to strict security/structural types)
            if issue["type"] in SYSTEMIC_ALLOWED_TYPES:
                sys_key = f"{intent}+{issue['type']}"
                if sys_key not in systemic_issues:
                    systemic_issues[sys_key] = {"count": 0, "locations": set(), "desc": issue["description"], "layer": issue["layer"]}
                systemic_issues[sys_key]["count"] += 1
                systemic_issues[sys_key]["locations"].add(url)
            
        # 🔥 Cross-Layer Amplification
        if len(layers_affected) >= 3:
            multi_layer_nodes.append({"url": url, "layers": list(layers_affected)})
            node_risk *= 1.5 
            
        # 🔥 Exploitation Path Potential
        if incoming > 3 and has_high_crit and intent_category == "AUTHENTICATION":
            exploitation_paths.append({"url": url, "incoming_edges": incoming})
            node_risk *= 2.0 
            
        total_risk_score += node_risk
        intent_risk[intent_category] += node_risk
        
        node_risks.append({"url": url, "risk": node_risk, "issues": len(issues)})
        
    # 🔥 Systemic Risk Calculation
    systemic_weaknesses = []
    for key, data in systemic_issues.items():
        if len(data["locations"]) >= 3: 
            total_risk_score += 15.0 # Systemic penalty bonus
            intent, itype = key.split("+", 1)
            systemic_weaknesses.append({
                "intent": intent,
                "type": itype,
                "count": data["count"],
                "spread": len(data["locations"]),
                "description": data["desc"]
            })
            
    # 🔥 Risk Concentration Index (RCI)
    node_risks.sort(key=lambda x: x["risk"], reverse=True)
    top_20_count = max(1, int(len(node_risks) * 0.2))
    top_20_risk = sum(n["risk"] for n in node_risks[:top_20_count])
    rci = (top_20_risk / total_risk_score) if total_risk_score > 0 else 0

    # 🔥 Intent Imbalance
    auth_ratio = (intent_risk["AUTHENTICATION"] / total_risk_score) if total_risk_score > 0 else 0
    trans_ratio = (intent_risk["TRANSACTIONAL"] / total_risk_score) if total_risk_score > 0 else 0
    pub_ratio = (intent_risk["PUBLIC"] / total_risk_score) if total_risk_score > 0 else 0
    
    # 🔥 Normalized System Score (0-100)
    theoretical_max_risk = len(processed_nodes) * 45.0 
    normalized_score = min(100, round((total_risk_score / theoretical_max_risk) * 100)) if len(processed_nodes) > 0 else 0
    
    report = {
        "overall_risk_score": normalized_score,
        "raw_risk": round(total_risk_score, 1),
        "rci": round(rci, 2),
        "intent_ratios": {
            "authentication": round(auth_ratio * 100, 1),
            "transactional": round(trans_ratio * 100, 1),
            "public": round(pub_ratio * 100, 1)
        },
        "systemic_weaknesses": systemic_weaknesses,
        "cross_layer_nodes": multi_layer_nodes,
        "exploitation_paths": exploitation_paths,
    }
    
    log_event("lifecycle", stage="agent_shutdown", report=report)
    return report

def print_executive_summary(report):
    print("=======================================================")
    print(" 📈 AGENT 3: THE STRATEGIST (Executive Risk Engine)")
    print("=======================================================")
    print(f"\n📊 Overall System Risk Score : {report['overall_risk_score']}/100")
    
    score = report["overall_risk_score"]
    if score > 75: print("   Status: 🚨 CRITICAL DANGER")
    elif score > 40: print("   Status: ⚠️ ELEVATED THREAT")
    else: print("   Status: ✅ ACCEPTABLE POSTURE")
    
    print(f"\n🔥 Risk Concentration Index (RCI): {report['rci']}")
    if report['rci'] > 0.6:
        print(f"   ⚠️ {int(report['rci']*100)}% of total system risk is concentrated in the top 20% of endpoints. High cluster threat.")
    else:
        print("   ✅ Risk is evenly distributed across the attack surface.")
        
    print("\n⚖️ Intent Imbalance Ratio (Surface Risk):")
    print(f"   - Authentication Risk : {report['intent_ratios']['authentication']}%")
    print(f"   - Transactional Risk  : {report['intent_ratios']['transactional']}%")
    print(f"   - Public/Info Risk    : {report['intent_ratios']['public']}%")
    if report['intent_ratios']['authentication'] > 50:
        print("   🔴 Authentication attack surface is disproportionately exposed.")
        
    print("\n🌐 Systemic Network Weaknesses:")
    if report["systemic_weaknesses"]:
        for sw in report["systemic_weaknesses"]:
            print(f"   - 🔴 Systemic {sw['intent']} Architecture Weakness: '{sw['type']}' repeats across {sw['spread']} endpoints.")
    else:
        print("   - No systemic lateral weaknesses detected.")
        
    print("\n🎯 Exploitation Path Potential (Graph Centrality):")
    if report["exploitation_paths"]:
        for ep in report["exploitation_paths"]:
            print(f"   - 🔴 High Exploitation Value Hub: {ep['url']} ({ep['incoming_edges']} incoming navigation routes)")
    else:
        print("   - No high-centrality exploitation paths mapped.")
        
    print("\n🥪 Cross-Layer Amplification (Multi-Vector Exposure):")
    if report["cross_layer_nodes"]:
        for cl in report["cross_layer_nodes"]:
            print(f"   - ⚠️ Node {cl['url']} fractured across {len(cl['layers'])} abstraction layers.")
    else:
        print("   - Clean abstraction boundaries. No multi-layer overlap.")
        
    print("\n=======================================================")
    print(" Strategic modeling complete. Neo4j Graph intelligence synchronized.")

if __name__ == "__main__":
    report = analyze_risk()
    if report:
        print_executive_summary(report)