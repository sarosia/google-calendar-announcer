import e from './e.js';

let allEvents = [];
let searchFilter = '';
let selectedCalendar = '';
let debounceTimer = null;

const CALENDAR_COLORS = [
  'source-tag-blue',
  'source-tag-green',
  'source-tag-purple',
  'source-tag-amber',
  'source-tag-rose',
];

function getCalendarTagClass(name) {
  if (!name) return 'source-tag source-tag-default';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CALENDAR_COLORS.length;
  return `source-tag ${CALENDAR_COLORS[idx]}`;
}

function formatDate(d, includeYear = false) {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  if (includeYear) {
    options.year = 'numeric';
  }
  return d.toLocaleDateString(undefined, options);
}

function formatEventDateTime(event) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  if (isNaN(start.getTime())) {
    return `${event.startTime} - ${event.endTime}`;
  }

  const startMidnight =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0;
  const endMidnight =
    end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;

  const allDay =
    startMidnight && (endMidnight || end.getTime() === start.getTime());

  if (allDay) {
    let inclusiveEnd = new Date(end);
    if (end.getTime() > start.getTime()) {
      inclusiveEnd = new Date(end.getTime() - 1000);
    }
    const sameDay =
      start.getFullYear() === inclusiveEnd.getFullYear() &&
      start.getMonth() === inclusiveEnd.getMonth() &&
      start.getDate() === inclusiveEnd.getDate();

    if (sameDay) {
      return formatDate(start);
    }
    const diffYears = start.getFullYear() !== inclusiveEnd.getFullYear();
    return `${formatDate(start, diffYears)} - ${formatDate(
      inclusiveEnd,
      diffYears
    )}`;
  }

  const dateStr = formatDate(start);
  const startTimeStr = start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTimeStr = !isNaN(end.getTime())
    ? end.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
  }
  return `${dateStr} ${startTimeStr} - ${formatDate(end)} ${endTimeStr}`;
}

function updateCalendarSelect(events) {
  const select = document.getElementById('calendar-select');
  if (!select) return;

  const currentVal = select.value;
  const calendarMap = new Map();

  events.forEach((evt) => {
    const key = evt.calendarId || evt.calendarName;
    if (key && !calendarMap.has(key)) {
      calendarMap.set(key, evt.calendarName || evt.calendarId);
    }
  });

  const options = [['option', { value: '' }, 'All Calendars']];
  for (const [key, label] of calendarMap.entries()) {
    options.push(['option', { value: key }, label]);
  }

  e('calendar-select', {}, options);
  if (calendarMap.has(currentVal)) {
    select.value = currentVal;
    selectedCalendar = currentVal;
  } else {
    select.value = '';
    selectedCalendar = '';
  }
}

function renderEvents() {
  const filtered = allEvents.filter((evt) => {
    if (selectedCalendar) {
      const calKey = evt.calendarId || evt.calendarName;
      if (calKey !== selectedCalendar) return false;
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = evt.name && evt.name.toLowerCase().includes(q);
      const matchDesc =
        evt.description && evt.description.toLowerCase().includes(q);
      const matchCal =
        (evt.calendarName && evt.calendarName.toLowerCase().includes(q)) ||
        (evt.calendarId && evt.calendarId.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchCal) return false;
    }
    return true;
  });

  const badge = document.getElementById('badge-events-count');
  if (badge) {
    badge.textContent = String(allEvents.length);
  }

  if (filtered.length === 0) {
    const msg =
      allEvents.length === 0
        ? 'No upcoming events scheduled.'
        : 'No events match the search filter.';
    e('upcoming', {}, [
      [
        'tr',
        { class: 'empty-table-row' },
        [
          [
            'td',
            {
              colspan: '3',
              class: 'uk-text-center uk-text-muted uk-padding empty-table-cell',
            },
            msg,
          ],
        ],
      ],
    ]);
    return;
  }

  const rows = filtered.map((event) => {
    const calendarDisplay =
      event.calendarName || event.calendarId || 'Calendar';
    const eventDetails = [
      ['div', { class: 'event-title' }, event.name || 'Untitled Event'],
    ];
    if (event.description) {
      eventDetails.push(['div', { class: 'event-desc' }, event.description]);
    }

    return [
      'tr',
      { class: 'event-row' },
      [
        ['td', { class: 'event-time-cell' }, formatEventDateTime(event)],
        [
          'td',
          { class: 'event-source-cell' },
          [
            [
              'span',
              {
                class: getCalendarTagClass(calendarDisplay),
                title: event.calendarId || calendarDisplay,
              },
              calendarDisplay,
            ],
          ],
        ],
        ['td', {}, eventDetails],
      ],
    ];
  });

  e('upcoming', {}, rows);
}

