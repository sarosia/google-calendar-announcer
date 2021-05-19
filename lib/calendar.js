const {google} = require('googleapis');
const calendar = google.calendar('v3');
const DateTime = require('./datetime');
const HeapSet = require('heapset');
const Event = require('./event.js');

function once(func) {
  let called = false;
  let ret;
  return async function() {
    if (called) {
      return ret;
    }
    called = true;
    ret = await func();
    return ret;
  };
}

const initGoogleAuth = once(async () => {
  const auth = new google.auth.GoogleAuth({
    'scopes': ['https://www.googleapis.com/auth/calendar'],
  });
  const authClient = await auth.getClient();
  google.options({'auth': authClient});
});

class Calendar {
  #announceBefore = null

  constructor(calendarId, announceBefore) {
    this.calendarId = calendarId;
    this.#announceBefore = announceBefore;
    this.events = new HeapSet(
        (a, b) => a.getStartTime() - b.getStartTime(),
        (e) => e.getId());
  }

  getId() {
    return this.calendarId;
  }

  async fetch() {
    await initGoogleAuth();
    const res = await calendar.events.list({
      'timeMin': DateTime.now().toString(),
      'calendarId': this.calendarId,
      'singleEvents': true,
      'maxResults': 100,
      'orderBy': 'startTime',
    });
    for (const item of res.data.items) {
      const startTime = new DateTime(item.start.dateTime);
      const endTime = new DateTime(item.end.dateTime);
      const event = new Event(
          item.id, startTime, endTime, item.summary, item.description);
      this.addEvent(event);
    }
  }

  getAllEvents() {
    return this.events.toArray();
  }

  addEvent(event) {
    if (event.getStartTime().sub(this.#announceBefore) > DateTime.now()) {
      this.events.push(event);
    }
  }

  popApproachingEvent() {
    if (this.events.empty()) {
      return null;
    }
    const startTime = this.events.peek().getStartTime();
    if (startTime.sub(this.#announceBefore) > DateTime.now()) {
      return null;
    }
    return this.events.pop();
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
