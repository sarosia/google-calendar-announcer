const { expect } = require('chai');
const { google } = require('googleapis');
const DateTime = require('../lib/datetime');
const duration = require('../lib/duration');

// Save original objects for cleanup
const originalSleep = duration.sleep;
const originalCalendar = google.calendar;
const originalAuth = google.auth;
const originalOptions = google.options;

// Define global dynamic sleep stubbing before requiring other files
let sleepMock = null;
duration.sleep = async (d) => {
  if (sleepMock) {
    return sleepMock(d);
  }
  return originalSleep(d);
};

// Silence the logger for clean test runs
const logger = require('../lib/logger');
logger.transports.forEach((t) => {
  t.silent = true;
});

// Stub googleapis
let mockEventsList = () => {};

google.auth = {
  GoogleAuth: class {
    getClient() {
      return Promise.resolve({});
    }
  },
};
google.options = () => {};

google.calendar = (version) => {
  if (version === 'v3') {
    return {
      events: {
        list: async (params) => {
          return mockEventsList(params);
        },
      },
    };
  }
  throw new Error(`Unsupported API version: ${version}`);
};

// Stub tts.js in require.cache
const ttsPath = require.resolve('../lib/tts');
let ttsCalledWith = null;
require.cache[ttsPath] = {
  id: ttsPath,
  filename: ttsPath,
  loaded: true,
  exports: async (text) => {
    ttsCalledWith = text;
    return Buffer.from('mock-audio-content');
  },
};

// Stub castv2-promise in require.cache
const castv2Path = require.resolve('castv2-promise');
const findCalledWith = [];
const deviceCalls = {
  getVolume: 0,
  setVolume: [],
  play: [],
  close: 0,
};

require.cache[castv2Path] = {
  id: castv2Path,
  filename: castv2Path,
  loaded: true,
  exports: {
    find: async (name) => {
      findCalledWith.push(name);
      return {
        getVolume: async () => {
          deviceCalls.getVolume++;
          return 0.5;
        },
        setVolume: async (vol) => {
          deviceCalls.setVolume.push(vol);
        },
        play: async (url) => {
          deviceCalls.play.push(url);
        },
        close: async () => {
          deviceCalls.close++;
        },
      };
    },
  },
};

// Now we can require Calendar, Boardcaster, and CalendarManager
const Calendar = require('../lib/calendar');
const Boardcaster = require('../lib/boardcaster');
const CalendarManager = require('../lib/calendar_manager');

