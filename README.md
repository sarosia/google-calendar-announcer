# google-calendar-announcer

[![Build Status][build-image]][build-url]

Make announcement on devices using Google Cast for events in Google Calendar.

## Installation

```
git clone git@github.com:sarosia/google-calendar-announcer.git
```

## Usage

Add a `.announcerrc` config under `$HOME`.

```json
{
  "port": <port>,
  "devices": [
    "<cast device 1>",
    "<cast device 2>",
    "<cast device 3>"
  ],
  "calendars": [
    {
      "announceBefore": "2m",
      "calendarId": "my.calendar.1@gmail.com"
    },
    {
      "announceBefore": "1h",
      "calendarId": "my.calendar.2@gmail.com"
    },
    {
      "announceBefore": "30s",
      "calendarId": "my.calendar.3@gmail.com"
    }
  ]
}
```

The run the following command at the git repository.

```shell
npm start
```

## License

[MIT](LICENSE)

[build-image]: https://github.com/sarosia/google-calendar-announcer/workflows/Node.js%20CI/badge.svg
[build-url]: https://github.com/sarosia/google-calendar-announcer/actions
