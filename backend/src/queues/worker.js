
require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const logger = require("../lib/logger");

if (!process.env.REDIS_URL) {
  console.log("REDIS_URL fehlt. Worker läuft im Mock-Modus nicht.");
  process.exit(0);
}

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

function worker(name, handler) {
  return new Worker(name, async job => {
    logger.info({ queue: name, job: job.name, data: job.data }, "Job gestartet");
    return handler(job);
  }, { connection });
}

worker("emails", async job => {
  console.log("E-Mail Job:", job.data);
});

worker("reports", async job => {
  console.log("Report Job:", job.data);
});

worker("webhooks", async job => {
  console.log("Webhook Job:", job.data);
});

worker("socialPublishing", async job => {
  console.log("Social Publishing Job:", job.data);
});

console.log("Enterprise Worker gestartet");
