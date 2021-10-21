const Calendar = require('./calendar');
const logger = require('./logger');
const { Seconds, parse, sleep } = require('./duration');

class CalendarManager {
  #calendars = [];
  #boardcaster = null;

  constructor(config, boardcaster) {
    for (const calendarConfig of config.calendars) {
      logger.info(
        `Adding calendar "${calendarConfig.calendarId}" from config.`
      );
      const calendar = new Calendar(
        calendarConfig.calendarId,
        parse(calendarConfig.announceBefore),
        parse(calendarConfig.syncFrequency)
      );
      this.#calendars.push(calendar);
    }
    this.#boardcaster = boardcaster;
  }

  start() {
    this.fetchCalendar();
    this.pollEvent();
  }

  getAllEvents() {
    const events = [];
    for (const calendar of this.#calendars) {
      events.push(calendar.getAllEvents());
    }
    return events.flat();
  }

  async pollEvent() {
    while (true) {
      for (const calendar of this.#calendars) {
        const events = calendar.popAllApproachingEvents();
        for (const event of events) {
          try {
            logger.info('Events to be annonced:', event);
            await this.#boardcaster.boardcast(event.getName());
          } catch (e) {
            logger.error('Error when boardcasting event.', e);
          }
        }
      }
      await sleep(new Seconds(1));
    }
  }

  fetchCalendar() {
    for (const calendar of this.#calendars) {
      calendar.startFetch();
    }
  }
}

module.exports = CalendarManager;
