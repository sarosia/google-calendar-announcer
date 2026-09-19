const Calendar = require('./calendar');
const { Seconds, parse, sleep } = require('./duration');

class CalendarManager {
  #calendars = [];
  #boardcaster = null;
  #logger = null;
  #isRunning = true;

  constructor(config, boardcaster, logger = console) {
    this.#logger = logger;
    for (const calendarConfig of config.calendars) {
      this.#logger.info(
        `Adding calendar "${calendarConfig.calendarId}" from config.`
      );
      const calendar = new Calendar(
        calendarConfig.calendarId,
        parse(calendarConfig.announceBefore),
        parse(calendarConfig.syncFrequency),
        calendarConfig.target_devices,
        this.#logger,
        calendarConfig.name
      );
      this.#calendars.push(calendar);
    }
    this.#boardcaster = boardcaster;
  }

  start() {
    this.fetchCalendar();
    this.pollEvent();
  }

  stop() {
    this.#isRunning = false;
    for (const calendar of this.#calendars) {
      calendar.stop();
    }
  }

  getAllEvents() {
    const events = [];
    for (const calendar of this.#calendars) {
      events.push(calendar.getAllEvents());
    }
    return events.flat();
  }

  async pollEvent() {
    while (this.#isRunning) {
      for (const calendar of this.#calendars) {
        const events = calendar.popAllApproachingEvents();
        for (const event of events) {
          try {
            this.#logger.info('Events to be annonced:', event);
            await this.#boardcaster.boardcast(
              event.getName(),
              calendar.getTargetDevices()
            );
          } catch (e) {
            this.#logger.error('Error when boardcasting event.', e);
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
