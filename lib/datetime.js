const {Duration} = require('./duration');

class DateTime {
  #epoch = 0

  static now() {
    return new DateTime();
  }

  constructor(value) {
    const epoch = value !== undefined ?
      new Date(value).getTime() : new Date().getTime();
    this.#epoch = epoch;
  }

  add(value) {
    if (value instanceof Duration) {
      return new DateTime(this + value);
    }
    throw new Error(`Cannot add a ${value.constructor.name} to a DateTime.`);
  }

  sub(value) {
    if (value instanceof Duration) {
      return new DateTime(this - value);
    }
    if (value instanceof DateTime) {
      return new Duration(this - value);
    }
    throw new Error(
        `Cannot substract a ${value.constructor.name} from a DateTime.`);
  }

  toDate() {
    return new Date(this.#epoch);
  }

  valueOf() {
    return this.#epoch;
  }

  toString() {
    return this.toDate().toISOString();
  }
}

module.exports = DateTime;
