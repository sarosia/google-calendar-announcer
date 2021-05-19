class Event {
  constructor(id, startTime, endTime, name, description) {
    this.id = id;
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

  getId() {
    return this.id;
  }

  toString() {
    return `${this.startTime.toString()}: ${this.name}`;
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      startTime: this.startTime.toString(),
      endTime: this.endTime.toString(),
    };
  }
}

module.exports = Event;
