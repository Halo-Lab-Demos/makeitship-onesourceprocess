#!/usr/bin/env python3
"""
Process raw HTML files into clean static demo site pages.
- Removes tracking scripts, WP meta tags, inline WP styles
- Fixes asset paths (CSS, JS, images)
- Fixes links
- Adds robots noindex
"""
import re
import sys
import os

def process_html(input_file, output_file, page_name):
    with open(input_file, 'r', encoding='utf-8') as f:
        html = f.read()

    print(f"Processing {input_file} ({len(html)} bytes)...")

    # -------------------------------------------------------------------------
    # 1. Remove inline GTM / noscript blocks first (multi-line)
    # -------------------------------------------------------------------------
    html = re.sub(
        r'<!--\s*Google Tag Manager\s*-->.*?<!--\s*End Google Tag Manager\s*-->',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )
    html = re.sub(
        r'<noscript[^>]*>.*?googletagmanager.*?</noscript>',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )

    # -------------------------------------------------------------------------
    # 2. Remove tracking/analytics <script> tags (src-based)
    # -------------------------------------------------------------------------
    tracking_src_fragments = [
        '5223270',
        'bat.bing.com',
        '5976dcc9ff038dc2073bb2b42687ff78',
        'clarity.js',
        'call-tracking',
        'loader.js',
        'googletagmanager.com',
        '7364.js',
        'gtm.js',
        'recaptcha',
        'cookieconsent',
        't1a8a6767c',
        'tp.widget.bootstrap',
        'akismet-frontend',
        'wp-polyfill',
        'hooks.min.js',
        'i18n.min.js',
        'purify.min.js',
        'frontend-script.js',
        'scripts.js',
        'api.js',
        'index.js',
        'init.js',
    ]

    for fragment in tracking_src_fragments:
        # Match script tags with that src fragment (with or without closing content)
        pattern = r'<script[^>]*src=["\'][^"\']*' + re.escape(fragment) + r'[^"\']*["\'][^>]*>.*?</script>'
        html = re.sub(pattern, '', html, flags=re.DOTALL | re.IGNORECASE)
        # Also self-closing
        pattern2 = r'<script[^>]*src=["\'][^"\']*' + re.escape(fragment) + r'[^"\']*["\'][^>]*/>'
        html = re.sub(pattern2, '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 3. Remove WP emoji / specific inline scripts
    # -------------------------------------------------------------------------
    # WP emoji script block
    html = re.sub(r'<script[^>]*>.*?wp\.emoji.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # wc_gdrp cookieconsent inline script
    html = re.sub(r'<script[^>]*wc_gdrp[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Any remaining cookieconsent scripts
    html = re.sub(r'<script[^>]*cookieconsent[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # JSON-LD scripts
    html = re.sub(r'<script[^>]*application/ld\+json[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # website-schema scripts
    html = re.sub(r'<script[^>]*website-schema[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Inline GTM script blocks - be specific to avoid greedy matching consuming too much
    # Match short inline scripts that set up dataLayer or GTM (they're typically compact)
    # Use a non-greedy match limited to avoid eating large content blocks
    html = re.sub(r'<script[^>]*>\s*window\.dataLayer\s*=.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script[^>]*>\s*\(function\(w,d,s,l,i\).*?GTM-[A-Z0-9]+.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 4. Remove WP inline <style> blocks
    # -------------------------------------------------------------------------
    wp_style_ids = [
        'wp-img-auto-sizes',
        'wp-emoji-styles',
        'classic-theme-styles',
        'global-styles-inline-css',
        'akismet-widget-style',
        'fancybox-inline-css',
    ]
    for sid in wp_style_ids:
        pattern = r'<style[^>]*' + re.escape(sid) + r'[^>]*>.*?</style>'
        html = re.sub(pattern, '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 5. Remove WP meta/link tags
    # -------------------------------------------------------------------------
    wp_meta_patterns = [
        r'<link[^>]*api\.w\.org[^>]*>',
        r'<link[^>]*oEmbed[^>]*>',
        r'<link[^>]*EditURI[^>]*>',
        r'<link[^>]*shortlink[^>]*>',
        r'<meta[^>]*name=["\']generator["\'][^>]*>',
        r'<meta[^>]*http-equiv=["\']origin-trial["\'][^>]*>',
        r'<meta[^>]*name=["\']google-site-verification["\'][^>]*>',
        r'<link[^>]*rel=["\']canonical["\'][^>]*>',
        r'<meta[^>]*property=["\']fb:pages["\'][^>]*>',
        r'<meta[^>]*property=["\']fb:admins["\'][^>]*>',
        r'<meta[^>]*property=["\']fb:app_id["\'][^>]*>',
        r'<meta[^>]*property=["\']twitter:[^"\']*["\'][^>]*>',
        r'<meta[^>]*name=["\']twitter:[^"\']*["\'][^>]*>',
        r'<meta[^>]*property=["\']og:[^"\']*["\'][^>]*>',
        r'<meta[^>]*property=["\']article:[^"\']*["\'][^>]*>',
        r'<meta[^>]*name=["\']msapplication-TileImage["\'][^>]*>',
        # cookie consent link
        r'<link[^>]*cookieconsent[^>]*>',
    ]
    for pattern in wp_meta_patterns:
        html = re.sub(pattern, '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 6. Remove Trustpilot widget divs/scripts
    # -------------------------------------------------------------------------
    # Remove trustpilot widget divs (may be nested, handle greedily)
    html = re.sub(r'<div[^>]*class=["\'][^"\']*trustpilot-widget[^"\']*["\'][^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script[^>]*trustpilot[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 7. Remove ALL existing CSS <link rel="stylesheet"> tags
    # -------------------------------------------------------------------------
    html = re.sub(r'<link[^>]*rel=["\']stylesheet["\'][^>]*/?\s*>', '', html, flags=re.IGNORECASE | re.DOTALL)
    # Also handle reversed attribute order
    html = re.sub(r'<link[^>]*type=["\']text/css["\'][^>]*/?\s*>', '', html, flags=re.IGNORECASE | re.DOTALL)

    # -------------------------------------------------------------------------
    # 8. Remove ALL local JS script tags (we'll add clean ones at end of body)
    # -------------------------------------------------------------------------
    html = re.sub(r'<script[^>]*src=["\']assets/js/[^"\']*["\'][^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script[^>]*id=["\']jquery-core-js["\'][^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove any remaining jquery/swiper/fancybox/main script tags that might have different paths
    for jsfile in ['jquery.min.js', 'swiper-bundle.min.js', 'jquery.fancybox.min.js', 'jquery.easing.min.js', 'main.js']:
        pattern = r'<script[^>]*src=["\'][^"\']*' + re.escape(jsfile) + r'[^"\']*["\'][^>]*>.*?</script>'
        html = re.sub(pattern, '', html, flags=re.DOTALL | re.IGNORECASE)

    # -------------------------------------------------------------------------
    # 9. Add robots noindex + clean CSS links after charset meta
    # -------------------------------------------------------------------------
    clean_css = (
        '\n<meta name="robots" content="noindex, nofollow">\n'
        '<link rel="stylesheet" href="css/main.css">\n'
        '<link rel="stylesheet" href="css/custom.css">\n'
        '<link rel="stylesheet" href="css/styles.css">\n'
        '<link rel="stylesheet" href="css/style.css">\n'
        '<link rel="stylesheet" href="css/jquery.fancybox.min.css">\n'
        '<link rel="stylesheet" href="css/swiper-bundle.min.css">'
    )
    html = re.sub(
        r'(<meta[^>]*charset[^>]*>)',
        r'\1' + clean_css,
        html, count=1, flags=re.IGNORECASE
    )

    # -------------------------------------------------------------------------
    # 10. Fix image paths
    # -------------------------------------------------------------------------
    # Full URL WP uploads → images/filename
    html = re.sub(
        r'https?://www\.onesourceprocess\.com/wp-content/uploads/[^\s"\']*/([\w\-\.]+\.(?:svg|png|jpg|jpeg|webp|gif))',
        r'images/\1',
        html, flags=re.IGNORECASE
    )
    # Absolute path WP uploads → images/filename
    html = re.sub(
        r'/wp-content/uploads/[^\s"\']*/([\w\-\.]+\.(?:svg|png|jpg|jpeg|webp|gif))',
        r'images/\1',
        html, flags=re.IGNORECASE
    )
    # Local assets/images/ → images/
    html = re.sub(r'assets/images/', 'images/', html)
    # Fix srcset attributes with WP uploads (already handled above but clean up any missed)
    html = re.sub(
        r'https?://www\.onesourceprocess\.com/wp-content/uploads/[^\s"\']+',
        '#',
        html, flags=re.IGNORECASE
    )

    # -------------------------------------------------------------------------
    # 11. Fix JS src paths (assets/js/ → js/)
    # -------------------------------------------------------------------------
    html = re.sub(r'assets/js/', 'js/', html)

    # -------------------------------------------------------------------------
    # 12. Fix href links
    # -------------------------------------------------------------------------
    # Home page links
    html = re.sub(
        r'href=["\']https?://www\.onesourceprocess\.com/?["\']',
        'href="index.html"',
        html, flags=re.IGNORECASE
    )
    # Partner program
    html = re.sub(
        r'href=["\']https?://www\.onesourceprocess\.com/partner-program/?["\']',
        'href="partner-program.html"',
        html, flags=re.IGNORECASE
    )
    # Root-relative home
    html = re.sub(r'href=["\']/?["\']', 'href="index.html"', html)

    # All remaining external/absolute hrefs → href="#" with data-original-href
    def fix_external_link(m):
        url = m.group(1)
        return f'href="#" data-original-href="{url}"'

    html = re.sub(
        r'href=["\']((https?://|/)[^"\'#][^"\']*)["\']',
        fix_external_link,
        html, flags=re.IGNORECASE
    )

    # -------------------------------------------------------------------------
    # 13. Add clean JS scripts before </body>
    # -------------------------------------------------------------------------
    clean_js = (
        '<script src="js/jquery.min.js"></script>\n'
        '<script src="js/jquery.easing.min.js"></script>\n'
        '<script src="js/swiper-bundle.min.js"></script>\n'
        '<script src="js/jquery.fancybox.min.js"></script>\n'
        '<script src="js/main.js"></script>\n'
        '</body>\n</html>'
    )
    # Find the last </body> and truncate everything after it, then add clean ending
    last_body_idx = html.rfind('</body>')
    if last_body_idx != -1:
        html = html[:last_body_idx] + clean_js
    else:
        # Try </html> as fallback
        last_html_idx = html.rfind('</html>')
        if last_html_idx != -1:
            html = html[:last_html_idx] + clean_js
        else:
            html += clean_js

    # Fix wp-content/themes image paths (like minus.svg, plus.svg in theme assets)
    html = re.sub(
        r'https?://www\.onesourceprocess\.com/wp-content/themes/[^\s"\'"]*/([^/\s"\']+\.(?:svg|png|jpg|jpeg|webp|gif))',
        r'images/\1',
        html, flags=re.IGNORECASE
    )
    # Remove speculation rules script (references wp-content paths as text, not actual broken refs)
    html = re.sub(r'<script[^>]*type=["\']speculationrules["\'][^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove setTimeout-wrapped Bing/tracking inline scripts
    html = re.sub(r'<script[^>]*>\s*setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{.*?bat\.bing\.com.*?\}\s*,\s*\d+\s*\)\s*</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script[^>]*>\s*setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{.*?uetq.*?\}\s*,\s*\d+\s*\)\s*</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Microsoft Clarity inline script
    html = re.sub(r'<script[^>]*>\s*\(function\s*\(c,l,a,r,i,t,y\).*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Inline Bing/GA init scripts
    html = re.sub(r'<script[^>]*>.*?bat\.bing\.com/bat\.js.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove leftover rendered DOM artifacts from scraping
    # batBeacon div (Bing tracking pixel)
    html = re.sub(r'<div[^>]*batBeacon[^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # reCAPTCHA badge rendered div
    html = re.sub(r'<div[^>]*class=["\'][^"\']*grecaptcha-badge[^"\']*["\'][^>]*>.*?</div>\s*</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<div[^>]*class=["\'][^"\']*grecaptcha[^"\']*["\'][^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # fancybox DOM injected elements
    html = re.sub(r'<div id="fancybox-(?:tmp|loading|overlay|wrap)[^>]*>.*?</div>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # CrazyEgg / other 3rd party iframes at end
    html = re.sub(r'<iframe[^>]*(?:ce_proto|CrazyEgg|crzy)[^>]*>.*?</iframe>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<iframe[^>]*(?:ce_proto|CrazyEgg|crzy)[^>]*/>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Any empty iframes injected by trackers (style="display:none")
    html = re.sub(r'<iframe[^>]*style=["\']display:\s*none;?["\'][^>]*>.*?</iframe>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<iframe[^>]*style=["\']display:\s*none;?["\'][^>]*/>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Clean up multiple consecutive blank lines
    html = re.sub(r'\n{4,}', '\n\n\n', html)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"  -> Written to {output_file} ({len(html)} bytes)")

    # Sanity checks
    body_count = html.lower().count('</body>')
    css_count = html.count('css/main.css')
    noindex = 'noindex' in html
    print(f"  Checks: </body> count={body_count}, css/main.css count={css_count}, noindex={noindex}")
    if 'wp-content' in html:
        remaining = [line.strip() for line in html.split('\n') if 'wp-content' in line][:5]
        print(f"  WARNING: Remaining wp-content refs: {remaining}")
    if 'googletagmanager' in html.lower():
        print("  WARNING: googletagmanager still present!")
    if 'GTM-' in html:
        print("  WARNING: GTM- still present!")


BASE = '/home/admin/.openclaw/workspace-web/makeitship-onesourceprocess'

process_html(
    os.path.join(BASE, 'raw/home.html'),
    os.path.join(BASE, 'docs/index.html'),
    'home'
)
process_html(
    os.path.join(BASE, 'raw/partner-program.html'),
    os.path.join(BASE, 'docs/partner-program.html'),
    'partner-program'
)

print("\nDone!")
