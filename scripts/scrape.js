const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Read config
const config = JSON.parse(fs.readFileSync('scrape-config.json', 'utf8'));
const { client, pages, viewport } = config;

// Ensure directories exist
['references', 'raw', 'raw/assets', 'raw/assets/css', 'raw/assets/js', 'raw/assets/images', 'raw/assets/fonts'].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
});

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);
        protocol.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

function getAssetDir(url) {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (['.css'].includes(ext)) return 'css';
    if (['.js'].includes(ext)) return 'js';
    if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) return 'fonts';
    return 'images';
}

function sanitizeFilename(url) {
    const parsed = new URL(url);
    let name = path.basename(parsed.pathname);
    if (!name || name === '/') name = 'index';
    name = name.replace(/[?#].*$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    return name;
}

async function scrapePage(page, pageConfig, browser) {
    const { name, url } = pageConfig;
    console.log(`\n=== Scraping: ${name} (${url}) ===`);

    console.log('  Navigating...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const cookieSelectors = [
        '[class*="cookie"] button[class*="accept"]',
        '[class*="cookie"] button[class*="agree"]',
        '[class*="consent"] button[class*="accept"]',
        '[id*="cookie"] button',
        'button[class*="cookie-accept"]',
        '.cookie-banner button',
        '#onetrust-accept-btn-handler',
    ];
    for (const selector of cookieSelectors) {
        try {
            const btn = await page.$(selector);
            if (btn) {
                await btn.click();
                console.log(`  Dismissed cookie banner via: ${selector}`);
                await page.waitForTimeout(1000);
                break;
            }
        } catch (e) { /* ignore */ }
    }

    console.log('  Scrolling to trigger lazy-load...');
    await page.evaluate(async () => {
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const height = document.body.scrollHeight;
        const step = window.innerHeight;
        for (let y = 0; y < height; y += step) {
            window.scrollTo(0, y);
            await delay(400);
        }
        window.scrollTo(0, 0);
        await delay(500);
    });

    console.log('  Taking screenshot...');
    await page.screenshot({
        path: `references/${name}.full.png`,
        fullPage: true
    });

    console.log('  Extracting DOM...');
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const fullHtml = '<!DOCTYPE html>\n<html' + html.substring(html.indexOf('<html') + 5);

    console.log('  Extracting asset URLs...');
    const assets = await page.evaluate(() => {
        const urls = new Set();
        const origin = window.location.origin;

        function unwrapImageUrl(src) {
            if (!src) return;
            try {
                const parsed = new URL(src, origin);
                if (parsed.pathname.match(/^\/_(?:next|vercel)\/image/)) {
                    const innerUrl = parsed.searchParams.get('url');
                    if (innerUrl) {
                        const resolved = innerUrl.startsWith('http') ? innerUrl : new URL(innerUrl, origin).href;
                        urls.add(resolved);
                    }
                }
                const ipxMatch = parsed.pathname.match(/^\/_ipx\/[^/]+\/(.+)/);
                if (ipxMatch) {
                    urls.add(new URL('/' + ipxMatch[1], origin).href);
                }
            } catch (e) { }
            if (src.startsWith('http')) urls.add(src);
            else if (src.startsWith('/') && !src.startsWith('//')) {
                try { urls.add(new URL(src, origin).href); } catch(e) {}
            }
        }

        function extractSrcset(srcset) {
            if (!srcset) return;
            srcset.split(',').forEach(entry => {
                const src = entry.trim().split(/\s+/)[0];
                if (src) unwrapImageUrl(src);
            });
        }

        document.querySelectorAll('link[rel="stylesheet"]').forEach(el => { if (el.href) urls.add(el.href); });
        document.querySelectorAll('img').forEach(el => {
            unwrapImageUrl(el.src);
            ['data-src', 'data-lazy-src', 'data-original', 'data-lazy'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) unwrapImageUrl(val);
            });
            extractSrcset(el.getAttribute('srcset'));
            extractSrcset(el.getAttribute('data-srcset'));
        });
        document.querySelectorAll('picture source').forEach(el => {
            extractSrcset(el.getAttribute('srcset'));
        });
        document.querySelectorAll('video[poster]').forEach(el => { unwrapImageUrl(el.poster); });
        document.querySelectorAll('script[src]').forEach(el => { if (el.src) urls.add(el.src); });
        document.querySelectorAll('section, div, header, main, footer, nav, aside').forEach(el => {
            const bg = getComputedStyle(el).backgroundImage;
            const matches = bg.matchAll(/url\(["']?(.*?)["']?\)/g);
            for (const match of matches) {
                if (match[1] && !match[1].startsWith('data:')) {
                    const bgUrl = match[1].startsWith('http') ? match[1] : new URL(match[1], origin).href;
                    urls.add(bgUrl);
                }
            }
        });
        document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]').forEach(el => { if (el.href) urls.add(el.href); });

        return [...urls].filter(u => u.startsWith('http'));
    });

    fs.writeFileSync(`raw/${name}-assets.json`, JSON.stringify(assets, null, 2));
    console.log(`  Found ${assets.length} assets`);

    const urlToLocalPath = {};
    let downloadCount = 0;
    for (const assetUrl of assets) {
        try {
            const dir = getAssetDir(assetUrl);
            const filename = sanitizeFilename(assetUrl);
            const localPath = `raw/assets/${dir}/${filename}`;
            if (!fs.existsSync(localPath)) {
                await downloadFile(assetUrl, localPath);
                downloadCount++;
            }
            urlToLocalPath[assetUrl] = `assets/${dir}/${filename}`;
        } catch (err) {
            console.log(`  WARNING: Failed to download ${assetUrl}: ${err.message}`);
        }
    }
    console.log(`  Downloaded ${downloadCount} new assets`);

    console.log('  Scanning CSS for additional assets...');
    const cssDir = 'raw/assets/css';
    if (fs.existsSync(cssDir)) {
        for (const cssFile of fs.readdirSync(cssDir).filter(f => f.endsWith('.css'))) {
            const css = fs.readFileSync(path.join(cssDir, cssFile), 'utf8');
            const urlMatches = [...css.matchAll(/url\(["']?([^"')]+?)["']?\)/g)];
            for (const match of urlMatches) {
                let assetUrl = match[1];
                if (assetUrl.startsWith('data:')) continue;
                if (!assetUrl.startsWith('http')) {
                    try { assetUrl = new URL(assetUrl, url).href; } catch (e) { continue; }
                }
                if (urlToLocalPath[assetUrl]) continue;
                try {
                    const dir = getAssetDir(assetUrl);
                    const filename = sanitizeFilename(assetUrl);
                    const localPath = `raw/assets/${dir}/${filename}`;
                    if (!fs.existsSync(localPath)) {
                        await downloadFile(assetUrl, localPath);
                        downloadCount++;
                        console.log(`    CSS asset: ${filename}`);
                    }
                    urlToLocalPath[assetUrl] = `assets/${dir}/${filename}`;
                } catch (err) { }
            }
        }
    }

    let rewrittenHtml = fullHtml;

    rewrittenHtml = rewrittenHtml.replace(
        /\/_(?:next|vercel)\/image\?url=([^&"]+)(?:&amp;[^"]*|&[^"]*)?/g,
        (match, encodedUrl) => {
            const decodedUrl = decodeURIComponent(encodedUrl);
            const fullInnerUrl = decodedUrl.startsWith('http') ? decodedUrl : new URL(decodedUrl, url).href;
            if (urlToLocalPath[fullInnerUrl]) return urlToLocalPath[fullInnerUrl];
            const filename = sanitizeFilename(fullInnerUrl);
            const dir = getAssetDir(fullInnerUrl);
            return `assets/${dir}/${filename}`;
        }
    );

    const sortedUrls = Object.entries(urlToLocalPath).sort(([a], [b]) => b.length - a.length);
    for (const [originalUrl, localPath] of sortedUrls) {
        const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        rewrittenHtml = rewrittenHtml.replace(new RegExp(escaped, 'g'), localPath);
    }

    rewrittenHtml = rewrittenHtml.replace(/(assets\/(?:images|css|js|fonts)\/[^"?\s]+)\?[^"'\s)]+/g, '$1');

    fs.writeFileSync(`raw/${name}.html`, rewrittenHtml);
    console.log(`  Saved raw/${name}.html (${(rewrittenHtml.length / 1024).toFixed(0)}KB)`);
}

async function main() {
    console.log(`Starting scrape for: ${client}`);
    console.log(`Pages to scrape: ${pages.length}`);

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: viewport || { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    for (const pageConfig of pages) {
        try {
            await scrapePage(page, pageConfig, browser);
        } catch (err) {
            console.error(`\nERROR scraping ${pageConfig.name}: ${err.message}`);
            console.error('Continuing with next page...');
        }
    }

    await browser.close();
    console.log('\n=== Scraping complete ===');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
