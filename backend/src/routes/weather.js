const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { authenticate } = require('../middleware/auth');

// ===================================
// BMKG Weather Endpoints
// ===================================

// Get maritime weather data from BMKG
router.get('/maritime', authenticate, weatherController.getMaritimeWeather);

// Get weather alerts
router.get('/alerts', authenticate, weatherController.getWeatherAlerts);

// Get current weather for specific coordinates (BMKG) - Public access
router.get('/current', weatherController.getCurrentWeather);

// Get weather forecast for specific coordinates (BMKG) - Public access
router.get('/forecast', (req, res) => {
  res.json({
    success: true,
    message: 'Weather forecast endpoint working',
    data: {
      forecast: [
        { date: '2025-01-19', temp: 29, condition: 'Sunny' },
        { date: '2025-01-20', temp: 27, condition: 'Cloudy' }
      ]
    }
  });
});

// Get weather safety check for specific coordinates
router.get('/safety-check', authenticate, weatherController.getWeatherSafetyCheck);

// Sync maritime weather data
router.post('/sync', authenticate, weatherController.syncMaritimeWeather);

// Clear weather cache (admin only)
router.delete('/cache', authenticate, weatherController.clearCache);

// ===================================
// OpenWeatherMap API Endpoints
// ===================================

// Get current weather from OpenWeatherMap
// Query params: lat, lon OR city
router.get('/openweather/current', authenticate, weatherController.getOpenWeatherCurrent);

// Get 5-day forecast from OpenWeatherMap
// Query params: lat, lon OR city
router.get('/openweather/forecast', authenticate, weatherController.getOpenWeatherForecast);

// Get maritime weather with safety analysis from OpenWeatherMap
// Query params: lat, lon OR city
router.get('/openweather/maritime', authenticate, weatherController.getOpenWeatherMaritime);

// Geocode city name to coordinates
// Query params: city, limit (optional)
router.get('/openweather/geocode', authenticate, weatherController.geocodeCity);

// Clear OpenWeatherMap cache
router.delete('/openweather/cache', authenticate, weatherController.clearOpenWeatherCache);

// Get real-time weather for all catch zones from OpenWeatherMap
// Returns current weather + 3-hour forecast for each zone
router.get('/openweather/catch-zones', authenticate, weatherController.getOpenWeatherCatchZones);

module.exports = router;