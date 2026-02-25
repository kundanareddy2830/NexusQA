# Agent 1: The Observer - Configuration

BROWSER_CONFIG = {
    "headless": False, 
    "verbose": True,
}

MAX_DEPTH = 10

AUTH_CONFIG = {
    "enabled": True,
    "credentials": {
        "username": "admin@juice-sh.op",  # Standard Juice Shop test admin
        "password": "admin123"
    }
}

# --- V5.0 STRICTLY SAFE UI EXPANSION PAYLOAD ---
# This script ONLY clicks elements that reveal UI state. 
# It strictly avoids form submissions, destructive actions, or navigating away.
SAFE_INTERACTION_JS = """
(async function() {
    const safeKeywords = ['expand', 'show', 'more', 'open', 'tab', 'menu', 'filter', 'options', 'view', 'cart', 'basket', 'account', 'profile'];
    const dangerKeywords = ['delete', 'remove', 'submit', 'save', 'buy', 'pay', 'checkout', 'clear'];
    
    let clicked = 0;
    // Targets buttons, tabs, dropdowns, and HTML5 accordions (<summary>)
    document.querySelectorAll('button, [role="tab"], [aria-expanded="false"], summary, [role="button"], a.mat-button').forEach(el => {
        if (clicked > 15) return; // Limit interactions per page to prevent infinite loops
        
        const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        const type = el.getAttribute('type') || '';
        const inForm = el.closest('form') !== null;
        
        // Strict safety filter
        if (type === 'submit' || inForm) return;
        if (dangerKeywords.some(w => text.includes(w))) return;
        
        // If it looks safe, click it
        if (el.tagName.toLowerCase() === 'summary' || el.getAttribute('aria-expanded') === 'false' || el.getAttribute('role') === 'tab' || safeKeywords.some(w => text.includes(w))) {
            try { 
                el.click(); 
                clicked++;
            } catch(e) {}
        }
    });
    // Wait for animations/modals to render
    if (clicked > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
})();
"""

# --- V6.0 SAFE FORM FUZZING PAYLOADS ---
# Used to safely test search bars, login fields, and generic inputs 
# without triggering severe backend state mutations.
SAFE_FUZZING_PAYLOADS = {
    "search": "juice",           # Safe search term guaranteed to yield products in OWASP Juice Shop
    "email": "test@example.com", # Generic safe email
    "password": "Password123!",  # Generic password format
    "text": "test_input_qa",     # Generic text fallback
    "number": "1",               # Safe integer
}
