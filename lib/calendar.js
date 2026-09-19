const Apper = require('@sarosia/apper');
const calendar = Apper.google.calendar('v3');
const DateTime = require('./datetime');
const Event = require('./event.js');
const { sleep } = require('./duration');

class Calendar {
  #announceBefore = null;
  #events = [];
  #syncFrequency = null;
  #targetDevices = null;
  #logger = null;
  #isRunning = true;

  constructor(
    calendarId,
    announceBefore,
    syncFrequency,
    targetDevices,
    logger = console,
    name = null
  ) {
    this.calendarId = calendarId;
    this.name = name || calendarId;
    this.#announceBefore = announceBefore;
    this.#syncFrequency = syncFrequency;
    this.#targetDevices = targetDevices;
    this.#logger = logger;
  }

  getTargetDevices() {
    return this.#targetDevices;
  }

  getId() {
    return this.calendarId;
  }

  getName() {
    return this.name;
  }

  stop() {
    this.#isRunning = false;
  }

  async startFetch() {
    while (this.#isRunning) {
      try {
        await this.fetch();
      } catch (e) {
        this.#logger.error(
          `Error when fetching calendar for "${this.getId()}".`,
          e
        );
      }
      await sleep(this.#syncFrequency);
    }
  }

  async fetch() {
    await Apper.initGoogleAuth('calendar');
    const res = await calendar.events.list({
      timeMin: DateTime.now().toString(),
      calendarId: this.calendarId,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    });
    this.#events = res.data.items
      .map((item) => {
        const startTime = new DateTime(item.start.dateTime);
        const endTime = new DateTime(item.end.dateTime);
        return new Event(
          item.id,
          startTime,
          endTime,
          item.summary,
          item.description,
          this.calendarId,
          this.name
        );
      })
      .filter((event) => {
        return event.getStartTime().sub(this.#announceBefore) > DateTime.now();
      })
      .sort((a, b) => {
        return b.getStartTime() - a.getStartTime();
      });
  }

  getAllEvents() {
    return this.#events.concat();
  }

  popApproachingEvent() {
    if (this.#events.length == 0) {
      return null;
    }
    const startTime = this.#events[this.#events.length - 1].getStartTime();
    if (startTime.sub(this.#announceBefore) > DateTime.now()) {
      return null;
    }
    return this.#events.pop();
  }

  popAllApproachingEvents() {
    const events = [];
    let event;
    while ((event = this.popApproachingEvent()) !== null) {
      events.push(event);
    }
    return events;
  }
}

module.exports = Calendar;
