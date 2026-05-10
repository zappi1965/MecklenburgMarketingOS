
const { nanoid } = require("nanoid");
const dbx = require("./db");

function audit(action, metadata = {}) {
  return (req, res, next) => {
    const oldJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const db = dbx.read();
        db.auditLogs = db.auditLogs || [];
        db.auditLogs.push({
          id: nanoid(),
          actorUserId: req.user?.id || null,
          clientId: req.client?.id || req.body?.clientId || null,
          action,
          metadata: {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ...metadata
          },
          createdAt: new Date().toISOString()
        });
        dbx.write(db);
      } catch (_) {}
      return oldJson(body);
    };
    next();
  };
}

module.exports = { audit };
