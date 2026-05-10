
const express = require("express");
const { enqueue } = require("../queues/queue");
const dbx = require("../lib/db");
const router = express.Router();

router.post("/stripe", express.json({ type: "application/json" }), async (req, res) => {
  await enqueue("webhooks", "stripe.event", req.body);
  res.json({ received: true });
});

router.post("/whatsapp", async (req, res) => {
  await enqueue("webhooks", "whatsapp.event", req.body);
  res.json({ received: true });
});

router.get("/whatsapp", (req, res) => {
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;
  if (req.query["hub.verify_token"] === verify) {
    return res.send(req.query["hub.challenge"]);
  }
  res.status(403).send("Forbidden");
});

router.post("/google", async (req, res) => {
  await enqueue("webhooks", "google.event", req.body);
  res.json({ received: true });
});

module.exports = router;
