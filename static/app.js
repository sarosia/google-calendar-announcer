function $(id) {
  return document.getElementById(id);
}

async function boardcast() {
  const text = $('text').value;
  $('boardcast').disabled = true;
  $('boardcast').innerHTML = 'Boardcasting...';
  await fetch(`/boardcast?text=${text}`);
  $('boardcast').innerHTML = 'Boardcast';
  $('boardcast').disabled = false;
}

async function loadEvents() {
  const res = await fetch('events');
  const json = await res.json();
  $('upcoming').innerHTML = '';
  json.map((event) => ({
    'startTime': new Date(event.startTime),
    'endTime': new Date(event.endTime),
    'name': event.name,
  })).sort((a, b) => a.startTime - b.startTime).
      slice(0, 10).
      forEach((event) => {
        const p = document.createElement('tr');
        // eslint-disable-next-line max-len
        p.innerHTML = `<td>${event.startTime.toLocaleDateString()} ${event.startTime.toLocaleTimeString()} - ${event.endTime.toLocaleTimeString()}</td><td>${event.name}</td>`;
        $('upcoming').appendChild(p);
      });
}

window.onload = async function() {
  $('boardcast').onclick = boardcast;
  await loadEvents();
};
