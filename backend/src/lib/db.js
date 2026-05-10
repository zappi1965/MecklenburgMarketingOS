
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function defaultDb() {
  return {
    users: [],
    employees: [],
    clients: [],
    reviews: [],
    leads: [],
    bookings: [],
    socialPosts: [],
    outreach: [],
    reputationAlerts: [],
    reports: [],
    qrCampaigns: [],
    onboarding: [],
    proposals: [],
    auditLogs: []
  };
}

function ensure() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb(), null, 2));
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function write(db) {
  ensure();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function now() {
  return new Date().toISOString();
}

const allModules = ["reviews","crm","booking","chatbot","whatsapp","seo","analytics","invoices","websites","automations","outreach","reputation","reports","qr","onboarding","sales-assistant","proposals","suite","social","portal"];

function defaultModules(enabled = []) {
  return Object.fromEntries(allModules.map(m => [m, enabled.includes(m)]));
}

module.exports = { read, write, now, allModules, defaultModules, DB_PATH };
