require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const app = express();
const DEV_MODE = process.env.DEV_MODE === 'true';

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
    clientWilayaPairPrices: {}
};

// --- MONGODB CONNECTION (skip in DEV_MODE) ---
let AccessKey, AppData, Backup;

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

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    if (DEV_MODE) {
        console.log(`⚡ Open http://localhost:${PORT} — Use any key to login`);
    }
});