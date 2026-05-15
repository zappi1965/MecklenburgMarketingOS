
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
}

module.exports = new Metrics()
