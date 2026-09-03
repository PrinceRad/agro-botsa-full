const activityForm = document.getElementById('activity-form');
const activityType = document.getElementById('activity-type');
const activityNotes = document.getElementById('activity-notes');
const activityDate = document.getElementById('activity-date');
const activityCrop = document.getElementById('activity-crop');
const activitySubmit = activityForm.querySelector('button[type="submit"]');
const activityCancelEdit = document.getElementById('activity-cancel-edit');
const activityStatus = document.getElementById('activity-form-status');
const activityList = document.getElementById('activity-list');
const activityContext = document.getElementById('activity-context');
const activityFilter = document.getElementById('activity-filter');
const activitySummary = document.getElementById('activity-summary');
let editingActivityId = null;
let activities = [];

const activityLabels = {
  watered: 'Watered',
  sprayed: 'Sprayed',
  planted: 'Planted',
  harvested: 'Harvested',
  other: 'Other',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[character]));
}

function setFormStatus(message, state = '') {
  activityStatus.textContent = message;
  activityStatus.className = `activity-form-status ${state}`;
}

function resetActivityForm() {
  editingActivityId = null;
  activityForm.reset();
  activityDate.value = getToday();
  activitySubmit.textContent = 'Save activity';
  activityCancelEdit.classList.add('hidden');
  setFormStatus('');
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

activityDate.value = getToday();

function renderWeatherContext() {
  try {
    const weather = JSON.parse(localStorage.getItem('agroWeatherContext'));
    if (!weather) return;
    activityContext.textContent = `Recent weather: ${weather.temperature ?? '--'}°C · ${weather.condition || 'conditions'}${weather.location ? ` · ${weather.location}` : ''}`;
    activityContext.classList.remove('hidden');
  } catch (err) {
    localStorage.removeItem('agroWeatherContext');
  }
}

function renderActivityList() {
  const filtered = activityFilter.value === 'all' ? activities : activities.filter((item) => item.type === activityFilter.value);
  activitySummary.textContent = `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`;
  activityList.innerHTML = filtered.length ? filtered.map((item) => `
    <li>
      <span class="activity-entry-icon" aria-hidden="true">${escapeHtml((activityLabels[item.type] || 'Other').charAt(0))}</span>
      <span class="activity-entry-content">
        <strong>${escapeHtml(activityLabels[item.type] || item.type)}</strong>
        ${item.crop ? `<span>${escapeHtml(item.crop)}</span>` : ''}
        ${item.notes ? `<span>${escapeHtml(item.notes)}</span>` : ''}
        <small>${new Date(item.activityDate || item.createdAt).toLocaleDateString()}</small>
      </span>
      <span class="activity-entry-actions">
        <button type="button" class="activity-edit" data-edit-activity="${encodeURIComponent(item.id)}" data-activity-type="${encodeURIComponent(item.type)}" data-activity-notes="${encodeURIComponent(item.notes)}" data-activity-date="${escapeHtml(item.activityDate || '')}" data-activity-crop="${encodeURIComponent(item.crop || '')}">Edit</button>
        <button type="button" class="activity-delete" data-delete-activity="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(activityLabels[item.type] || 'activity')}">Delete</button>
      </span>
    </li>
  `).join('') : `<li class="activity-list-state">${activityFilter.value === 'all' ? 'No activity yet. Your saved field notes will appear here.' : 'No activity matches this filter.'}</li>`;
}

window.prefillActivity = function prefillActivity({ type = 'other', notes = '', crop = '' } = {}) {
  activityType.value = type;
  activityNotes.value = notes;
  activityCrop.value = crop;
  document.getElementById('screen-activity').scrollIntoView({ behavior: 'smooth' });
  activityNotes.focus();
};

activityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  activitySubmit.disabled = true;
  setFormStatus('Saving activity...');

  try {
    const wasEditing = Boolean(editingActivityId);
    const res = await fetch(editingActivityId ? `/api/activity/${encodeURIComponent(editingActivityId)}` : '/api/activity', {
      method: editingActivityId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activityType.value, notes: activityNotes.value.trim(), activityDate: activityDate.value, crop: activityCrop.value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save activity');

    resetActivityForm();
    setFormStatus(wasEditing ? 'Activity updated.' : 'Activity saved.', 'is-success');
    await window.loadActivities();
  } catch (err) {
    setFormStatus('Could not save activity. Try again.', 'is-error');
  } finally {
    activitySubmit.disabled = false;
  }
});

activityCancelEdit.addEventListener('click', resetActivityForm);
activityFilter.addEventListener('change', renderActivityList);

activityList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-activity]');
  if (editButton) {
    editingActivityId = decodeURIComponent(editButton.dataset.editActivity);
    activityType.value = decodeURIComponent(editButton.dataset.activityType);
    activityNotes.value = decodeURIComponent(editButton.dataset.activityNotes);
    activityDate.value = editButton.dataset.activityDate || getToday();
    activityCrop.value = decodeURIComponent(editButton.dataset.activityCrop || '');
    activitySubmit.textContent = 'Update activity';
    activityCancelEdit.classList.remove('hidden');
    setFormStatus('Editing this activity.');
    activityType.focus();
    return;
  }

  const deleteButton = event.target.closest('[data-delete-activity]');
  if (!deleteButton) return;

  deleteButton.disabled = true;
  try {
    const res = await fetch(`/api/activity/${encodeURIComponent(deleteButton.dataset.deleteActivity)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not delete activity');
    await window.loadActivities();
  } catch (err) {
    deleteButton.disabled = false;
    setFormStatus('Could not delete activity. Try again.', 'is-error');
  }
});

window.loadActivities = async function loadActivities() {
  activityList.innerHTML = '<li class="activity-list-state">Loading your activity...</li>';
  try {
    const res = await fetch('/api/activity');
    if (!res.ok) throw new Error('Could not load activity');
    activities = (await res.json()).slice().sort((a, b) => new Date(b.activityDate || b.createdAt) - new Date(a.activityDate || a.createdAt));
    renderWeatherContext();
    renderActivityList();
  } catch (err) {
    activityList.innerHTML = '<li class="activity-list-state is-error">Could not load activity log right now.</li>';
  }
};

renderWeatherContext();
