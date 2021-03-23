class Event {
  constructor(startTime, endTime, name, description) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.name = name;
    this.description = description;
  }

  getName() {
    return this.name;
  }

  getDescription() {
    return this.description;
  }

  getStartTime() {
    return this.startTime;
  }

  getEndTime() {
    return this.endTime;
  }

  toString() {
    return `${this.startTime.toString()}: ${this.name}`;
  }

  toJson() {
    return {
      name: this.name,
      description: this.description,
      startTime: this.startTime.toString(),
      endTime: this.endTime.toString(),
    };
  }
}

module.exports = Event;
