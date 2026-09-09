function getLoadingHTML() {
  return `
    <div class="weather-card loading">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton skeleton-temp"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="weather-details-grid">
        <div class="skeleton skeleton-detail"></div>
        <div class="skeleton skeleton-detail"></div>
      </div>
    </div>
  `;
}

const ADVISORY_ICONS = {
  good: '✓',
  wind: '💨',
  rain: '🌧',
  heat: '☀',
  humidity: '💧'
};

function renderWeather(data) {
  const el = document.getElementById('weather-result');
  const tempDisplay =
    data.temperature !== null && data.temperature !== undefined
      ? `${Math.round(data.temperature)}°`
      : '--';

  const iconUrl = data.icon ? `https://openweathermap.org/img/wn/${data.icon}@4x.png` : '';
  const humidityDisplay = data.humidity !== null && data.humidity !== undefined ? `${data.humidity}%` : '--';
  const windDisplay =
    data.windSpeedKmh !== null && data.windSpeedKmh !== undefined
      ? `${Math.round(data.windSpeedKmh)} km/h`
      : '--';

  const advisory = data.farmAdvice;
  const advisoryHTML = advisory
    ? `
      <div class="weather-advisory is-${advisory.severity}">
        <span class="weather-advisory-icon">${ADVISORY_ICONS[advisory.severity] || 'ℹ'}</span>
        <span>${advisory.message}</span>
      </div>`
    : '';

  el.innerHTML = `
    <div class="weather-card">
      <div class="weather-main">
        ${iconUrl ? `<img src="${iconUrl}" alt="${data.condition}" class="weather-icon" />` : '<div class="weather-icon-placeholder"></div>'}
        <div class="weather-temp-container">
          <span class="weather-temp">${tempDisplay}</span>
          <span class="weather-unit">C</span>
        </div>
        <div class="weather-condition">${data.condition}</div>
        <div class="weather-location">
          <svg class="location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          ${data.location || 'Unknown Location'}
        </div>
      </div>

      <div class="weather-details-grid">
        <div class="weather-detail-item">
          <span class="detail-label">Humidity</span>
          <span class="detail-value">${humidityDisplay}</span>
        </div>
        <div class="weather-detail-item">
          <span class="detail-label">Wind</span>
          <span class="detail-value">${windDisplay}</span>
        </div>
      </div>

      ${advisoryHTML}

      ${data.placeholder ? '<div class="weather-note">Sample data — live forecast connecting soon</div>' : ''}
    </div>
  `;

  localStorage.setItem('agroWeatherContext', JSON.stringify({
    temperature: data.temperature !== null && data.temperature !== undefined ? Math.round(data.temperature) : null,
    condition: data.condition,
    location: data.location,
    advisory: advisory ? advisory.message : null
  }));
}

async function fetchWeatherByCoords(lat, lon) {
  const el = document.getElementById('weather-result');
  el.innerHTML = getLoadingHTML();
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    el.innerHTML = '<div class="weather-error">Could not load weather right now.</div>';
  }
}

function showManualLocationFallback() {
  document.getElementById('weather-result').innerHTML = '';
  document.getElementById('weather-manual-fallback').classList.remove('hidden');
}

window.loadWeather = function loadWeather() {
  document.getElementById('weather-manual-fallback').classList.add('hidden');

  if (!navigator.geolocation) {
    showManualLocationFallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
    () => showManualLocationFallback()
  );
};

document.getElementById('manual-location-submit').addEventListener('click', async () => {
  const place = document.getElementById('manual-location-input').value.trim();
  if (!place) return;

  const resultEl = document.getElementById('weather-result');
  document.getElementById('weather-manual-fallback').classList.add('hidden');
  resultEl.innerHTML = getLoadingHTML();

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`
    );
    const geoData = await geoRes.json();
    const match = geoData.results?.[0];

    if (!match) {
      resultEl.textContent = `Couldn't find "${place}". Try a nearby town or city name.`;
      return;
    }

    fetchWeatherByCoords(match.latitude, match.longitude);
  } catch (err) {
    resultEl.innerHTML = '<div class="weather-error">Could not look up that location right now.</div>';
    document.getElementById('weather-manual-fallback').classList.remove('hidden');
  }
});