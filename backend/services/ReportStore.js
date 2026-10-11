/**
 * ReportStore — bounded in-memory list of chat reports.
 *
 * Oldest reports are dropped once `maxStored` is exceeded. Nothing is
 * persisted: this only gives an operator something to look at (and tests
 * something to assert on) until a real moderation backend exists.
 */

const config = require('../config');

class ReportStore {
  constructor(maxStored = config.reports.maxStored) {
    this.maxStored = Math.max(1, maxStored);
    /** @type {object[]} */
    this.items = [];
  }

  /** Append a report, dropping the oldest ones beyond the bound */
  add(report) {
    this.items.push(report);
    if (this.items.length > this.maxStored) {
      this.items.splice(0, this.items.length - this.maxStored);
    }
    return report;
  }

  /** The most recent `limit` reports, oldest first */
  recent(limit = 20) {
    return this.items.slice(-limit);
  }

  get size() {
    return this.items.length;
  }
}

module.exports = ReportStore;
