import express from 'express';

const router = express.Router();

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
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
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

    return res.json({
      placeholder: false,
      location: data.name ?? null,
      icon: data.weather?.[0]?.icon ?? null,
      ...weatherPayload,
      farmAdvice: buildFarmAdvice(weatherPayload)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch weather', details: err.message });
  }
});

export default router;