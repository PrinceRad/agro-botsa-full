import express from 'express';

const router = express.Router();

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
    return res.status(200).json({
      placeholder: true,
      message: 'OPENWEATHER_API_KEY not set on the server — showing placeholder weather data.',
      condition: 'Partly cloudy',
      temperature: 24,
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
    return res.json({
      placeholder: false,
      condition: data.weather?.[0]?.description ?? 'Unknown',
      temperature: data.main?.temp ?? null,
      location: data.name ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch weather', details: err.message });
  }
});

export default router;
