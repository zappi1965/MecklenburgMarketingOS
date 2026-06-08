
class Logger {
  info(message, payload = {}) {
    console.log(JSON.stringify({ level: 'info', message, payload, ts: new Date().toISOString() }))
  }

  warn(message, payload = {}) {
    console.warn(JSON.stringify({ level: 'warn', message, payload, ts: new Date().toISOString() }))
  }

  error(message, payload = {}) {
    console.error(JSON.stringify({ level: 'error', message, payload, ts: new Date().toISOString() }))
  }
}

module.exports = new Logger()
