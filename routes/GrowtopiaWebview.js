const path = require('path');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');
const cnf = require(path.join(__dirname, '..', 'Config.js'));

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = (app) => {
    app.all('/player/login/dashboard', (req, res) => {
        res.render('growtopia/DashboardView', { cnf });
    });

    app.all('/player/growid/login/validate', async (req, res) => {
        const data = decodeURIComponent(req.query.data || '');
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');

        if (isIOS && data) {
            let sessionId = req.cookies?.iosSession;
            if (!sessionId) {
                sessionId = crypto.randomBytes(32).toString('hex');
                res.cookie('iosSession', sessionId, {
                    maxAge: 365 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                });
            }
            // Simpan ke Upstash Redis, expire 1 tahun
            await redis.set(`ios:${sessionId}`, data, { ex: 365 * 24 * 60 * 60 });
        }

        res.send(`{"status":"success","message":"Account Validated.","token":"${data}","url":"","accountType":"growtopia"}`);
    });

    // STEP 1: REDIRECT
    app.all('/player/growid/checktoken', (req, res) => {
        res.redirect(307, '/player/growid/validate/checktoken');
    });

    // STEP 2: VALIDATE TOKEN
    app.all('/player/growid/validate/checktoken', async (req, res) => {
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');

        let refreshToken = '';
        if (isIOS) {
            const sessionId = req.cookies?.iosSession;
            if (sessionId) {
                // Baca dari Upstash Redis
                refreshToken = (await redis.get(`ios:${sessionId}`)) || '';
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
