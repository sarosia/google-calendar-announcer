const path = require('path');
const Apper = require('@sarosia/apper');
const Boardcaster = require('./boardcaster');
const CalendarManager = require('./calendar_manager');

const app = new Apper(
  'announcer',
  (ctx) => {
    ctx.boardcaster = new Boardcaster(ctx.config, ctx.logger);
    ctx.calendarManager = new CalendarManager(
      ctx.config,
      ctx.boardcaster,
      ctx.logger
    );
  },
  {
    port: 8080,
    appName: 'Google Calendar Announcer',
    devices: [],
    calendars: [],
    staticPaths: [
      path.resolve(`${__dirname}/../static`),
      path.resolve(`${__dirname}/../node_modules/@sarosia/e/src`),
    ],
    auth: {
      enabled: true,
      cookieName: 'announcer_session',
      allowedEmails: [],
      publicRoutes: ['/audio'],
    },
  }
);

app.onStart((ctx) => {
  ctx.calendarManager.start();
});

app.get('/audio', (ctx, req, res) => {
  const audio = ctx.boardcaster ? ctx.boardcaster.getAudio() : null;
  if (audio != null) {
    res.send(audio);
  } else {
    res.status(404).send('No audio available.');
  }
});

app.get('/boardcast', async (ctx, req, res) => {
  if (!req.query.text) {
    return res.status(500).send(`Invalid text input: "${req.query.text}".`);
  }
  try {
    await ctx.boardcaster.boardcast(req.query.text);
  } catch (e) {
    return res.status(500).send(e.message);
  }
  res.send('OK');
});

app.get('/events', (ctx, req, res) => {
  res.send(
    ctx.calendarManager
      ? ctx.calendarManager.getAllEvents().map((event) => {
          return event.toJson();
        })
      : []
  );
});

module.exports = function () {
  app.start();
};
module.exports.app = app;
