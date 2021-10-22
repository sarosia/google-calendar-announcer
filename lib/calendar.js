const { google } = require('googleapis');
const calendar = google.calendar('v3');
const DateTime = require('./datetime');
const Event = require('./event.js');
const { sleep } = require('./duration');
const logger = require('./logger');

function once(func) {
  let called = false;
  let ret;
  return function () {
    if (called) {
      return ret;
    }
    called = true;
    ret = func();
    return ret;
  };
}

const initGoogleAuth = once(async () => {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const authClient = await auth.getClient();
  google.options({
    auth: authClient,
  });
});

class Calendar {
  #announceBefore = null;
  #events = [];
  #syncFrequency = null;

  constructor(calendarId, announceBefore, syncFrequency) {
    this.calendarId = calendarId;
    this.#announceBefore = announceBefore;
    this.#syncFrequency = syncFrequency;
  }

  getId() {
    return this.calendarId;
  }

  async startFetch() {
    while (true) {
      try {
        await this.fetch();
      } catch (e) {
        logger.error(`Error when fetching calendar for "${this.getId()}".`, e);
      }
      await sleep(this.#syncFrequency);
    }
  }

  async fetch() {
    await initGoogleAuth();
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
          item.description
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
