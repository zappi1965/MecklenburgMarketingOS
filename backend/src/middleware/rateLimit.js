
const buckets = new Map()

module.exports = function basicRateLimit({ windowMs = 60000, max = 240 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown'
    const now = Date.now()
    const bucket = buckets.get(key) || { count: 0, reset: now + windowMs }

    if (now > bucket.reset) {
      bucket.count = 0
      bucket.reset = now + windowMs
    }

    bucket.count += 1
    buckets.set(key, bucket)

    if (bucket.count > max) {
      return res.status(429).json({ ok: false, error: 'Zu viele Anfragen. Bitte später erneut versuchen.' })
    }

    next()
  }
}
