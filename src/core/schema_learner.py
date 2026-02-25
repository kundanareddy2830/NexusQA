from crawl4ai.extraction_strategy import JsonXPathExtractionStrategy

# The Schema for Structural Classification
# We removed 'all_links' because agent_observer.py now handles link extraction 
# more precisely (with CSS selectors) using lxml.
CLASSIFICATION_SCHEMA = {
    "name": "Structural Classifier",
    "baseSelector": "//body",
    "fields": [
        # LOGIN: Has Password Input OR (Email Input + "Forgot" link)
        {
            "name": "is_login",
            "selector": "boolean(//input[@type='password'] or (//input[@type='email'] and //a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'forgot')]))",
            "type": "text"
        },
        # LISTING: >3 items that contain an Image, a Link, and a Price Symbol
        {
            "name": "is_listing",
            "selector": "boolean(count(//div[.//img and .//a and (contains(., '$') or contains(., '€') or contains(., '£'))]) > 3)",
            "type": "text"
        },
        # CART: Checkout Button + Text "Total" or "Subtotal"
        {
            "name": "is_cart",
            "selector": "boolean(//button[contains(translate(., 'CHECKOUT', 'checkout'), 'checkout')] and //*[contains(text(), 'Total') or contains(text(), 'Subtotal')])",
            "type": "text"
        },
        # ERROR: Title contains "404" or "Error"
        {
            "name": "is_error",
            "selector": "boolean(contains(//title/text(), '404') or contains(//title/text(), 'Error'))",
            "type": "text"
        }
    ]
}

def get_classification_strategy():
    """
    Returns the JsonXPathExtractionStrategy configured with the classification schema.
    """
    return JsonXPathExtractionStrategy(schema=CLASSIFICATION_SCHEMA)