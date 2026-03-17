const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cnf = require(path.join(__dirname, '..', 'Config.js'));

const STORE_FILE = path.join(__dirname, '..', 'loginStore.json');

// Load dari file saat server start
let loginStore = {};
if (fs.existsSync(STORE_FILE)) {
    try {
        loginStore = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    } catch {
        loginStore = {};
    }
}

function saveStore() {
    fs.writeFileSync(STORE_FILE, JSON.stringify(loginStore, null, 2), 'utf8');
}

module.exports = (app) => {
    app.all('/player/login/dashboard', (req, res) => {
        res.render('growtopia/DashboardView', { cnf });
    });

    app.all('/player/growid/login/validate', (req, res) => {
        const data = decodeURIComponent(req.query.data || '');
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');

        if (isIOS && data) {
            let sessionId = req.cookies?.iosSession;

            // Buat sessionId baru kalau belum ada
            if (!sessionId) {
                sessionId = crypto.randomBytes(32).toString('hex');
                res.cookie('iosSession', sessionId, {
                    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 tahun
                    httpOnly: true
                });
            }

            // Simpan/update token berdasarkan sessionId unik
            loginStore[sessionId] = data;
            saveStore();
        }

        res.send(`{"status":"success","message":"Account Validated.","token":"${data}","url":"","accountType":"growtopia"}`);
    });

    // STEP 1: REDIRECT
    app.all('/player/growid/checktoken', (req, res) => {
        res.redirect(307, '/player/growid/validate/checktoken');
    });

    // STEP 2: VALIDATE TOKEN
    app.all('/player/growid/validate/checktoken', (req, res) => {
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');

        let refreshToken = '';

        if (isIOS) {
            const sessionId = req.cookies?.iosSession;
            if (sessionId) {
                refreshToken = loginStore[sessionId] || '';
            }
        } else {
            refreshToken =
                req.body?.refreshToken ||
                req.query?.refreshToken ||
                '';
        }

        refreshToken = String(refreshToken)
            .replace(/ /g, '+')
            .replace(/\n/g, '');

        res.send(`{
            "status":"success",
            "message":"Token is valid.",
            "token":"${refreshToken}",
            "url":"",
            "accountType":"growtopia"
        }`);
    });
};
