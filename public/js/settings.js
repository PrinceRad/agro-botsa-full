(function () {
  const PROFILE_KEY = 'agrobotsa_profile';
  const WEATHER_DEFAULTS_KEY = 'agrobotsa_weather_defaults';
  const ACTIVITY_KEY = 'agrobotsa_activities'; // ← confirm this matches activity.js
  const DIAGNOSE_KEY = 'agrobotsa_diagnoses';  // ← confirm this matches diagnose.js

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
  const exportBtn = document.getElementById('export-activity-btn');
  const clearBtn = document.getElementById('clear-diagnose-btn');
  const dataStatus = document.getElementById('data-status');

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const activities = load(ACTIVITY_KEY, []);
      if (!activities.length) {
        dataStatus.textContent = 'No activity entries to export yet.';
        return;
      }
      const headers = Object.keys(activities[0]);
      const rows = activities.map(a =>
        headers.map(h => JSON.stringify(a[h] ?? '')).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agro-botsa-activity-log.csv';
      a.click();
      URL.revokeObjectURL(url);
      dataStatus.textContent = 'Exported.';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (!confirm('Clear all saved diagnosis history? This cannot be undone.')) return;
      localStorage.removeItem(DIAGNOSE_KEY);
      dataStatus.textContent = 'Diagnosis history cleared.';
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