const Boardcaster = require('./boardcaster');
const config = require('rc')('announcer', {});
const CalendarManager = require('./calendar_manager');
const express = require('express');
const logger = require('./logger');
const path = require('path');
const serveStatic = require('serve-static');

const { port } = config;
const app = express();
app.use(express.json());

const boardcaster = new Boardcaster(config);
const calendarManager = new CalendarManager(config, boardcaster);

app.get('/audio', (req, res) => {
  const audio = boardcaster.getAudio();
  if (audio != null) {
    res.send(audio);
  }
});

app.get('/boardcast', async (req, res, next) => {
  if (!req.query.text) {
    return res.status(500).send(`Invalid text input: "${req.query.text}".`);
  }
  try {
    await boardcaster.boardcast(req.query.text);
  } catch (e) {
    return res.status(500).send(e.message);
  }
  res.send('OK');
});

app.get('/events', (req, res) => {
  res.send(
    calendarManager.getAllEvents().map((event) => {
      return event.toJson();
    })
  );
});

app.use(serveStatic(path.resolve(`${__dirname}/../static`)));
app.use(
  serveStatic(path.resolve(`${__dirname}/../node_modules/@sarosia/e/src`))
);
app.use(serveStatic(path.resolve(`${__dirname}/../node_modules/uikit/dist`)));

module.exports = function () {
  app.listen(port);
  logger.info(`Application started at ${port}`);
  calendarManager.start();
};
