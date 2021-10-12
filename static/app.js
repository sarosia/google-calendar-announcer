import e from './e.js';

async function boardcast() {
  const text = e('text').value;
  e('boardcast').disabled = true;
  e('boardcast').innerHTML = 'Boardcasting...';
  await fetch(`/boardcast?text=${text}`);
  e('boardcast').innerHTML = 'Boardcast';
  e('boardcast').disabled = false;
}

function formatEventDateTime(event) {
  const date = event.startTime.toLocaleDateString();
  const startTime = event.startTime.toLocaleTimeString();
  const endTime = event.endTime.toLocaleTimeString();

  return `${date} ${startTime} - ${endTime}`;
}

async function loadEvents() {
  const res = await fetch('events');
  const json = await res.json();
  e(
    'upcoming',
    {},
    json
      .map((event) => ({
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        name: event.name,
      }))
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 10)
      .map((event) => [
        'tr',
        {},
        [
          ['td', {}, formatEventDateTime(event)],
          ['td', {}, event.name],
        ],
      ])
  );
}

window.onload = async function () {
  e('boardcast').onclick = boardcast;
  await loadEvents();
};