describe('Calendar Announcement Unit Tests', () => {
  let originalNow;
  let mockNowValue = null;

  before(() => {
    originalNow = DateTime.now;
    DateTime.now = () => {
      if (mockNowValue) {
        return new DateTime(mockNowValue);
      }
      return originalNow();
    };
  });

  after(() => {
    sleepMock = null;
    DateTime.now = originalNow;
    duration.sleep = originalSleep;
    google.calendar = originalCalendar;
    google.auth = originalAuth;
    google.options = originalOptions;

    // Clean up require cache
    delete require.cache[ttsPath];
    delete require.cache[castv2Path];
  });

  beforeEach(() => {
    mockNowValue = null;
    sleepMock = null;
    ttsCalledWith = null;
    findCalledWith.length = 0; // Clear the array
    deviceCalls.getVolume = 0;
    deviceCalls.setVolume = [];
    deviceCalls.play = [];
    deviceCalls.close = 0;
  });

  afterEach(() => {
    sleepMock = null;
  });

  describe('Calendar Class', () => {
    it('should fetch, filter, and pop approaching events correctly', async () => {
      // Set current time to 12:00:00 UTC
      mockNowValue = '2026-07-19T12:00:00.000Z';

      // Mock google calendar events list response
      mockEventsList = async (params) => {
        expect(params.calendarId).to.equal('test-calendar-id');
        expect(params.timeMin).to.equal('2026-07-19T12:00:00.000Z');
        return {
          data: {
            items: [
              {
                id: 'event-1',
                summary: 'Future Event A',
                description: 'Announce in 15 minutes',
                start: { dateTime: '2026-07-19T12:15:00.000Z' },
                end: { dateTime: '2026-07-19T13:00:00.000Z' },
              },
              {
                id: 'event-2',
                summary: 'Already Approaching/Past Event B',
                description:
                  'This should be filtered out by fetch because it starts in 5 minutes',
                start: { dateTime: '2026-07-19T12:05:00.000Z' },
                end: { dateTime: '2026-07-19T12:30:00.000Z' },
              },
            ],
          },
        };
      };

      const announceBefore = new duration.Minutes(10);
      const syncFrequency = new duration.Minutes(5);
      const calendar = new Calendar(
        'test-calendar-id',
        announceBefore,
        syncFrequency
      );

      // Fetch the events
      await calendar.fetch();

      // Only Event A should be kept because Event B (12:05:00) starts within the 10-minute announce window
      // relative to the fetch time (12:00:00).
      const events = calendar.getAllEvents();
      expect(events).to.have.lengthOf(1);
      expect(events[0].getId()).to.equal('event-1');
      expect(events[0].getName()).to.equal('Future Event A');

      // Since time is still 12:00:00, and Event A starts at 12:15:00,
      // the announcement time (12:05:00) has not been reached yet.
      // So popApproachingEvent should return null.
      let approaching = calendar.popApproachingEvent();
      expect(approaching).to.be.null;

      // Advance time to 12:04:00 (still not approaching)
      mockNowValue = '2026-07-19T12:04:00.000Z';
      approaching = calendar.popApproachingEvent();
      expect(approaching).to.be.null;

      // Advance time to 12:06:00 (announcement time 12:05:00 has passed)
      mockNowValue = '2026-07-19T12:06:00.000Z';
      approaching = calendar.popApproachingEvent();
      expect(approaching).to.not.be.null;
      expect(approaching.getId()).to.equal('event-1');
      expect(approaching.getName()).to.equal('Future Event A');

      // Now the calendar event list should be empty
      expect(calendar.getAllEvents()).to.have.lengthOf(0);
    });
  });

  describe('CalendarManager Class (with real Boardcaster)', () => {
    let originalStartFetch;

    before(() => {
      originalStartFetch = Calendar.prototype.startFetch;
      // Stub startFetch to run once rather than loop infinitely
      Calendar.prototype.startFetch = async function () {
        await this.fetch();
      };
    });

    after(() => {
      Calendar.prototype.startFetch = originalStartFetch;
    });

    it('should poll events and trigger the boardcaster, interacting with multiple CastClients', async () => {
      // Mock the sleep function to throw STOP_LOOP error on 1s sleep.
      // This will break the infinite loop in pollEvent() after one iteration.
      sleepMock = async (d) => {
        if (d && d.toMillis && d.toMillis() === 1000) {
          throw new Error('STOP_LOOP');
        }
        return originalSleep(d);
      };

      const mockConfig = {
        port: 8080,
        devices: ['living-room-speaker', 'kitchen-speaker'],
        calendars: [
          {
            calendarId: 'test-calendar-id',
            announceBefore: '10m',
            syncFrequency: '5m',
          },
        ],
      };

      const boardcaster = new Boardcaster(mockConfig);
      const calendarManager = new CalendarManager(mockConfig, boardcaster);

      // Mock google calendar events list response
      mockEventsList = async () => {
        return {
          data: {
            items: [
              {
                id: 'event-1',
                summary: 'Approaching Event',
                description: 'This is starting soon',
                start: { dateTime: '2026-07-19T12:08:00.000Z' },
                end: { dateTime: '2026-07-19T13:00:00.000Z' },
              },
            ],
          },
        };
      };

      // Set time to 11:55:00 UTC
      mockNowValue = '2026-07-19T11:55:00.000Z';

      // Fetch events so they are loaded into the calendar
      calendarManager.fetchCalendar();
      // Wait for asynchronous fetches to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Advance time to 11:59:00 UTC (after the 11:58:00 approach time)
      mockNowValue = '2026-07-19T11:59:00.000Z';

      // Run pollEvent, which will process the approaching event, broadcast it,
      // and then call sleep() which throws STOP_LOOP.
      try {
        await calendarManager.pollEvent();
      } catch (e) {
        expect(e.message).to.equal('STOP_LOOP');
      }

      // Verify that Boardcaster was called with the correct text
      expect(ttsCalledWith).to.equal('Approaching Event');

      // Verify that Boardcaster queried all devices in the config
      expect(findCalledWith).to.deep.equal([
        'living-room-speaker',
        'kitchen-speaker',
      ]);

      // Verify that Boardcaster controlled the device volume and played the audio for all devices
      expect(deviceCalls.getVolume).to.equal(2);
      expect(deviceCalls.setVolume).to.have.lengthOf(4);
      expect(deviceCalls.setVolume.filter((v) => v === 1)).to.have.lengthOf(2);
      expect(deviceCalls.setVolume.filter((v) => v === 0.5)).to.have.lengthOf(
        2
      );

      expect(deviceCalls.play).to.have.lengthOf(2);
      expect(deviceCalls.play[0]).to.match(
        /^http:\/\/\d+\.\d+\.\d+\.\d+:8080\/audio$/
      );
      expect(deviceCalls.play[1]).to.match(
        /^http:\/\/\d+\.\d+\.\d+\.\d+:8080\/audio$/
      );
      expect(deviceCalls.close).to.equal(2);
    });

    it('should only announce to matching target_devices if specified in calendar config', async () => {
      // Mock the sleep function to throw STOP_LOOP error on 1s sleep.
      sleepMock = async (d) => {
        if (d && d.toMillis && d.toMillis() === 1000) {
          throw new Error('STOP_LOOP');
        }
        return originalSleep(d);
      };

      const mockConfig = {
        port: 8080,
        devices: ['living-room-speaker', 'kitchen-speaker'],
        calendars: [
          {
            calendarId: 'test-calendar-id',
            announceBefore: '10m',
            syncFrequency: '5m',
            target_devices: ['kitchen-speaker'],
          },
        ],
      };

      const boardcaster = new Boardcaster(mockConfig);
      const calendarManager = new CalendarManager(mockConfig, boardcaster);

      // Mock google calendar events list response
      mockEventsList = async () => {
        return {
          data: {
            items: [
              {
                id: 'event-1',
                summary: 'Approaching Event',
                description: 'This is starting soon',
                start: { dateTime: '2026-07-19T12:08:00.000Z' },
                end: { dateTime: '2026-07-19T13:00:00.000Z' },
              },
            ],
          },
        };
      };

      // Set time to 11:55:00 UTC
      mockNowValue = '2026-07-19T11:55:00.000Z';

      // Fetch events so they are loaded into the calendar
      calendarManager.fetchCalendar();
      // Wait for asynchronous fetches to resolve
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Advance time to 11:59:00 UTC (after the 11:58:00 approach time)
      mockNowValue = '2026-07-19T11:59:00.000Z';

      // Run pollEvent
      try {
        await calendarManager.pollEvent();
      } catch (e) {
        expect(e.message).to.equal('STOP_LOOP');
      }

      // Verify that Boardcaster was called with the correct text
      expect(ttsCalledWith).to.equal('Approaching Event');

      // Verify that Boardcaster only queried kitchen-speaker (not living-room-speaker)
      expect(findCalledWith).to.deep.equal(['kitchen-speaker']);

      // Verify that Boardcaster controlled the device volume and played the audio for exactly 1 device
      expect(deviceCalls.getVolume).to.equal(1);
      expect(deviceCalls.setVolume).to.deep.equal([1, 0.5]);
      expect(deviceCalls.play).to.have.lengthOf(1);
      expect(deviceCalls.play[0]).to.match(
        /^http:\/\/\d+\.\d+\.\d+\.\d+:8080\/audio$/
      );
      expect(deviceCalls.close).to.equal(1);
    });
  });
});
