import hashlib

def create_issue(state_id, issue_type, subtype, severity, layer, description, scanner_name):
    """Utility to enforce the unified issue schema for the 5-Layer Inspection Engine."""
    issue_hash = hashlib.md5(f"{state_id}_{issue_type}_{subtype}_{description}".encode()).hexdigest()
    return {
        "issue_id": f"ISSUE-{issue_hash[:8]}",
        "state_id": state_id,
        "type": issue_type,
        "subtype": subtype,
        "severity": severity,
        "layer": layer,
        "description": description,
        "detected_by": scanner_name
    }

class StructuralIntegrityLayer:
    """Layer 1: Analyzes the core HTML structure, broken routing, and dead ends."""
    def scan(self, state):
        issues = []
        state_id = state["state_id"]
        comp = state.get("ai_intel", {}).get("composition_vector", {})
        page_type = state.get("page_type", "UNKNOWN")
        
        # 1. Navigation Dead-Ends (The user gets trapped)
        if comp.get("total_links", 0) == 0 and page_type != "STATIC" and comp.get("total_buttons", 0) == 0:
            issues.append(create_issue(state_id, "STRUCTURAL", "NAVIGATION_DEAD_END", "HIGH", 
                                          "Structural Integrity Layer",
                                          "Page has no outbound links or navigation buttons. User is trapped in this state.", 
                                          "StructuralIntegrityLayer"))
        
        # 2. Broken Transaction Flow Packaging
        intent = state.get("intent", "UNKNOWN")
        if intent == "TRANSACTIONAL" or "CHECKOUT" in page_type:
            if comp.get("financial_actions", 0) == 0 and comp.get("forms", 0) == 0 and comp.get("total_inputs", 0) > 5:
                issues.append(create_issue(state_id, "STRUCTURAL", "BROKEN_TRANSACTION_FLOW", "CRITICAL", 
                                              "Structural Integrity Layer",
                                              "Transactional intent detected, but missing secure form encapsulation or financial action buttons.", 
                                              "StructuralIntegrityLayer"))
                                              
        # 3. Auth Leakage Risk
        if intent == "AUTHENTICATION" and comp.get("forms", 0) == 0 and comp.get("total_inputs", 0) > 0:
             issues.append(create_issue(state_id, "STRUCTURAL", "NON_STANDARD_AUTH_FORM", "MEDIUM", 
                                          "Structural Integrity Layer",
                                          "Authentication inputs detected using modern SPA reactive patterns without native <form> encapsulation. Verify CSRF and submit handler bindings.", 
                                          "StructuralIntegrityLayer"))
        return issues


class FunctionalBehaviorLayer:
    """Layer 2: Analyzes logic flaws, missing constraints, and input behavior."""
    def scan(self, state):
        issues = []
        state_id = state["state_id"]
        comp = state.get("ai_intel", {}).get("composition_vector", {})
        
        forms = comp.get("forms", 0)
        buttons = comp.get("total_buttons", 0)
        inputs = comp.get("total_inputs", 0)
        
        # 1. Missing Submit Triggers
        if forms > 0 and buttons == 0:
            issues.append(create_issue(state_id, "FUNCTIONAL", "MISSING_SUBMIT_TRIGGER", "HIGH", 
                                          "Functional Behavior Layer",
                                          "Page contains a form but lacks actionable submit buttons.", 
                                          "FunctionalBehaviorLayer"))
            
        # 2. Blank State
        if inputs == 0 and buttons == 0 and comp.get("media_iframes", 0) == 0 and comp.get("tables", 0) == 0:
             if state.get("page_type") != "STATIC":
                issues.append(create_issue(state_id, "FUNCTIONAL", "BLANK_STATE", "MEDIUM", 
                                            "Functional Behavior Layer",
                                            "Page has zero interaction surface. Potential broken render or logic failure.", 
                                            "FunctionalBehaviorLayer"))
        return issues


class VisualAccessibilityLayer:
    """Layer 3: Analyzes visual bugs, ARIA tags, and structural UX constraints."""
    def scan(self, state):
        issues = []
        state_id = state["state_id"]
        comp = state.get("ai_intel", {}).get("composition_vector", {})
        intent = state.get("intent", "UNKNOWN")
        
        # 1. Orphaned Inputs
        if comp.get("total_inputs", 0) > 0 and comp.get("forms", 0) == 0:
             issues.append(create_issue(state_id, "ACCESSIBILITY", "REACTIVE_FORM_PATTERN", "LOW", 
                                         "Visual & Accessibility Layer",
                                         f"Modern SPA Reactive Form Pattern Detected: {comp.get('total_inputs')} structural inputs found without native <form> wrapper parsing.", 
                                         "VisualAccessibilityLayer"))
        return issues


class PerformanceIntelligenceLayer:
    """Layer 4: Analyzes DOM bloat, API crashes, network latency."""
    def scan(self, state):
        issues = []
        telemetry = state.get("telemetry", {})
        state_id = state["state_id"]
        page_metrics = telemetry.get("page_metrics", {})
        
        # 1. Massive DOM Bloat
        dom_nodes = page_metrics.get("dom_nodes", 0)
        if dom_nodes > 1500:
            issues.append(create_issue(state_id, "PERFORMANCE", "DOM_BLOAT", "MEDIUM", 
                                         "Performance Intelligence Layer",
                                         f"Extreme DOM node count detected ({dom_nodes}). Risk of memory leaks and render lag.", 
                                         "PerformanceIntelligenceLayer"))
                                         
        # 2. Network/API Crash
        network_failures = page_metrics.get("network_failures", 0) or telemetry.get("networkFailures", 0)
        if network_failures > 0:
            issues.append(create_issue(state_id, "PERFORMANCE", "API_FAILURE", "CRITICAL", 
                                         "Performance Intelligence Layer",
                                         f"Detected {network_failures} failed network/API request(s) during interactions.", 
                                         "PerformanceIntelligenceLayer"))
                                         
        # 3. Slow APIs
        slow_apis = page_metrics.get("slow_apis", 0) or telemetry.get("slowApis", 0)
        if slow_apis > 0:
            issues.append(create_issue(state_id, "PERFORMANCE", "SLOW_API", "HIGH", 
                                         "Performance Intelligence Layer",
                                         f"Detected {slow_apis} API call(s) exceeding 500ms latency.", 
                                         "PerformanceIntelligenceLayer"))
        
        # 4. JS Crash Rate
        console_errors = page_metrics.get("console_errors", 0) or telemetry.get("consoleErrors", 0)
        if console_errors > 0:
            issues.append(create_issue(state_id, "PERFORMANCE", "CONSOLE_ERROR", "HIGH", 
                                         "Performance Intelligence Layer",
                                         f"Detected {console_errors} JavaScript console crash/error(s).", 
                                         "PerformanceIntelligenceLayer"))
        return issues


class HygieneUXLayer:
    """Layer 5: Analyzes copy, casing, empty wrappers, grammatical hints."""
    def scan(self, state):
        issues = []
        # Complex UX logic (empty links, bad copy, placeholder leaks) goes here.
        # As an intelligent base, we check if there are a disproportional number of links indicating a bloated footer/nav
        state_id = state["state_id"]
        comp = state.get("ai_intel", {}).get("composition_vector", {})
        
        links = comp.get("total_links", 0)
        if links > 100:
            issues.append(create_issue(state_id, "HYGIENE", "LINK_BLOAT", "LOW", 
                                         "Hygiene & UX Health Layer",
                                         f"Page contains an excessive number of links ({links}), indicating probable UX clutter or SEO stuffing.", 
                                         "HygieneUXLayer"))
        return issues