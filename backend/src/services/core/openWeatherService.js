/**
 * OpenWeatherMap API Integration Service
 * Following strict API specification with caching, retry logic, and normalized output
 */

const axios = require('axios');

class OpenWeatherService {
  constructor() {
    // Configuration from environment
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org';
    this.units = process.env.OPENWEATHER_UNITS || 'metric';
    this.lang = process.env.OPENWEATHER_LANG || 'id';
    this.timeout = parseInt(process.env.OPENWEATHER_TIMEOUT) || 10000;
    this.maxRetries = parseInt(process.env.OPENWEATHER_MAX_RETRIES) || 2;
    this.cacheTTL = parseInt(process.env.OPENWEATHER_CACHE_TTL) || 300; // 5 minutes

    // Default location (Tangerang/Jakarta area)
    this.defaultLat = parseFloat(process.env.OPENWEATHER_DEFAULT_LAT) || -6.1075;
    this.defaultLon = parseFloat(process.env.OPENWEATHER_DEFAULT_LON) || 106.7803;
    this.defaultCity = process.env.OPENWEATHER_DEFAULT_CITY || 'Tangerang';

    // Cache storage
    this.cache = new Map();
  }

  /**
   * Generate cache key from request parameters
   */
  getCacheKey(endpoint, params) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached data if valid
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 1000) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store data in cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Make API request with retry logic
   */
  async makeRequest(endpoint, params, retryCount = 0) {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          appid: this.apiKey,
          units: this.units,
          lang: this.lang
        },
        timeout: this.timeout
      });

      // Cache successful response
      this.setCache(cacheKey, response.data);
      return response.data;

    } catch (error) {
      // Retry on network or 5xx errors
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.log(`OpenWeather API retry ${retryCount + 1}/${this.maxRetries}`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(endpoint, params, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Check if request should be retried
   */
  shouldRetry(error) {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 && status < 600; // 5xx errors
  }

  /**
   * Delay helper for retry
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build error output schema
   */
  buildErrorResponse(code, message) {
    return {
      error: true,
      code,
      message,
      source: 'openweathermap'
    };
  }

  /**
   * Get current weather - Normalized output
   * @param {number|string} lat - Latitude or city name
   * @param {number} lon - Longitude (optional if using city name)
   */
  async getCurrentWeather(lat, lon) {
    try {
      // Validate API key
      if (!this.apiKey || this.apiKey === 'your_openweathermap_api_key_here') {
        return this.buildErrorResponse(401, 'OpenWeatherMap API key not configured');
      }

      // Use defaults if not provided
      const latitude = lat || this.defaultLat;
      const longitude = lon || this.defaultLon;

      const data = await this.makeRequest('/data/2.5/weather', {
        lat: latitude,
        lon: longitude
      });

      // Validate required fields
      if (!data.main || !data.weather || !data.wind) {
        return this.buildErrorResponse(500, 'Invalid response structure from API');
      }

      // Build normalized output schema
      const normalizedOutput = {
        location: {
          name: data.name || 'Unknown',
          lat: data.coord?.lat || latitude,
          lon: data.coord?.lon || longitude
        },
        weather: {
          temperature_c: data.main.temp,
          feels_like_c: data.main.feels_like,
          humidity_percent: data.main.humidity,
          pressure_hpa: data.main.pressure,
          wind_speed_ms: data.wind.speed,
          wind_direction_deg: data.wind.deg || 0,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          condition: data.weather[0].main
        },
        meta: {
          source: 'openweathermap',
          timestamp: new Date().toISOString(),
          unit: 'metric',
          lang: 'id',
          sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : null,
          sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : null
        },
        alerts: this.checkAlerts(data)
      };

      return normalizedOutput;

    } catch (error) {
      console.error('OpenWeather getCurrentWeather error:', error.message);
      return this.buildErrorResponse(
        error.response?.status || 500,
        error.response?.data?.message || error.message
      );
    }
  }

  /**
   * Get 5-day / 3-hour forecast - Normalized output
   */
  async getForecast(lat, lon) {
    try {
      if (!this.apiKey || this.apiKey === 'your_openweathermap_api_key_here') {
        return this.buildErrorResponse(401, 'OpenWeatherMap API key not configured');
      }

      const latitude = lat || this.defaultLat;
      const longitude = lon || this.defaultLon;

      const data = await this.makeRequest('/data/2.5/forecast', {
        lat: latitude,
        lon: longitude
      });

      if (!data.list || !Array.isArray(data.list)) {
        return this.buildErrorResponse(500, 'Invalid forecast response structure');
      }

      const forecasts = data.list.map(item => ({
        datetime: item.dt_txt,
        timestamp: new Date(item.dt * 1000).toISOString(),
        temperature_c: item.main.temp,
        feels_like_c: item.main.feels_like,
        humidity_percent: item.main.humidity,
        pressure_hpa: item.main.pressure,
        wind_speed_ms: item.wind.speed,
        wind_direction_deg: item.wind.deg || 0,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        condition: item.weather[0].main,
        probability_of_precipitation: item.pop || 0
      }));

      return {
        location: {
          name: data.city?.name || 'Unknown',
          lat: data.city?.coord?.lat || latitude,
          lon: data.city?.coord?.lon || longitude
        },
        forecasts,
        meta: {
          source: 'openweathermap',
          timestamp: new Date().toISOString(),
          unit: 'metric',
          lang: 'id',
          count: forecasts.length
        }
      };

    } catch (error) {
      console.error('OpenWeather getForecast error:', error.message);
      return this.buildErrorResponse(
        error.response?.status || 500,
        error.response?.data?.message || error.message
      );
    }
  }

  /**
   * Geocoding - Convert city name to coordinates
   */
  async geocodeCity(cityName, limit = 5) {
    try {
      if (!this.apiKey || this.apiKey === 'your_openweathermap_api_key_here') {
        return this.buildErrorResponse(401, 'OpenWeatherMap API key not configured');
      }

      const data = await this.makeRequest('/geo/1.0/direct', {
        q: cityName,
        limit
      });

      if (!Array.isArray(data) || data.length === 0) {
        return this.buildErrorResponse(404, `City not found: ${cityName}`);
      }

      return {
        results: data.map(item => ({
          name: item.name,
          local_name: item.local_names?.id || item.name,
          lat: item.lat,
          lon: item.lon,
          country: item.country,
          state: item.state || null
        })),
        meta: {
          source: 'openweathermap',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('OpenWeather geocode error:', error.message);
      return this.buildErrorResponse(
        error.response?.status || 500,
        error.response?.data?.message || error.message
      );
    }
  }

  /**
   * Check for weather alerts based on thresholds
   */
  checkAlerts(data) {
    const alerts = [];
    const temp = data.main?.temp;
    const windSpeed = data.wind?.speed;
    const weatherMain = data.weather?.[0]?.main;

    // Temperature alert > 35°C
    if (temp > 35) {
      alerts.push({
        type: 'HIGH_TEMPERATURE',
        level: 'warning',
        message: `Suhu tinggi: ${temp}°C`,
        recommendation: 'Pastikan hidrasi yang cukup dan hindari paparan langsung sinar matahari'
      });
    }

    // Wind speed alert > 15 m/s
    if (windSpeed > 15) {
      alerts.push({
        type: 'HIGH_WIND',
        level: 'danger',
        message: `Angin kencang: ${windSpeed} m/s`,
        recommendation: 'BERBAHAYA - Tidak disarankan untuk berlayar'
      });
    } else if (windSpeed > 10) {
      alerts.push({
        type: 'MODERATE_WIND',
        level: 'caution',
        message: `Angin sedang: ${windSpeed} m/s`,
        recommendation: 'WASPADA - Berhati-hati saat berlayar'
      });
    }

    // Heavy rain detection
    if (['Thunderstorm', 'Rain', 'Drizzle'].includes(weatherMain)) {
      alerts.push({
        type: 'PRECIPITATION',
        level: weatherMain === 'Thunderstorm' ? 'danger' : 'caution',
        message: `Kondisi: ${data.weather?.[0]?.description}`,
        recommendation: weatherMain === 'Thunderstorm' 
          ? 'BERBAHAYA - Hindari berlayar saat badai petir'
          : 'WASPADA - Perhatikan kondisi hujan'
      });
    }

    return {
      hasAlerts: alerts.length > 0,
      count: alerts.length,
      items: alerts
    };
  }

  /**
   * Get maritime weather summary with safety analysis
   */
  async getMaritimeWeather(lat, lon) {
    try {
      const currentWeather = await this.getCurrentWeather(lat, lon);
      
      if (currentWeather.error) {
        return currentWeather;
      }

      const forecast = await this.getForecast(lat, lon);
      
      // Calculate safety status
      const safetyStatus = this.calculateSafetyStatus(currentWeather);

      return {
        current: currentWeather,
        forecast: forecast.error ? null : forecast,
        safety: safetyStatus,
        meta: {
          source: 'openweathermap',
          timestamp: new Date().toISOString(),
          unit: 'metric',
          lang: 'id'
        }
      };

    } catch (error) {
      console.error('OpenWeather getMaritimeWeather error:', error.message);
      return this.buildErrorResponse(500, error.message);
    }
  }

  /**
   * Calculate maritime safety status
   */
  calculateSafetyStatus(weatherData) {
    if (!weatherData.weather) {
      return { status: 'UNKNOWN', level: 'unknown', score: 0 };
    }

    const { wind_speed_ms, condition } = weatherData.weather;
    let score = 100;
    let reasons = [];

    // Wind speed scoring
    if (wind_speed_ms > 15) {
      score -= 50;
      reasons.push('Angin sangat kencang');
    } else if (wind_speed_ms > 10) {
      score -= 25;
      reasons.push('Angin kencang');
    } else if (wind_speed_ms > 7) {
      score -= 10;
      reasons.push('Angin sedang');
    }

    // Weather condition scoring
    if (condition === 'Thunderstorm') {
      score -= 40;
      reasons.push('Badai petir');
    } else if (['Rain', 'Drizzle'].includes(condition)) {
      score -= 15;
      reasons.push('Hujan');
    } else if (condition === 'Fog' || condition === 'Mist') {
      score -= 20;
      reasons.push('Jarak pandang rendah');
    }

    // Determine status
    let status, level;
    if (score >= 80) {
      status = 'SAFE';
      level = 'AMAN';
    } else if (score >= 60) {
      status = 'CAUTION';
      level = 'WASPADA';
    } else {
      status = 'DANGER';
      level = 'BERBAHAYA';
    }

    return {
      status,
      level,
      score,
      reasons: reasons.length > 0 ? reasons : ['Kondisi cuaca normal'],
      recommendation: score >= 80 
        ? 'Kondisi aman untuk berlayar'
        : score >= 60 
          ? 'Berhati-hati saat berlayar, pantau kondisi cuaca'
          : 'Tidak disarankan untuk berlayar'
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    return { success: true, message: 'Cache cleared' };
  }
}

module.exports = new OpenWeatherService();
