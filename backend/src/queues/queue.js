
let Queue, IORedis;
try {
  Queue = require("bullmq").Queue;
  IORedis = require("ioredis");
} catch {}

const enabled = !!process.env.REDIS_URL && Queue && IORedis;
const connection = enabled ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : null;

const queues = enabled ? {
  emails: new Queue("emails", { connection }),
  reports: new Queue("reports", { connection }),
  webhooks: new Queue("webhooks", { connection }),
  socialPublishing: new Queue("socialPublishing", { connection }),
} : {};

async function enqueue(name, job, payload) {
  if (!enabled || !queues[name]) {
    console.log("[QUEUE MOCK]", name, job, payload);
    return { mock: true, name, job, payload };
  }
  return queues[name].add(job, payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500
  });
}

module.exports = { enabled, enqueue, queues, connection };
