class Duration {
  #millis = 0;

  constructor(millis) {
    this.#millis = millis;
  }

  toMillis() {
    return this.#millis;
  }

  add(d) {
    return new Duration(this.#millis + d.toMillis());
  }

  substract(d) {
    return new Duration(this.#millis - d.toMillis());
  }

  compare(d) {
    return this.#millis - d.toMillis();
  }

  equals(d) {
    return this.#millis === d.toMillis();
  }

  valueOf() {
    return this.#millis;
  }

  toString() {
    let num = this.#millis;
    if (num % 1000 !== 0) {
      return `${num}ms`;
    }
    num = num / 1000;
    if (num % 60 !== 0) {
      return `${num}s`;
    }
    num = num / 60;
    if (num % 60 !== 0) {
      return `${num}m`;
    }
    num = num / 60;
    return `${num}h`;
  }
}

function parse(str) {
  const matches = str.match(/^([0-9]+)([a-z]+)$/);
  if (matches) {
    const num = parseInt(matches[1]);
    const suffix = matches[2];
    switch (suffix) {
      case 'ms':
        return new MilliSeconds(num);
      case 's':
        return new Seconds(num);
      case 'm':
        return new Minutes(num);
      case 'h':
        return new Hours(num);
    }
  }
  throw new Error(`Cannot parse "${str}" into duration.`);
}

class MilliSeconds extends Duration {
  constructor(milliSeconds) {
    super(milliSeconds);
  }
}

class Seconds extends Duration {
  constructor(seconds) {
    super(seconds * 1000);
  }
}

class Minutes extends Duration {
  constructor(minutes) {
    super(minutes * 60 * 1000);
  }
}

class Hours extends Duration {
  constructor(hours) {
    super(hours * 60 * 60 * 1000);
  }
}

const sleep = async function(duration) {
  return new Promise((resolveFunc, rejectFunc) => {
    setTimeout(resolveFunc, duration.toMillis()).unref();
  });
};

module.exports = {
  Duration,
  parse,
  MilliSeconds,
  Seconds,
  Minutes,
  Hours,
  sleep,
};
