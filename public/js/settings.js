(function () {
  const PROFILE_KEY = 'agrobotsa_profile';
  const WEATHER_DEFAULTS_KEY = 'agrobotsa_weather_defaults';
  const ACTIVITY_KEY = 'agrobotsa_activities'; // ← confirm this matches activity.js
  

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---- Farm profile ----
  const profileForm = document.getElementById('profile-form');
  const profileStatus = document.getElementById('profile-status');
  if (profileForm) {
    const profile = load(PROFILE_KEY, {});
    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-location').value = profile.location || '';
    document.getElementById('profile-crops').value = profile.crops || '';

    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      save(PROFILE_KEY, {
        name: document.getElementById('profile-name').value.trim(),
        location: document.getElementById('profile-location').value.trim(),
        crops: document.getElementById('profile-crops').value.trim(),
      });
      profileStatus.textContent = 'Saved.';
      profileStatus.classList.add('is-success');
      setTimeout(() => {
        profileStatus.textContent = '';
        profileStatus.classList.remove('is-success');
      }, 2500);
    });
  }

  // ---- Weather defaults + units ----
  const weatherForm = document.getElementById('weather-defaults-form');
  const weatherStatus = document.getElementById('weather-defaults-status');
  if (weatherForm) {
    const defaults = load(WEATHER_DEFAULTS_KEY, { location: '', units: 'metric' });
    document.getElementById('default-location').value = defaults.location || '';
    document.getElementById('units-select').value = defaults.units || 'metric';

    weatherForm.addEventListener('submit', function (e) {
      e.preventDefault();
      save(WEATHER_DEFAULTS_KEY, {
        location: document.getElementById('default-location').value.trim(),
        units: document.getElementById('units-select').value,
      });
      weatherStatus.textContent = 'Saved. Reload Weather to apply.';
      weatherStatus.classList.add('is-success');
      setTimeout(() => {
        weatherStatus.textContent = '';
        weatherStatus.classList.remove('is-success');
      }, 3000);
    });
  }

  // ---- Data controls ----
  const exportExcelBtn = document.getElementById('export-excel-btn');
  const exportFieldReportBtn = document.getElementById('export-field-report-btn');
  const clearBtn = document.getElementById('clear-diagnose-btn');
  const dataStatus = document.getElementById('data-status');


  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
    }[character]));
  }


  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Expected a JSON response');
    return response.json();
  }

  async function getExportData() {
    const [activities, diagnoses] = await Promise.all([getJson('/api/activity'), getJson('/api/diagnose')]);
    return { activities, diagnoses };
  }

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', function () {
      window.location.assign('/api/export/field-records.xlsx');
    });
  }



  if (exportFieldReportBtn) {
    exportFieldReportBtn.addEventListener('click', async function () {
      const reportWindow = window.open('', '_blank');
      if (!reportWindow) return void (dataStatus.textContent = 'Allow pop-ups to open the printable report.');
      try {
        const { activities, diagnoses } = await getExportData();
        const profile = load(PROFILE_KEY, {});
        const activityRows = activities.length ? activities.map((item) => `<tr><td>${escapeHtml(item.activityDate)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.crop || '—')}</td><td>${escapeHtml(item.notes || '—')}</td></tr>`).join('') : '<tr><td colspan="4">No activities recorded.</td></tr>';
        const diagnosisRows = diagnoses.length ? diagnoses.map((item) => `<article>${item.photoUrl ? `<img src="${escapeHtml(new URL(item.photoUrl, window.location.origin).href)}" alt="Plant diagnosis photo">` : ''}<div><h3>${escapeHtml(item.disease)}</h3><p>${escapeHtml(new Date(item.createdAt).toLocaleDateString())} · ${Math.round((item.confidence || 0) * 100)}% confidence</p><p>${escapeHtml(item.recommendation || (item.lowConfidence ? 'Needs a closer look.' : 'No treatment guidance recorded.'))}</p></div></article>`).join('') : '<p>No diagnoses recorded.</p>';
        reportWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Agro-Botsa field report</title><style>body{font:14px Arial,sans-serif;color:#213126;max-width:900px;margin:40px auto;padding:0 28px}h1{margin:0 0 5px}h2{margin-top:38px;border-bottom:2px solid #668051;padding-bottom:8px}p{line-height:1.5}.muted{color:#647067}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd3c9;padding:9px;text-align:left;vertical-align:top}th{background:#edf2e8}article{display:flex;gap:18px;padding:16px 0;border-bottom:1px solid #d9ded7}article img{width:130px;height:100px;object-fit:cover}article h3{margin:0}article p{margin:6px 0}@media print{body{margin:0;max-width:none}article{break-inside:avoid}}</style></head><body><h1>Agro-Botsa field report</h1><p class="muted">Generated ${escapeHtml(new Date().toLocaleString())}${profile.name ? ` · ${escapeHtml(profile.name)}` : ''}${profile.location ? ` · ${escapeHtml(profile.location)}` : ''}</p><h2>Activity log</h2><table><thead><tr><th>Date</th><th>Activity</th><th>Crop</th><th>Notes</th></tr></thead><tbody>${activityRows}</tbody></table><h2>Diagnosis history</h2>${diagnosisRows}</body></html>`);
        reportWindow.document.close();
        dataStatus.textContent = 'Printable report opened in a new tab.';
      } catch (err) {
        reportWindow.close();
        dataStatus.textContent = 'Could not load records for the report. Start the app with npm start, then open http://localhost:3000.';
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', async function () {
      if (!confirm('Clear all saved diagnosis history? This cannot be undone.')) return;
      try {
        await fetch('/api/diagnose', { method: 'DELETE' });
        dataStatus.textContent = 'Diagnosis history cleared.';
      } catch (err) {
        dataStatus.textContent = 'Could not clear history right now.';
      }
    });
  }

  // ---- Connection status ----
  // Hardcoded for now — swap `live` to true once weather.js / diagnose.js
  // are actually calling real APIs with keys.
  const statusList = document.getElementById('status-list');
  if (statusList) {
    const statuses = [
      { label: 'Weather', live: false, note: 'Sample data (no API key yet)' },
      { label: 'Diagnose', live: false, note: 'Sample data (no API key yet)' },
      { label: 'Activity log', live: true, note: 'Stored on this device' },
    ];
    statusList.innerHTML = statuses.map(s => `
      <li class="status-item">
        <span class="status-dot${s.live ? '' : ' is-sample'}"></span>
        <span><strong>${s.label}:</strong> ${s.live ? 'Live' : 'Sample mode'}<small>${s.note}</small></span>
      </li>
    `).join('');
  }
})();
