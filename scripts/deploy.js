const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

function readEnv() {
    const env = {};
    const lines = fs.readFileSync('/home/admin/.openclaw/.env', 'utf8').split('\n');
    for (const line of lines) {
        const m = line.match(/^(WEB_GITHUB\w+)=(.+)$/);
        if (m) env[m[1]] = m[2].trim();
    }
    return env;
}

function base64url(buf) {
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJWT(appId, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const payload = base64url(Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })));
    const signing = `${header}.${payload}`;
    const sig = base64url(crypto.createSign('RSA-SHA256').update(signing).sign(privateKey));
    return `${signing}.${sig}`;
}

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function main() {
    const env = readEnv();
    const privateKey = Buffer.from(env.WEB_GITHUB_PRIVATE_KEY_B64, 'base64').toString('utf8');
    const jwt = makeJWT(env.WEB_GITHUB_APP_ID, privateKey);

    console.log('Getting installation token...');
    const tokenResp = await request({
        hostname: 'api.github.com',
        path: `/app/installations/${env.WEB_GITHUB_INSTALLATION_ID}/access_tokens`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'openclaw-deploy' }
    });
    const token = JSON.parse(tokenResp.body).token;
    console.log('Token obtained.');

    // git push
    execSync(`git add -A && git commit -m "Remove duplicate robots meta tag" || true`, { stdio: 'inherit' });
    execSync(`git remote set-url origin "https://x-access-token:${token}@github.com/Halo-Lab-Demos/makeitship-onesourceprocess.git"`, { stdio: 'inherit' });
    execSync(`git push origin main`, { stdio: 'inherit' });
    console.log('Pushed OK');
}

main().catch(e => { console.error(e); process.exit(1); });
