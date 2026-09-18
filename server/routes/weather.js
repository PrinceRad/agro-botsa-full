import express from 'express';

const router = express.Router();
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const WEATHER_REQUEST_TIMEOUT_MS = 8000;
const weatherCache = new Map();

function buildFarmAdvice({ condition, temperature, humidity, windSpeedKmh }) {
  const conditionText = (condition || '').toLowerCase();

  if (conditionText.includes('rain') || conditionText.includes('drizzle') || conditionText.includes('thunderstorm')) {
    return { severity: 'rain', message: 'Rain likely — hold off watering, and avoid spraying, it will wash off.' };
  }

  if (windSpeedKmh !== null && windSpeedKmh >= 20) {
    return { severity: 'wind', message: 'Wind is too strong for spraying today — treatment will drift or blow off target.' };
  }

  if (temperature !== null && temperature >= 32) {
    return { severity: 'heat', message: 'High heat — water early morning or evening, and check crops for wilting.' };
  }

  if (humidity !== null && humidity >= 80 && temperature !== null && temperature >= 20) {
    return { severity: 'humidity', message: 'Humid and warm — good conditions for fungal disease, keep an eye on leaves.' };
  }

  return { severity: 'good', message: 'Calm, dry conditions — good day for spraying or general fieldwork.' };
}

// GET /api/weather?lat=..&lon=..
// Proxies OpenWeatherMap so the API key never reaches the browser.
router.get('/', async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query params are required' });
  }

  if (!apiKey) {
    // Graceful placeholder response so the frontend/demo doesn't break
    // if a key hasn't been configured yet.
    const placeholderData = {
      condition: 'Partly cloudy',
      temperature: 24,
      humidity: 45,
      windSpeedKmh: 12,
      icon: '02d'
    };
    return res.status(200).json({
      placeholder: true,
      message: 'OPENWEATHER_API_KEY not set on the server — showing placeholder weather data.',
      ...placeholderData,
      farmAdvice: buildFarmAdvice(placeholderData)
    });
  }

  try {
    // Nearby coordinates represent the same locality; grouping them makes
    // repeat visits fast without serving stale data for long.
    const cacheKey = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: 'Weather provider error', details: errorBody });
    }
    const data = await response.json();

    const condition = data.weather?.[0]?.description ?? 'Unknown';
    const temperature = data.main?.temp ?? null;
    const humidity = data.main?.humidity ?? null;
    // OpenWeatherMap returns wind speed in m/s under units=metric — convert to km/h.
    const windSpeedKmh = data.wind?.speed !== undefined ? Math.round(data.wind.speed * 3.6 * 10) / 10 : null;

    const weatherPayload = { condition, temperature, humidity, windSpeedKmh };

    const weatherResponse = {
      placeholder: false,
      location: data.name ?? null,
      icon: data.weather?.[0]?.icon ?? null,
      ...weatherPayload,
      farmAdvice: buildFarmAdvice(weatherPayload)
    };
    weatherCache.set(cacheKey, { data: weatherResponse, savedAt: Date.now() });

    return res.json(weatherResponse);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Weather provider timed out. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to fetch weather', details: err.message });
  }
});
// GET /api/weather/forecast?lat=..&lon=..
// Proxies OpenWeatherMap's 5-day/3-hour forecast, collapsed into one
// summary per day so the frontend can show a short "next few days" strip.
router.get('/forecast', async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query params are required' });
  }

  if (!apiKey) {
    const placeholderDays = [
      { date: addDays(0), condition: 'Partly cloudy', tempMax: 26, tempMin: 15, windSpeedKmh: 12, icon: '02d' },
      { date: addDays(1), condition: 'Light rain', tempMax: 23, tempMin: 14, windSpeedKmh: 18, icon: '10d' },
      { date: addDays(2), condition: 'Clear', tempMax: 28, tempMin: 16, windSpeedKmh: 8, icon: '01d' },
    ].map((day) => ({ ...day, farmAdvice: buildFarmAdvice({ condition: day.condition, temperature: day.tempMax, humidity: null, windSpeedKmh: day.windSpeedKmh }) }));

    return res.status(200).json({
      placeholder: true,
      message: 'OPENWEATHER_API_KEY not set on the server — showing placeholder forecast data.',
      days: placeholderDays,
    });
  }

  try {
    const cacheKey = `forecast:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: 'Weather provider error', details: errorBody });
    }
    const data = await response.json();

    const days = groupForecastByDay(data.list ?? []).slice(0, 3);

    const forecastResponse = { placeholder: false, days };
    weatherCache.set(cacheKey, { data: forecastResponse, savedAt: Date.now() });

    return res.json(forecastResponse);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Weather provider timed out. Please try again.' });
    }
    return res.status(500).json({ error: 'Failed to fetch forecast', details: err.message });
  }
});

// Collapses OpenWeatherMap's 3-hour-interval list into one summary entry per
// calendar day: max/min temp across that day's entries, and the condition/wind
// reading closest to midday (a more representative "the weather that day" pick
// than just using the first 3-hour slot, which might be overnight).
function groupForecastByDay(list) {
  const byDate = new Map();

  for (const entry of list) {
    const date = entry.dt_txt.split(' ')[0];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(entry);
  }

  return Array.from(byDate.entries()).map(([date, entries]) => {
    const temps = entries.map((e) => e.main.temp);
    const middayEntry = entries.reduce((closest, entry) => {
      const hour = Number(entry.dt_txt.split(' ')[1].split(':')[0]);
      const closestHour = Number(closest.dt_txt.split(' ')[1].split(':')[0]);
      return Math.abs(hour - 12) < Math.abs(closestHour - 12) ? entry : closest;
    });

    const condition = middayEntry.weather?.[0]?.description ?? 'Unknown';
    const windSpeedKmh = middayEntry.wind?.speed !== undefined
      ? Math.round(middayEntry.wind.speed * 3.6 * 10) / 10
      : null;
    const humidity = middayEntry.main?.humidity ?? null;

    return {
      date,
      condition,
      tempMax: Math.round(Math.max(...temps)),
      tempMin: Math.round(Math.min(...temps)),
      windSpeedKmh,
      icon: middayEntry.weather?.[0]?.icon ?? null,
      farmAdvice: buildFarmAdvice({ condition, temperature: Math.max(...temps), humidity, windSpeedKmh }),
    };
  });
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
export default router;
