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
    try {
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
            await redis.set(`ios:${sessionId}`, data, { ex: 365 * 24 * 60 * 60 });
        }

        res.send(`{"status":"success","message":"Account Validated.","token":"${data}","url":"","accountType":"growtopia"}`);
    } catch (err) {
        console.error('validate error:', err);
        res.send(`{"status":"success","message":"Account Validated.","token":"${decodeURIComponent(req.query.data || '')}","url":"","accountType":"growtopia"}`);
    }
});

app.all('/player/growid/validate/checktoken', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');

        let refreshToken = '';
        if (isIOS) {
            const sessionId = req.cookies?.iosSession;
            if (sessionId) {
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
    } catch (err) {
        console.error('checktoken error:', err);
        res.send(`{"status":"error","message":"Token check failed.","token":"","url":"","accountType":"growtopia"}`);
    }
});
};
