
class Metrics {
  constructor() {
    this.counters = {}
  }

  increment(name) {
    this.counters[name] = (this.counters[name] || 0) + 1
  }

  getAll() {
    return this.counters
  }

  toPrometheusText() {
    const lines = []
    for (const [key, value] of Object.entries(this.counters)) {
      const metricName = `mmos_${key.replace(/[^a-zA-Z0-9_]/g, '_')}`
      lines.push(`# HELP ${metricName} MMOS metric`)
      lines.push(`# TYPE ${metricName} counter`)
      lines.push(`${metricName} ${value}`)
    }
    return lines.join('\n') + (lines.length ? '\n' : '')
  }
}

module.exports = new Metrics()
