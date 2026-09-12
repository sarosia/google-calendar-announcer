class Event {
  constructor(
    id,
    startTime,
    endTime,
    name,
    description,
    calendarId = null,
    calendarName = null
  ) {
    this.id = id;
    this.startTime = startTime;
    this.endTime = endTime;
    this.name = name;
    this.description = description;
    this.calendarId = calendarId;
    this.calendarName = calendarName || calendarId;
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

  getCalendarId() {
    return this.calendarId;
  }

  getCalendarName() {
    return this.calendarName;
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
      calendarId: this.calendarId,
      calendarName: this.calendarName,
    };
  }
}

module.exports = Event;
