require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const crypto = require('crypto');

const app = express();
const DEV_MODE = (process.env.DEV_MODE || '').trim() === 'true';

// --- CONFIGURATION ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// --- DEV MODE: In-Memory Storage ---
let devStore = {
    clients: [],
    invoices: [],
    settings: {},
    invoiceCounter: 1,
    clientWilayaPairPrices: {},
    shareLinks: []
};

// --- MONGODB CONNECTION (skip in DEV_MODE) ---
let AccessKey, AppData, Backup, ShareLink;

if (DEV_MODE) {
    console.log("⚡ DEV MODE ENABLED — No MongoDB required. Using in-memory storage.");
    console.log("⚡ Any access key will work. Data resets on server restart.");
} else {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ FATAL ERROR: MONGO_URI is missing.");
        console.error("   - LOCALLY: Check your .env file.");
        console.error("   - ONLINE: Check Render Environment Variables.");
        process.exit(1);
    }

    mongoose.connect(mongoUri)
        .then(() => console.log("✅ Connected to MongoDB"))
        .catch(err => console.error("❌ MongoDB Connection Error:", err));

    // --- DATA SCHEMAS ---
    const keySchema = new mongoose.Schema({ 
        key: String, 
        active: { type: Boolean, default: true } 
    });
    AccessKey = mongoose.model('AccessKey', keySchema);

    const dataSchema = new mongoose.Schema({
        accessKey: String,
        clients: { type: Array, default: [] },
        invoices: { type: Array, default: [] },
        settings: { type: Object, default: {} },
        invoiceCounter: { type: Number, default: 1 },
        clientWilayaPairPrices: { type: Object, default: {} },
        lastUpdated: { type: Date, default: Date.now }
    });
    AppData = mongoose.model('AppData', dataSchema);

    const backupSchema = new mongoose.Schema({
        date: Date,
        dataSnapshot: Array
    });
    Backup = mongoose.model('Backup', backupSchema);

    const shareLinkSchema = new mongoose.Schema({
        token: { type: String, unique: true, required: true },
        accessKey: String,
        password: String, // bcrypt or plain (we'll use plain for simplicity)
        expiresAt: Date,
        createdAt: { type: Date, default: Date.now },
        label: String,
        accessCount: { type: Number, default: 0 },
        lastAccessedAt: Date,
        lastIP: String,
        lastDevice: String,
        accessLog: [{
            at: { type: Date, default: Date.now },
            ip: String,
            device: String,
            os: String,
            browser: String,
            summary: String
        }]
    });
    ShareLink = mongoose.model('ShareLink', shareLinkSchema);

    // --- AUTOMATIC BACKUP ROBOT ---
    cron.schedule('0 0 * * *', async () => {
        console.log("🤖 Starting Automatic Daily Backup...");
        try {
            const allData = await AppData.find({});
            if (allData.length > 0) {
                await Backup.create({ date: new Date(), dataSnapshot: allData });
                console.log("✅ Daily Backup Saved!");
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                await Backup.deleteMany({ date: { $lt: thirtyDaysAgo } });
            }
        } catch (err) {
            console.error("❌ Auto-Backup Failed:", err);
        }
    });
}

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        if (DEV_MODE) {
            // Accept any key in dev mode
            return res.json({ success: true });
        }

        const { key } = req.body;
        const validKey = await AccessKey.findOne({ key: key, active: true });
        
        if (validKey) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Clé invalide" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. LOAD DATA
