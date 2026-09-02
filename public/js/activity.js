document.getElementById('activity-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const type = document.getElementById('activity-type').value;
  const notes = document.getElementById('activity-notes').value;

  await fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, notes }),
  });

  document.getElementById('activity-notes').value = '';
  window.loadActivities();
});

window.loadActivities = async function loadActivities() {
  const list = document.getElementById('activity-list');
  try {
    const res = await fetch('/api/activity');
    const items = await res.json();
    list.innerHTML = items
      .map(
        (item) =>
          `<li>${item.type}${item.notes ? ' — ' + item.notes : ''} <small>(${new Date(item.createdAt).toLocaleDateString()})</small></li>`
      )
      .join('');
  } catch (err) {
    list.innerHTML = '<li>Could not load activity log.</li>';
  }
};