async function loadEvents() {
  const statusEl = document.getElementById('status-text');
  if (statusEl) {
    statusEl.textContent = 'Loading events...';
    statusEl.className = 'status-indicator';
  }

  try {
    const res = await fetch('/events');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      throw new Error(`Failed to load events: HTTP ${res.status}`);
    }
    const json = await res.json();
    allEvents = (json || [])
      .map((event) => ({
        id: event.id,
        startTime: event.startTime,
        endTime: event.endTime,
        name: event.name,
        description: event.description,
        calendarId: event.calendarId,
        calendarName: event.calendarName,
      }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    updateCalendarSelect(allEvents);
    renderEvents();

    if (statusEl) {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      statusEl.textContent = `Updated at ${now}`;
    }
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = 'Failed to load events';
      statusEl.className = 'status-indicator status-error';
    }
  }
}

async function boardcast() {
  const textarea = document.getElementById('text');
  const btn = document.getElementById('boardcast');
  const statusEl = document.getElementById('broadcast-status');
  const text = textarea ? textarea.value.trim() : '';

  if (!text) {
    if (statusEl) {
      statusEl.textContent = 'Please enter text to broadcast.';
      statusEl.className = 'status-indicator status-error';
    }
    return;
  }

  btn.disabled = true;
  btn.innerHTML =
    '<span uk-spinner="ratio: 0.6" class="uk-margin-small-right"></span>Broadcasting...';
  if (statusEl) {
    statusEl.textContent = 'Broadcasting...';
    statusEl.className = 'status-indicator';
  }

  try {
    const res = await fetch(`/boardcast?text=${encodeURIComponent(text)}`);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(errMsg || `HTTP ${res.status}`);
    }
    if (statusEl) {
      statusEl.textContent = 'Broadcast sent successfully!';
      statusEl.className = 'status-indicator status-success';
    }
    textarea.value = '';
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'status-indicator status-error';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<span uk-icon="icon: play; ratio: 0.8" class="uk-margin-small-right"></span>Broadcast';
    if (window.UIkit && window.UIkit.icon) {
      const iconEl = btn.querySelector('span[uk-icon]');
      if (iconEl) {
        window.UIkit.icon(iconEl);
      }
    }
  }
}

function handleSearchInput(evt) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchFilter = evt.target.value.trim();
    renderEvents();
  }, 150);
}

function init() {
  const broadcastBtn = document.getElementById('boardcast');
  if (broadcastBtn) {
    broadcastBtn.onclick = boardcast;
  }

  const textInput = document.getElementById('text');
  if (textInput) {
    textInput.addEventListener('keydown', (evt) => {
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter') {
        boardcast();
      }
    });
  }

  const refreshBtn = document.getElementById('refresh-events');
  if (refreshBtn) {
    refreshBtn.onclick = loadEvents;
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  const calSelect = document.getElementById('calendar-select');
  if (calSelect) {
    calSelect.addEventListener('change', (evt) => {
      selectedCalendar = evt.target.value;
      renderEvents();
    });
  }

  loadEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