app.get('/api/data/:key', async (req, res) => {
    try {
        if (DEV_MODE) {
            return res.json(devStore);
        }

        const { key } = req.params;
        const validKey = await AccessKey.findOne({ key: key, active: true });
        if (!validKey) return res.status(403).json({ error: "Access Revoked" });

        let data = await AppData.findOne({ accessKey: key });
        if (!data) return res.json({});
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. SAVE DATA
app.post('/api/data', async (req, res) => {
    try {
        const { key, clients, invoices, settings, invoiceCounter, clientWilayaPairPrices } = req.body;
        
        if (DEV_MODE) {
            // Save to in-memory store
            devStore = { clients, invoices, settings, invoiceCounter, clientWilayaPairPrices };
            return res.json({ success: true });
        }

        const validKey = await AccessKey.findOne({ key: key, active: true });
        if (!validKey) return res.status(403).json({ error: "Access Revoked" });

        await AppData.findOneAndUpdate(
            { accessKey: key },
            { 
                accessKey: key, 
                clients, 
                invoices, 
                settings, 
                invoiceCounter, 
                clientWilayaPairPrices, 
                lastUpdated: new Date() 
            },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- BACKUP & RESTORE ROUTES ---

app.get('/api/force-backup', async (req, res) => {
    if (DEV_MODE) return res.json({ message: "⚡ Dev mode — backups disabled" });
    try {
        const allData = await AppData.find({});
        if (allData.length > 0) {
            await Backup.create({ date: new Date(), dataSnapshot: allData });
            res.json({ message: "✅ Backup forced successfully!" });
        } else {
            res.json({ message: "⚠️ Database empty, nothing to backup." });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/backups', async (req, res) => {
    if (DEV_MODE) return res.json([]);
    try {
        const backups = await Backup.find({}, 'date').sort({ date: -1 });
        res.json(backups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/restore/:id', async (req, res) => {
    if (DEV_MODE) return res.json({ success: false, message: "Dev mode — restore disabled" });
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ error: "Backup not found" });

        console.log(`♻️ Restoring backup from: ${backup.date}`);
        const snapshot = backup.dataSnapshot;

        for (const record of snapshot) {
            await AppData.findOneAndUpdate(
                { accessKey: record.accessKey },
                record,
                { upsert: true }
            );
        }
        res.json({ success: true, message: "System restored successfully!", date: backup.date });
    } catch (e) {
        console.error("Restore Error:", e);
        res.status(500).json({ error: "Restore failed" });
    }
});

// --- SHARE LINKS ROUTES ---

app.post('/api/share-links', async (req, res) => {
    try {
        const { key, password, expiresAt, label } = req.body;
        const token = crypto.randomBytes(32).toString('hex');
        
        if (DEV_MODE) {
            devStore.shareLinks.push({ token, accessKey: key, password, expiresAt, label, createdAt: new Date(), accessCount: 0, lastAccessedAt: null, lastIP: null, accessLog: [] });
            return res.json({ success: true, token, link: `/shared/${token}` });
        }

        await ShareLink.create({ token, accessKey: key, password, expiresAt, label });
        res.json({ success: true, token, link: `/shared/${token}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/share-links/:key', async (req, res) => {
    try {
        const { key } = req.params;
        if (DEV_MODE) {
            return res.json(devStore.shareLinks.filter(link => link.accessKey === key));
        }
        
        const links = await ShareLink.find({ accessKey: key });
        res.json(links);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/share-links/:token', async (req, res) => {
    try {
        const { token } = req.params;
        if (DEV_MODE) {
            devStore.shareLinks = devStore.shareLinks.filter(link => link.token !== token);
            return res.json({ success: true });
        }
        
        await ShareLink.deleteOne({ token });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/share-links/:token/extend', async (req, res) => {
    try {
        const { token } = req.params;
        const { expiresAt } = req.body;
        
        if (DEV_MODE) {
            const link = devStore.shareLinks.find(l => l.token === token);
            if (link) link.expiresAt = expiresAt;
            return res.json({ success: true });
        }

        await ShareLink.updateOne({ token }, { expiresAt });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function parseDeviceInfo(userAgent) {
    if (!userAgent) return { type: '💻 PC', os: 'Inconnu', browser: 'Inconnu', summary: 'Appareil Inconnu' };
    const ua = userAgent.toLowerCase();
    
    let os = 'Système inconnu';
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone')) os = 'iOS (iPhone)';
    else if (ua.includes('ipad')) os = 'iPadOS';
    else if (ua.includes('linux')) os = 'Linux';

    let type = '💻 PC / Ordinateur';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) type = '📱 Smartphone';
    else if (ua.includes('ipad') || ua.includes('tablet')) type = '📱 Tablette';

    let browser = 'Inconnu';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome/')) browser = 'Chrome';
    else if (ua.includes('firefox/')) browser = 'Firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
    else if (ua.includes('opr/') || ua.includes('opera/')) browser = 'Opera';

    return {
        type,
        os,
        browser,
        summary: `${type} • ${os} (${browser})`
    };
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress || req.ip || 'Inconnu';
}

app.get('/api/share-links/:token/visitors', async (req, res) => {
    try {
        const { token } = req.params;
        let link;
        if (DEV_MODE) {
            link = devStore.shareLinks.find(l => l.token === token);
        } else {
            link = await ShareLink.findOne({ token });
        }

        if (!link) return res.status(404).json({ error: 'Lien introuvable' });

        res.json({
            token: link.token,
            label: link.label || 'Tableau de Bord',
            accessCount: link.accessCount || 0,
            lastAccessedAt: link.lastAccessedAt,
            lastIP: link.lastIP,
            lastDevice: link.lastDevice || 'Appareil inconnu',
            visitors: (link.accessLog || []).slice(-100).reverse()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/shared/track/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const clientIp = getClientIp(req);
        const devInfo = parseDeviceInfo(req.headers['user-agent']);
        const logEntry = {
            at: new Date(),
            ip: clientIp,
            device: devInfo.type,
            os: devInfo.os,
            browser: devInfo.browser,
            summary: devInfo.summary
        };

        if (DEV_MODE) {
            const sl = devStore.shareLinks.find(l => l.token === token);
            if (sl) {
                sl.accessCount = (sl.accessCount || 0) + 1;
                sl.lastAccessedAt = new Date();
                sl.lastIP = clientIp;
                sl.lastDevice = devInfo.summary;
                if (!sl.accessLog) sl.accessLog = [];
                sl.accessLog.push(logEntry);
            }
        } else {
            await ShareLink.updateOne({ token }, {
                $inc: { accessCount: 1 },
                $set: { lastAccessedAt: new Date(), lastIP: clientIp, lastDevice: devInfo.summary },
                $push: { accessLog: logEntry }
            });
        }
        res.json({ success: true, ip: clientIp, device: devInfo.summary });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/shared/auth', async (req, res) => {
    try {
        const { token, password } = req.body;
        let link;
        
        if (DEV_MODE) {
            link = devStore.shareLinks.find(l => l.token === token);
        } else {
            link = await ShareLink.findOne({ token });
        }

        if (!link) return res.status(404).json({ error: 'Lien invalide ou expiré' });
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Lien expiré' });
        }
        if (link.password && link.password !== password) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        let data;
        if (DEV_MODE) {
            data = devStore;
        } else {
            data = await AppData.findOne({ accessKey: link.accessKey });
            if (!data) {
                data = await AppData.findOne({});
            }
        }

        if (!data) {
            data = { clients: [], invoices: [], settings: {} };
        }
        
        // Track rich access info
        const clientIp = getClientIp(req);
        const devInfo = parseDeviceInfo(req.headers['user-agent']);
        const logEntry = {
            at: new Date(),
            ip: clientIp,
            device: devInfo.type,
            os: devInfo.os,
            browser: devInfo.browser,
            summary: devInfo.summary
        };

        if (DEV_MODE) {
            const sl = devStore.shareLinks.find(l => l.token === token);
            if (sl) {
                sl.accessCount = (sl.accessCount || 0) + 1;
                sl.lastAccessedAt = new Date();
                sl.lastIP = clientIp;
                sl.lastDevice = devInfo.summary;
                if (!sl.accessLog) sl.accessLog = [];
                sl.accessLog.push(logEntry);
            }
        } else {
            await ShareLink.updateOne({ token }, {
                $inc: { accessCount: 1 },
                $set: { lastAccessedAt: new Date(), lastIP: clientIp, lastDevice: devInfo.summary },
                $push: { accessLog: logEntry }
            });
        }

        res.json({
            success: true,
            data: {
                clients: data.clients || [],
                invoices: data.invoices || [],
                settings: data.settings || {},
                linkInfo: {
                    label: link.label || '',
                    expiresAt: link.expiresAt || null,
                    createdAt: link.createdAt || null
                }
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/share-links/:token/password', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (DEV_MODE) {
            const link = devStore.shareLinks.find(l => l.token === token);
            if (link) { link.password = password; return res.json({ success: true }); }
            return res.status(404).json({ error: 'Not found' });
        }
        await ShareLink.updateOne({ token }, { $set: { password } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/shared/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        let link;
        
        if (DEV_MODE) {
            link = devStore.shareLinks.find(l => l.token === token);
        } else {
            link = await ShareLink.findOne({ token });
        }

        if (!link) return res.json({ valid: false });
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            return res.json({ valid: false, expired: true, label: link.label, expiresAt: link.expiresAt });
        }

        res.json({ valid: true, label: link.label, expiresAt: link.expiresAt });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/shared/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shared-dashboard.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    if (DEV_MODE) {
        console.log(`⚡ Open http://localhost:${PORT} — Use any key to login`);
    }
});