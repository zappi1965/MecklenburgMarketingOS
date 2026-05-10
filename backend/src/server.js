
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const QRCode = require("qrcode");

const dbx = require("./lib/db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "please-change-this-secret";
const PORT = process.env.PORT || 4000;

// Testmodus: CORS offen, damit Vercel sicher zugreifen kann
app.use(cors({ origin: true, credentials: false }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000 }));

function ok(res, data) { res.json(data); }
function getClient(db, slug) { return db.clients.find(c => c.slug === slug); }
function filterClient(arr, clientId) { return (arr || []).filter(x => x.clientId === clientId); }

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Nicht eingeloggt" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token ungültig" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "agency_admin") return res.status(403).json({ message: "Keine Berechtigung" });
  next();
}

function requireClient(req, res, next) {
  const db = dbx.read();
  const client = getClient(db, req.params.slug);
  if (!client) return res.status(404).json({ message: "Kunde nicht gefunden", slug: req.params.slug });
  req.db = db;
  req.client = client;
  next();
}

app.get("/", (req, res) => res.send("Mecklenburg Marketing OS API läuft"));
app.get("/api/health", (req, res) => ok(res, { ok: true, name: "Mecklenburg Marketing OS", mode: "hotfix", dbPath: dbx.DB_PATH }));

