function renderWeather(data) {
  const el = document.getElementById('weather-result');
  const tempDisplay =
    data.temperature !== null && data.temperature !== undefined
      ? `${Math.round(data.temperature)}°C`
      : '--';

  el.innerHTML = `
    <div class="weather-display">
      <div class="weather-temp">${tempDisplay}</div>
      <div class="weather-condition">${data.condition}${data.location ? ' · ' + data.location : ''}</div>
      ${data.placeholder ? '<div class="weather-note">Sample data — live forecast connecting soon</div>' : ''}
    </div>
  `;
  localStorage.setItem('agroWeatherContext', JSON.stringify({ temperature: data.temperature !== null && data.temperature !== undefined ? Math.round(data.temperature) : null, condition: data.condition, location: data.location }));
}

async function fetchWeatherByCoords(lat, lon) {
  const el = document.getElementById('weather-result');
  el.textContent = 'Loading weather…';
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    el.textContent = 'Could not load weather right now.';
  }
}

function showManualLocationFallback() {
  document.getElementById('weather-result').textContent = '';
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
  resultEl.textContent = 'Looking up location…';

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
    resultEl.textContent = 'Could not look up that location right now.';
  }
});