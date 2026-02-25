import hashlib
import json
import re
from lxml import html

def get_structure_hash(url, html_content):
    """
    V5.1 DEEP STRUCTURAL SIGNATURE (Navigation Enabled)
    """
    try:
        tree = html.fromstring(html_content)
        
        # FIX: We no longer strip <nav> or <mat-sidenav>. The cartographer needs to see menus!
        noise_elements = tree.xpath('//footer | //script | //style | //svg')
        removed_script_count = len(noise_elements)
        for noise in noise_elements:
            noise.getparent().remove(noise)

        inputs = sorted([inp.get('type') or inp.get('role', 'text').lower() for inp in tree.xpath('//input[not(@type="hidden")] | //textarea | //select | //*[@contenteditable="true"] | //*[@role="textbox"] | //*[@role="combobox"]')])
        
        stripped_dynamic_tokens_count = 0
        def regex_strip(text):
            nonlocal stripped_dynamic_tokens_count
            cleaned, count = re.subn(r'\d+|[a-f0-9]{8,}', '', text)
            stripped_dynamic_tokens_count += count
            return cleaned

        buttons = sorted([
            regex_strip(btn.text_content().strip().lower())
            for btn in tree.xpath('//button | //input[@type="submit"] | //input[@type="button"] | //*[@role="button"]') 
            if btn.text_content().strip() or btn.get('id') or btn.get('aria-label')
        ])
        
        media = len(tree.xpath('//video | //audio | //iframe'))
        expandables = len(tree.xpath('//details | //*[@aria-expanded] | //*[@data-toggle]'))
        menus = len(tree.xpath('//*[@role="menu"] | //*[@role="listbox"] | //*[@role="tree"]'))
        toggles = len(tree.xpath('//*[@role="switch"]'))
        sliders = len(tree.xpath('//input[@type="range"] | //*[@role="slider"]'))
        
        signature = {
            "inputs": inputs, "buttons": buttons, "media": media,
            "expandables": expandables, "menus": menus,
            "toggles": toggles, "sliders": sliders
        }
        
        # --- V6.0 CONTENT-AWARE PAGINATION UPGRADE ---
        # Include a snippet of the page's actual text content to differentiate 
        # identical structural templates (like Page 1 vs Page 2 of a product grid)
        # We take the first 500 characters of clean text to avoid noise but capture content changes.
        visible_text = tree.text_content().strip()
        # Remove massive digit strings (timestamps) and long hashes from the text sample
        clean_text_raw, count = re.subn(r'\d{6,}|[a-f0-9]{16,}', '', visible_text)
        stripped_dynamic_tokens_count += count
        clean_text = " ".join(clean_text_raw.split())[:300]
        signature["content_sample"] = clean_text

        sig_json = json.dumps(signature, sort_keys=True)
        hash_str = hashlib.md5(sig_json.encode()).hexdigest()
        
        metadata = {
            "normalized_dom_length": len(sig_json),
            "stripped_dynamic_tokens_count": stripped_dynamic_tokens_count,
            "removed_script_count": removed_script_count
        }
        return hash_str, metadata
    except Exception:
        fallback = hashlib.md5(html_content.encode()).hexdigest()
        return fallback, {"normalized_dom_length": len(html_content), "stripped_dynamic_tokens_count": 0, "removed_script_count": 0}