app.post("/api/auth/login", (req, res) => {
  const db = dbx.read();
  const { email, password } = req.body || {};
  const user = db.users.find(u => u.email === email);

  if (!user) return res.status(401).json({ message: "User nicht gefunden" });

  let valid = false;

  if (user.passwordHash) {
    try { valid = bcrypt.compareSync(password, user.passwordHash); } catch {}
  }

  if (user.password) {
    valid = password === user.password;
  }

  if (!valid) return res.status(401).json({ message: "Passwort falsch" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  ok(res, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.get("/api/agency/stats", auth, requireAdmin, (req, res) => {
  const db = dbx.read();
  ok(res, {
    clients: db.clients.length,
    activeModules: db.clients.reduce((s, c) => s + Object.values(c.modules || {}).filter(Boolean).length, 0),
    reviews: db.reviews.length,
    leads: db.leads.length
  });
});

app.get("/api/clients", auth, requireAdmin, (req, res) => ok(res, dbx.read().clients));

app.get("/api/clients/:slug", auth, (req, res) => {
  const db = dbx.read();
  const client = getClient(db, req.params.slug);
  if (!client) return res.status(404).json({ message: "Kunde nicht gefunden" });
  ok(res, client);
});

app.post("/api/clients", auth, requireAdmin, (req, res) => {
  const db = dbx.read();
  const client = {
    id: nanoid(),
    ...req.body,
    subscriptionStatus: "trial",
    googleReviewLink: req.body.googleReviewLink || "https://google.com",
    modules: dbx.defaultModules(["reviews","crm","booking","social","portal"])
  };
  db.clients.push(client);
  dbx.write(db);
  ok(res, client);
});

app.patch("/api/clients/:id/modules", auth, requireAdmin, (req, res) => {
  const db = dbx.read();
  const client = db.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ message: "Kunde nicht gefunden" });
  client.modules = client.modules || {};
  client.modules[req.body.moduleKey] = !!req.body.enabled;
  dbx.write(db);
  ok(res, client);
});

app.get("/api/employees", auth, requireAdmin, (req, res) => ok(res, dbx.read().employees || []));

app.get("/api/public/client/:slug", (req, res) => {
  const db = dbx.read();
  const client = getClient(db, req.params.slug);
  if (!client) return res.status(404).json({ message: "Kunde nicht gefunden", available: db.clients.map(c => c.slug) });
  ok(res, { name: client.name, slug: client.slug, googleReviewLink: client.googleReviewLink || "https://google.com" });
});

app.post("/api/public/reviews", (req, res) => {
  const db = dbx.read();
  const client = getClient(db, req.body.clientSlug);
  if (!client) return res.status(404).json({ message: "Kunde nicht gefunden" });
  const review = {
    id: nanoid(),
    clientId: client.id,
    rating: req.body.rating || 3,
    name: req.body.name || "",
    phone: req.body.phone || "",
    message: req.body.message || "",
    status: (req.body.rating || 3) >= 4 ? "google_redirect" : "internal",
    createdAt: dbx.now()
  };
  db.reviews.push(review);
  dbx.write(db);
  ok(res, review);
});

app.get("/api/client/:slug/reviews", auth, requireClient, (req, res) => ok(res, filterClient(req.db.reviews, req.client.id)));
app.get("/api/client/:slug/leads", auth, requireClient, (req, res) => ok(res, filterClient(req.db.leads, req.client.id)));
app.post("/api/client/:slug/leads", auth, requireClient, (req, res) => {
  const item = { id: nanoid(), clientId: req.client.id, ...req.body, createdAt: dbx.now() };
  req.db.leads.push(item); dbx.write(req.db); ok(res, item);
});
app.delete("/api/client/:slug/leads/:id", auth, requireClient, (req, res) => {
  req.db.leads = req.db.leads.filter(x => x.id !== req.params.id); dbx.write(req.db); ok(res, { ok: true });
});

app.get("/api/client/:slug/bookings", auth, requireClient, (req, res) => ok(res, filterClient(req.db.bookings, req.client.id)));
app.post("/api/client/:slug/bookings", auth, requireClient, (req, res) => {
  const item = { id: nanoid(), clientId: req.client.id, ...req.body, status: "bestätigt", createdAt: dbx.now() };
  req.db.bookings.push(item); dbx.write(req.db); ok(res, item);
});

app.get("/api/client/:slug/social-posts", auth, requireClient, (req, res) => ok(res, filterClient(req.db.socialPosts, req.client.id)));
app.post("/api/client/:slug/social-posts", auth, requireClient, (req, res) => {
  const item = { id: nanoid(), clientId: req.client.id, status: "geplant", ...req.body, createdAt: dbx.now() };
  req.db.socialPosts.push(item); dbx.write(req.db); ok(res, item);
});
app.patch("/api/client/:slug/social-posts/:id/publish", auth, requireClient, (req, res) => {
  const item = req.db.socialPosts.find(x => x.id === req.params.id);
  if (item) item.status = "veröffentlicht";
  dbx.write(req.db); ok(res, item || { ok: true });
});

app.get("/api/client/:slug/outreach", auth, requireClient, (req, res) => ok(res, filterClient(req.db.outreach, req.client.id)));
app.post("/api/client/:slug/outreach", auth, requireClient, (req, res) => {
  const item = { id: nanoid(), clientId: req.client.id, status: "geplant", ...req.body, createdAt: dbx.now() };
  req.db.outreach.push(item); dbx.write(req.db); ok(res, item);
});

app.get("/api/client/:slug/reputation-alerts", auth, requireClient, (req, res) => ok(res, filterClient(req.db.reputationAlerts, req.client.id)));
app.patch("/api/client/:slug/reputation-alerts/:id/resolve", auth, requireClient, (req, res) => {
  const item = req.db.reputationAlerts.find(x => x.id === req.params.id);
  if (item) { item.status = "erledigt"; item.severity = "resolved"; }
  dbx.write(req.db); ok(res, item || { ok: true });
});

app.get("/api/client/:slug/reports", auth, requireClient, (req, res) => ok(res, filterClient(req.db.reports, req.client.id)));
app.post("/api/client/:slug/reports/generate", auth, requireClient, (req, res) => {
  const r = { id: nanoid(), clientId: req.client.id, title: `Monatsreport ${new Date().toLocaleDateString("de-DE")}`, summary: "Demo-Report wurde erzeugt.", status: "erstellt", createdAt: dbx.now() };
  req.db.reports.unshift(r); dbx.write(req.db); ok(res, r);
});

app.get("/api/client/:slug/qr-campaigns", auth, requireClient, (req, res) => ok(res, filterClient(req.db.qrCampaigns, req.client.id)));
app.post("/api/client/:slug/qr-campaigns", auth, requireClient, async (req, res) => {
  const targetUrl = req.body.targetUrl || "https://example.com";
  const qrDataUrl = await QRCode.toDataURL(targetUrl);
  const item = { id: nanoid(), clientId: req.client.id, scans: 0, qrDataUrl, ...req.body, targetUrl, createdAt: dbx.now() };
  req.db.qrCampaigns.push(item); dbx.write(req.db); ok(res, item);
});
app.patch("/api/client/:slug/qr-campaigns/:id/scan", auth, requireClient, (req, res) => {
  const item = req.db.qrCampaigns.find(x => x.id === req.params.id);
  if (item) item.scans = (item.scans || 0) + 1;
  dbx.write(req.db); ok(res, item || { ok: true });
});

app.get("/api/client/:slug/onboarding", auth, requireClient, (req, res) => ok(res, filterClient(req.db.onboarding, req.client.id)));
app.patch("/api/client/:slug/onboarding/:id", auth, requireClient, (req, res) => {
  const s = req.db.onboarding.find(x => x.id === req.params.id);
  if (s) s.done = !s.done;
  dbx.write(req.db); ok(res, s || { ok: true });
});

app.post("/api/client/:slug/sales-assistant", auth, requireClient, (req, res) => ok(res, { answer: `AI-Vorschlag für ${req.client.name}: ${req.body.prompt || ""}\n\nEmpfohlen: Growth Paket für 299€/Monat + Setup.` }));

app.get("/api/client/:slug/proposals", auth, requireClient, (req, res) => ok(res, filterClient(req.db.proposals, req.client.id)));
app.post("/api/client/:slug/proposals", auth, requireClient, (req, res) => {
  const p = { id: nanoid(), clientId: req.client.id, status: "Entwurf", ...req.body, createdAt: dbx.now() };
  req.db.proposals.unshift(p); dbx.write(req.db); ok(res, p);
});
app.patch("/api/client/:slug/proposals/:id/status", auth, requireClient, (req, res) => {
  const p = req.db.proposals.find(x => x.id === req.params.id);
  if (p) p.status = req.body.status;
  dbx.write(req.db); ok(res, p || { ok: true });
});

app.listen(PORT, () => console.log(`Mecklenburg Marketing OS Hotfix API läuft auf Port ${PORT}`));
