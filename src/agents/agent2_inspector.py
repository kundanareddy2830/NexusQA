import os
import time
import json
import datetime
from dotenv import load_dotenv
from src.database.neo4j_manager import StorageManager
from src.scanners.rules import (
    StructuralIntegrityLayer, 
    FunctionalBehaviorLayer, 
    VisualAccessibilityLayer, 
    PerformanceIntelligenceLayer, 
    HygieneUXLayer
)

# --- ENTERPRISE LOGGING ---
def log_event(event_type, **kwargs):
    payload = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "agent": "inspector",
        "event": event_type
    }
    payload.update(kwargs)
    print(json.dumps(payload))

# --- SECURE ENVIRONMENT LOADING ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

try:
    if GEMINI_API_KEY:
        import google.generativeai as genai
        # DOWNGRADE TO STABLE MODEL FOR HIGHER FREE TIER QUOTA
        genai.configure(api_key=GEMINI_API_KEY)
        HAS_GEMINI = True
    else:
        HAS_GEMINI = False
except ImportError:
    HAS_GEMINI = False

APP_ID = "juice_shop"

# --- HACKATHON GOLD: THE LLM CACHE LAYER ---
# This prevents hitting the 5 RPM Free Tier Limit by reusing insights for identical defects.
_llm_cache = {}

def get_llm_business_insight(intent, defect_type, description):
    """THE DECISION INTELLIGENCE MOMENT: AI Reasoning for Critical Bugs (With Caching)"""
    
    # 1. Check the Cache first!
    cache_key = f"{intent}_{defect_type}"
    if cache_key in _llm_cache:
        print(f"    [LLM CACHE HIT] Reusing insight for {defect_type} on {intent}")
        return _llm_cache[cache_key]

    if not HAS_GEMINI:
        return f"AI Insight: Severe business risk. {defect_type} on a {intent} page directly impacts user trust and conversion funnels."
    
    try:
        # 2. Use the stable 1.5-flash model (15 RPM limit vs 2.5's 5 RPM limit)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are a senior DevSecOps QA architect.

        Analyze the following defect from business, security, and user experience perspective.

        Page Intent: {intent}
        Defect Type: {defect_type}
        Defect Description: {description}

        Return exactly ONE short, powerful sentence explaining:
        - Revenue risk OR security risk OR user trust impact.

        Do not explain coding details.
        Be executive level insight.
        """
        response = model.generate_content(prompt)
        insight = f"AI Insight: {response.text.strip()}"
        
        # 3. Save to cache for future use
        _llm_cache[cache_key] = insight
        
        # 4. Safety Valve: Pause for 2 seconds to ensure we don't trip rate limits
        time.sleep(2) 
        
        return insight

    except Exception as e:
        print(f"⚠️ LLM Warning: {e}")
        return f"AI Insight: Severe business risk detected in the {intent} flow."

def run_inspector():
    print("=======================================================")
    print(" 🕵️ AGENT 2: THE INSPECTOR (5-Layer Intelligence Engine)")
    print("=======================================================")
    log_event("lifecycle", stage="agent_start", description="Launching Agent 2 (The Inspector)")
    
    if HAS_GEMINI:
        print("🟢 Secure Gemini API Key Loaded. AI Reasoning is ACTIVE (With Caching).")
    else:
        print("🟡 No Gemini API Key found in .env. Using fallback reasoning.")

    storage = StorageManager()
    
    log_event("lifecycle", stage="fetching_graph", source="neo4j")
    states = storage.get_mapped_states(APP_ID)
    
    if not states:
        log_event("lifecycle", stage="abort", reason="No states found. Run Agent 1 first.")
        storage.close()
        return
        
    log_event("lifecycle", stage="graph_loaded", total_states=len(states))
    
    scanners = [
        StructuralIntegrityLayer(),
        FunctionalBehaviorLayer(),
        VisualAccessibilityLayer(),
        PerformanceIntelligenceLayer(),
        HygieneUXLayer()
    ]
    
    total_issues = 0
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    layer_counts = {
        "Structural Integrity Layer": 0,
        "Functional Behavior Layer": 0,
        "Visual & Accessibility Layer": 0,
        "Performance Intelligence Layer": 0,
        "Hygiene & UX Health Layer": 0
    }
    
    seen_urls = set()
    for state in states:
        url = state['url']
        canonical_url = url.replace("/#/", "#/")
        if canonical_url in seen_urls:
            continue
        seen_urls.add(canonical_url)
        
        state_id = state['state_id']
        session_id = state.get('session_id', 'unknown_session')
        intent = state.get('intent', 'UNKNOWN')
        
        log_event("inspection_started", url=url, state_id=state_id, intent=intent)
        
        page_issues = []
        for scanner in scanners:
            page_issues.extend(scanner.scan(state))
            
        if page_issues:
            for i in page_issues:
                # Contextual Escalation 
                if intent in ["TRANSACTIONAL", "AUTHENTICATION", "ADMIN_OR_CRITICAL"]:
                    if i['severity'] == "LOW":
                        i['severity'] = "MEDIUM"
                        i['description'] = f"[ESCALATED due to {intent} context] " + i['description']
                    elif i['severity'] == "MEDIUM":
                        i['severity'] = "HIGH"
                        i['description'] = f"[ESCALATED due to {intent} context] " + i['description']

                # AI Decision Moment
                risk_score = state.get('ai_intel', {}).get('composition_vector', {}).get('risk_score', 0)
                if i['severity'] in ["HIGH", "CRITICAL"] or risk_score >= 15:
                    i['ai_insight'] = get_llm_business_insight(intent, i['type'], i['description'])
                    
                storage.save_issue(state_id, i, APP_ID, session_id)
                severity_counts[i['severity']] += 1
                layer_counts[i['layer']] += 1
                total_issues += 1
                
                log_event("issue_found", url=url, issue_type=i["type"], severity=i["severity"], layer=i["layer"], description=i["description"])
                
    storage.close()
    
    log_event("lifecycle", stage="agent_shutdown", total_issues=total_issues, severity_summary=severity_counts, layer_summary=layer_counts)
    
    print("\n=======================================================")
    print(" 📊 5-LAYER INSPECTION REPORT COMPLETE")
    print("=======================================================")
    print(f" Total Issues Logged: {total_issues}")
    print(" --- SEVERITY BREAKDOWN ---")
    print(f" 🚨 CRITICAL : {severity_counts['CRITICAL']}")
    print(f" 🔴 HIGH     : {severity_counts['HIGH']}")
    print(f" 🟡 MEDIUM   : {severity_counts['MEDIUM']}")
    print(f" 🔵 LOW      : {severity_counts['LOW']}")
    print(" --- LAYER BREAKDOWN ---")
    for layer, count in layer_counts.items():
        if count > 0:
            print(f" 🛡️  {layer}: {count}")
    print("=======================================================")
    print("Issues successfully generated and mapped in Neo4j Graph!")

if __name__ == "__main__":
    run_inspector()