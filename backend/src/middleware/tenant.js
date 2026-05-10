
const dbx = require("../lib/db");

function requireTenant(req, res, next) {
  const db = dbx.read();
  const client = db.clients.find(c => c.slug === req.params.slug);
  if (!client) return res.status(404).json({ message: "Mandant/Kunde nicht gefunden" });

  req.db = db;
  req.client = client;
  req.tenantId = client.id;

  // Optional future hardening:
  // agency_admin can access all
  // client_admin/staff only when assigned to this tenant
  next();
}

function requireModule(moduleKey) {
  return (req, res, next) => {
    if (!req.client?.modules?.[moduleKey]) {
      return res.status(403).json({ message: `Modul ${moduleKey} ist nicht freigeschaltet` });
    }
    next();
  };
}

module.exports = { requireTenant, requireModule };
