require('dotenv').config(); // 1. Loads .env file locally, ignores it on Render
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const app = express();

// --- CONFIGURATION ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allows big data (logos/images)
app.use(express.static('public')); // Serves your HTML/CSS/JS files

// --- MONGODB CONNECTION ---
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

// 1. Access Key (Password)
const keySchema = new mongoose.Schema({ 
    key: String, 
    active: { type: Boolean, default: true } 
});
const AccessKey = mongoose.model('AccessKey', keySchema);

// 2. App Data (Invoices, Clients, Settings)
const dataSchema = new mongoose.Schema({
    accessKey: String,
    clients: { type: Array, default: [] },
    invoices: { type: Array, default: [] },
    settings: { type: Object, default: {} },
    invoiceCounter: { type: Number, default: 1 },
    clientWilayaPairPrices: { type: Object, default: {} },
    lastUpdated: { type: Date, default: Date.now }
});
const AppData = mongoose.model('AppData', dataSchema);

// 3. Backups (Snapshots)
const backupSchema = new mongoose.Schema({
    date: Date,
    dataSnapshot: Array
});
const Backup = mongoose.model('Backup', backupSchema);

// --- 🤖 AUTOMATIC BACKUP ROBOT ---
// Runs every day at midnight (00:00) server time
cron.schedule('0 0 * * *', async () => {
    console.log("🤖 Starting Automatic Daily Backup...");
    try {
        const allData = await AppData.find({});
        if (allData.length > 0) {
            await Backup.create({ date: new Date(), dataSnapshot: allData });
            console.log("✅ Daily Backup Saved!");

            // Cleanup: Keep only last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            await Backup.deleteMany({ date: { $lt: thirtyDaysAgo } });
        }
    } catch (err) {
        console.error("❌ Auto-Backup Failed:", err);
    }
});

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
    try {
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
        const { key } = req.params;
        const validKey = await AccessKey.findOne({ key: key, active: true });
        
        // Security: If key was deleted from DB, deny access immediately
        if (!validKey) return res.status(403).json({ error: "Access Revoked" });

        let data = await AppData.findOne({ accessKey: key });
        if (!data) return res.json({}); // Return empty object for new users
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. SAVE DATA
app.post('/api/data', async (req, res) => {
    try {
        const { key, clients, invoices, settings, invoiceCounter, clientWilayaPairPrices } = req.body;
        
        // Security Check
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

// 4. Force Manual Backup (via URL or button)
app.get('/api/force-backup', async (req, res) => {
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

// 5. List Backups (for Recovery Page)
app.get('/api/backups', async (req, res) => {
    try {
        const backups = await Backup.find({}, 'date').sort({ date: -1 }); // Newest first
        res.json(backups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Restore a Backup
app.post('/api/restore/:id', async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id);
        if (!backup) return res.status(404).json({ error: "Backup not found" });

        console.log(`♻️ Restoring backup from: ${backup.date}`);
        const snapshot = backup.dataSnapshot;

        // Restore loop
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
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));