
const express = require("express");
const multer = require("multer");
const path = require("path");
const { nanoid } = require("nanoid");
const { auth, requireAdmin } = require("../middleware/auth");
const { enqueue } = require("../queues/queue");
const { providerStatus } = require("../providers/enterpriseProviders");
const { createCheckoutSession } = require("../billing/stripe");
const { saveLocalFile, getStorageStatus, LOCAL_UPLOAD_DIR } = require("../storage/storage");
const dbx = require("../lib/db");

const router = express.Router();

const upload = multer({
  dest: LOCAL_UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/status", auth, requireAdmin, async (req, res) => {
  res.json({
    providers: await providerStatus(),
    storage: await getStorageStatus(),
    queue: { redisConfigured: !!process.env.REDIS_URL },
    mode: process.env.DB_MODE || "json"
  });
});

router.get("/audit-logs", auth, requireAdmin, (req, res) => {
  const db = dbx.read();
  res.json((db.auditLogs || []).slice(-200).reverse());
});

router.post("/billing/checkout", auth, requireAdmin, async (req, res) => {
  const session = await createCheckoutSession({
    plan: req.body.plan || "growth",
    clientId: req.body.clientId
  });
  res.json(session);
});

router.post("/jobs/:queue", auth, requireAdmin, async (req, res) => {
  const job = await enqueue(req.params.queue, req.body.job || "manual", req.body.payload || {});
  res.json(job);
});

router.post("/files/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });
  const saved = await saveLocalFile(req.file);
  const db = dbx.read();
  db.files = db.files || [];
  db.files.push({
    id: nanoid(),
    ...saved,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    createdAt: new Date().toISOString()
  });
  dbx.write(db);
  res.json(saved);
});

router.get("/files", auth, (req, res) => {
  const db = dbx.read();
  res.json(db.files || []);
});

module.exports = router;
