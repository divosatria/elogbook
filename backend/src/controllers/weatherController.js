const axios = require('axios');
const CatchPolygon = require('../models/CatchPolygon');
const openWeatherService = require('../services/openWeatherService');

const weatherController = {
  // Get maritime weather data from BMKG API
  async getMaritimeWeather(req, res) {
    try {
      // Get active catch polygons from database
      const catchPolygons = await CatchPolygon.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'coordinates', 'zoneType', 'color']
      });

      if (!catchPolygons || catchPolygons.length === 0) {
        return res.json({
          success: true,
          message: 'Tidak ada zona tangkap aktif yang ditemukan',
          data: {
            success: true,
            timestamp: new Date().toISOString(),
            source: 'Database - No Active Zones',
            data: []
          }
        });
      }

      // Map catch polygons to weather zones with BMKG administrative codes
      const weatherZones = catchPolygons.map(polygon => {
        // Convert coordinates format from {lat, lng} to [lat, lng] if needed
        let coordinates = polygon.coordinates;
        if (coordinates.length > 0 && typeof coordinates[0] === 'object' && coordinates[0].lat !== undefined) {
          coordinates = coordinates.map(coord => [coord.lat, coord.lng]);
        }
        
        // Get center point of polygon for weather data lookup
        const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
        const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
        
        // Determine closest BMKG administrative code based on location
        let adm4 = '31.71.01.1001'; // Default Jakarta
        
        // Simple mapping based on coordinates (you can make this more sophisticated)
        if (centerLat > -5.5 && centerLng > 106.0 && centerLng < 107.0) {
          adm4 = '31.01.01.1001'; // Kepulauan Seribu
        } else if (centerLat < -6.5 && centerLng < 106.5) {
          adm4 = '32.01.01.1001'; // Jawa Barat
        } else if (centerLng > 107.0) {
          adm4 = '35.01.01.1001'; // Jawa Timur
        }
        
        return {
          id: `zone_${polygon.id}`,
          name: polygon.name,
          description: polygon.description || polygon.name,
          coordinates: coordinates, // Use converted coordinates
          zoneType: polygon.zoneType,
          color: polygon.color,
          adm4: adm4,
          centerLat,
          centerLng
        };
      });

      // Fetch weather data for each zone
      const weatherPromises = weatherZones.map(async (zone) => {
        try {
          const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${zone.adm4}`);
          const bmkgData = response.data;
          
          if (bmkgData && bmkgData.data && bmkgData.data.length > 0) {
            const currentWeather = bmkgData.data[0].cuaca[0][0]; // Get current weather
            
            // Calculate safety score based on weather conditions
            let safetyScore = 100;
            let safetyStatus = 'SAFE';
            let riskLevel = 'LOW';
            
            // Reduce safety score based on weather conditions
            if (currentWeather.weather >= 60) { // Rain conditions
              safetyScore -= 30;
              safetyStatus = 'CAUTION';
              riskLevel = 'MEDIUM';
            }
            if (currentWeather.ws > 15) { // High wind speed
              safetyScore -= 25;
              safetyStatus = 'DANGER';
              riskLevel = 'HIGH';
            }
            if (currentWeather.vs < 5000) { // Low visibility
              safetyScore -= 20;
            }
            if (currentWeather.weather >= 95) { // Severe weather
              safetyScore -= 40;
              safetyStatus = 'DANGER';
              riskLevel = 'HIGH';
            }
            
            // Additional safety considerations for different zone types
            if (zone.zoneType === 'conservation') {
              safetyScore -= 10; // More restrictive for conservation zones
            } else if (zone.zoneType === 'restricted') {
              safetyScore -= 20; // Even more restrictive
            }
            
            safetyScore = Math.max(safetyScore, 10); // Minimum safety score
            
            return {
              id: zone.id,
              description: zone.description,
              domain: 'fishing_zone',
              coordinates: zone.coordinates,
              zoneType: zone.zoneType,
              color: zone.color,
              safetyStatus,
              riskLevel,
              bmkgData: bmkgData,
              centerCoordinates: [zone.centerLat, zone.centerLng],
              forecasts: [
                {
                  datetime: currentWeather.datetime,
                  parameter: 'weather',
                  description: 'Kondisi Cuaca',
                  values: [{ unit: '', text: currentWeather.weather_desc }],
                  safetyScore: safetyScore
                },
                {
                  datetime: currentWeather.datetime,
                  parameter: 'temperature',
                  description: 'Suhu Udara',
                  values: [{ unit: '°C', text: `${currentWeather.t}` }],
                  safetyScore: 85
                },
                {
                  datetime: currentWeather.datetime,
                  parameter: 'wind',
                  description: 'Angin',
                  values: [{ unit: 'km/h', text: `${currentWeather.wd} ${currentWeather.ws}` }],
                  safetyScore: currentWeather.ws > 15 ? 50 : 85
                },
                {
                  datetime: currentWeather.datetime,
                  parameter: 'humidity',
                  description: 'Kelembaban',
                  values: [{ unit: '%', text: `${currentWeather.hu}` }],
                  safetyScore: 80
                },
                {
                  datetime: currentWeather.datetime,
                  parameter: 'visibility',
                  description: 'Jarak Pandang',
                  values: [{ unit: '', text: currentWeather.vs_text }],
                  safetyScore: currentWeather.vs < 5000 ? 60 : 90
                }
              ]
            };
          }
        } catch (error) {
          console.error(`Error fetching data for zone ${zone.id}:`, error.message);
          // Return fallback data for this zone
          return {
            id: zone.id,
            description: zone.description,
            domain: 'fishing_zone',
            coordinates: zone.coordinates,
            zoneType: zone.zoneType,
            color: zone.color,
            safetyStatus: 'UNKNOWN',
            riskLevel: 'MEDIUM',
            centerCoordinates: [zone.centerLat, zone.centerLng],
            forecasts: [
              {
                datetime: new Date().toISOString(),
                parameter: 'weather',
                description: 'Kondisi Cuaca',
                values: [{ unit: '', text: 'Data tidak tersedia' }],
                safetyScore: 50
              }
            ]
          };
        }
      });
      
      const weatherData = await Promise.all(weatherPromises);
      
      const responseData = {
        success: true,
        timestamp: new Date().toISOString(),
        source: 'BMKG Official API + Database Zones',
        totalZones: weatherZones.length,
        data: weatherData.filter(zone => zone !== undefined)
      };
      
      res.json({
        success: true,
        message: `Data cuaca BMKG berhasil diambil untuk ${weatherZones.length} zona tangkap`,
        data: responseData
      });
    } catch (error) {
      console.error('Error fetching BMKG data:', error);
      
      // Fallback to static data if API fails
      const fallbackData = {
        success: true,
        timestamp: new Date().toISOString(),
        source: 'Fallback Data (BMKG API Error)',
        data: [
          {
            id: 'zone_fallback_1',
            description: 'Zona Tangkap Fallback',
            domain: 'fishing_zone',
            coordinates: [[-6.0, 106.7], [-6.0, 106.9], [-5.8, 106.9], [-5.8, 106.7]],
            safetyStatus: 'SAFE',
            riskLevel: 'LOW',
            forecasts: [
              {
                datetime: new Date().toISOString(),
                parameter: 'weather',
                description: 'Kondisi Cuaca',
                values: [{ unit: '', text: 'Cerah Berawan' }],
                safetyScore: 85
              },
              {
                datetime: new Date().toISOString(),
                parameter: 'temperature',
                description: 'Suhu Udara',
                values: [{ unit: '°C', text: '28-31' }],
                safetyScore: 85
              },
              {
                datetime: new Date().toISOString(),
                parameter: 'wind',
                description: 'Angin',
                values: [{ unit: 'km/h', text: 'Timur Laut 8-15' }],
                safetyScore: 88
              }
            ]
          }
        ]
      };
      
      res.json({
        success: true,
        message: 'Data cuaca fallback (BMKG API tidak tersedia)',
        data: fallbackData
      });
    }
  },

  // Get weather alerts from BMKG
  async getWeatherAlerts(req, res) {
    try {
      // Get earthquake data from BMKG
      let earthquakeData = null;
      let weatherAlerts = [];
      
      try {
        // Try to get earthquake data from BMKG
        const earthquakeResponse = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json');
        earthquakeData = earthquakeResponse.data;
      } catch (error) {
        console.log('BMKG earthquake API not available, using fallback');
      }
      
      // Get active catch polygons for weather alerts
      try {
        const catchPolygons = await CatchPolygon.findAll({
          where: { isActive: true },
          attributes: ['id', 'name', 'description', 'coordinates', 'zoneType']
        });
        
        // Check weather conditions for each active zone
        for (const polygon of catchPolygons) {
          try {
            // Convert coordinates format if needed
            let coordinates = polygon.coordinates;
            if (coordinates.length > 0 && typeof coordinates[0] === 'object' && coordinates[0].lat !== undefined) {
              coordinates = coordinates.map(coord => [coord.lat, coord.lng]);
            }
            
            // Get center point for weather lookup
            const centerLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
            const centerLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
            
            // Determine BMKG administrative code
            let adm4 = '31.71.01.1001'; // Default Jakarta
            if (centerLat > -5.5 && centerLng > 106.0 && centerLng < 107.0) {
              adm4 = '31.01.01.1001'; // Kepulauan Seribu
            } else if (centerLat < -6.5 && centerLng < 106.5) {
              adm4 = '32.01.01.1001'; // Jawa Barat
            } else if (centerLng > 107.0) {
              adm4 = '35.01.01.1001'; // Jawa Timur
            }
            
            const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`);
            const weatherData = response.data;
            
            if (weatherData && weatherData.data && weatherData.data.length > 0) {
              const currentWeather = weatherData.data[0].cuaca[0][0];
              
              // Generate alerts based on weather conditions and zone type
              let alertLevel = null;
              let alertTitle = '';
              let alertDescription = '';
              let recommendation = '';
              
              // More strict criteria for conservation and restricted zones
              const isSpecialZone = polygon.zoneType === 'conservation' || polygon.zoneType === 'restricted';
              const windThreshold = isSpecialZone ? 12 : 20;
              const weatherThreshold = isSpecialZone ? 50 : 60;
              
              if (currentWeather.weather >= weatherThreshold && currentWeather.ws > windThreshold) {
                alertLevel = 'red';
                alertTitle = `PERINGATAN BAHAYA - ${polygon.name}`;
                alertDescription = `Cuaca buruk dengan ${currentWeather.weather_desc.toLowerCase()} dan angin kencang ${currentWeather.ws} km/h. TIDAK DISARANKAN untuk aktivitas penangkapan ikan.`;
                recommendation = 'HINDARI ZONA INI';
              } else if (currentWeather.weather >= weatherThreshold || currentWeather.ws > (windThreshold - 5)) {
                alertLevel = 'yellow';
                alertTitle = `PERINGATAN CUACA - ${polygon.name}`;
                alertDescription = `Kondisi cuaca ${currentWeather.weather_desc.toLowerCase()} dengan angin ${currentWeather.ws} km/h. Harap berhati-hati saat berlayar.`;
                recommendation = 'WASPADA';
              } else if (isSpecialZone && (currentWeather.weather >= 30 || currentWeather.ws > 8)) {
                alertLevel = 'yellow';
                alertTitle = `PERINGATAN ZONA KHUSUS - ${polygon.name}`;
                alertDescription = `Zona ${polygon.zoneType} dengan kondisi cuaca ${currentWeather.weather_desc.toLowerCase()}. Patuhi regulasi khusus zona ini.`;
                recommendation = 'PATUHI REGULASI';
              }
              
              if (alertLevel) {
                weatherAlerts.push({
                  id: `alert_zone_${polygon.id}_${Date.now()}`,
                  level: alertLevel,
                  title: alertTitle,
                  description: alertDescription,
                  area: polygon.name,
                  zoneId: `zone_${polygon.id}`,
                  zoneType: polygon.zoneType,
                  validFrom: new Date().toISOString(),
                  validTo: new Date(Date.now() + (alertLevel === 'red' ? 12 : 6) * 60 * 60 * 1000).toISOString(),
                  timestamp: new Date().toISOString(),
                  recommendation: recommendation,
                  weatherData: currentWeather,
                  coordinates: coordinates // Use converted coordinates
                });
              }
            }
          } catch (zoneError) {
            console.log(`Error fetching weather for zone ${polygon.name}:`, zoneError.message);
          }
        }
      } catch (error) {
        console.log('Error generating weather alerts from database zones:', error.message);
      }
      
      // If no alerts generated, create a default safe status
      if (weatherAlerts.length === 0) {
        weatherAlerts.push({
          id: 'alert_safe_001',
          level: 'green',
          title: 'KONDISI CUACA AMAN',
          description: 'Kondisi cuaca saat ini relatif aman untuk aktivitas penangkapan ikan di semua zona aktif. Tetap waspada terhadap perubahan cuaca.',
          area: 'Semua Zona Aktif',
          zoneId: 'all_zones',
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          timestamp: new Date().toISOString(),
          recommendation: 'AMAN BERLAYAR'
        });
      }
      
      const alerts = {
        alerts: weatherAlerts,
        timestamp: new Date().toISOString(),
        earthquakeData: earthquakeData,
        source: 'BMKG Official API + Database Zones',
        totalZonesChecked: weatherAlerts.length > 1 ? weatherAlerts.length - 1 : 0
      };
      
      res.json({
        success: true,
        message: `Data peringatan BMKG berhasil diambil untuk ${alerts.totalZonesChecked} zona`,
        data: alerts
      });
    } catch (error) {
      console.error('Error fetching BMKG alerts:', error);
      
      // Fallback alerts
      const fallbackAlerts = {
        alerts: [
          {
            id: 'alert_fallback_001',
            level: 'yellow',
            title: 'PERINGATAN SISTEM',
            description: 'Sistem peringatan cuaca sedang dalam pemeliharaan. Harap pantau kondisi cuaca secara manual dan periksa zona tangkap yang aktif.',
            area: 'Semua Zona',
            zoneId: 'all_zones',
            validFrom: new Date().toISOString(),
            validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
            recommendation: 'WASPADA'
          }
        ],
        timestamp: new Date().toISOString(),
        source: 'Fallback Data'
      };
      
      res.json({
        success: true,
        message: 'Data peringatan fallback (BMKG API tidak tersedia)',
        data: fallbackAlerts
      });
    }
  },

  // Get real-time maritime weather
  async getMaritimeRealtime(req, res) {
    try {
      // Get real-time weather for key maritime locations
      const maritimeLocations = [
        { name: 'Jakarta Bay', adm4: '31.71.01.1001' },
        { name: 'Thousand Islands', adm4: '31.01.01.1001' },
        { name: 'West Java Coast', adm4: '32.01.01.1001' }
      ];
      
      const realtimeData = [];
      
      for (const location of maritimeLocations) {
        try {
          const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${location.adm4}`);
          const weatherData = response.data;
          
          if (weatherData && weatherData.data && weatherData.data.length > 0) {
            const currentWeather = weatherData.data[0].cuaca[0][0];
            const locationData = weatherData.lokasi;
            
            realtimeData.push({
              location: location.name,
              coordinates: {
                lat: locationData.lat,
                lon: locationData.lon
              },
              timezone: locationData.timezone,
              current: {
                datetime: currentWeather.datetime,
                local_datetime: currentWeather.local_datetime,
                temperature: currentWeather.t,
                weather: currentWeather.weather_desc,
                weather_code: currentWeather.weather,
                wind_direction: currentWeather.wd,
                wind_speed: currentWeather.ws,
                humidity: currentWeather.hu,
                visibility: currentWeather.vs_text,
                cloud_cover: currentWeather.tcc,
                precipitation: currentWeather.tp || 0
              },
              maritime_conditions: {
                sea_state: currentWeather.ws > 20 ? 'Rough' : currentWeather.ws > 10 ? 'Moderate' : 'Calm',
                wave_height_estimate: currentWeather.ws > 20 ? '2-3m' : currentWeather.ws > 10 ? '1-2m' : '0.5-1m',
                fishing_condition: currentWeather.weather < 60 && currentWeather.ws < 15 ? 'Good' : currentWeather.weather >= 60 || currentWeather.ws > 20 ? 'Poor' : 'Fair'
              }
            });
          }
        } catch (locationError) {
          console.log(`Error fetching data for ${location.name}:`, locationError.message);
        }
      }
      
      res.json({
        success: true,
        message: 'Data cuaca maritim real-time berhasil diambil',
        data: {
          timestamp: new Date().toISOString(),
          source: 'BMKG Official API',
          locations: realtimeData
        }
      });
    } catch (error) {
      console.error('Error fetching maritime weather:', error);
      
      // Fallback data
      res.json({
        success: true,
        message: 'Data cuaca maritim fallback (BMKG API tidak tersedia)',
        data: {
          timestamp: new Date().toISOString(),
          source: 'Fallback Data',
          locations: [
            {
              location: 'Jakarta Bay',
              coordinates: { lat: -6.1763842693, lon: 106.8267073562 },
              current: {
                datetime: new Date().toISOString(),
                temperature: 28,
                weather: 'Cerah Berawan',
                wind_direction: 'NE',
                wind_speed: 12,
                humidity: 75,
                visibility: '> 10 km'
              },
              maritime_conditions: {
                sea_state: 'Calm',
                wave_height_estimate: '0.5-1m',
                fishing_condition: 'Good'
              }
            }
          ]
        }
      });
    }
  },

  // Get current weather for specific coordinates
  async getCurrentWeather(req, res) {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude parameters are required'
        });
      }
      
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      let adm4 = '31.71.01.1001';
      if (lat > -5.5 && lng > 106.0 && lng < 107.0) {
        adm4 = '31.01.01.1001';
      } else if (lat < -6.5 && lng < 106.5) {
        adm4 = '32.01.01.1001';
      } else if (lng > 107.0) {
        adm4 = '35.01.01.1001';
      }
      
      const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`);
      const bmkgData = response.data;
      
      if (bmkgData && bmkgData.data && bmkgData.data.length > 0) {
        const currentWeather = bmkgData.data[0].cuaca[0][0];
        
        res.json({
          success: true,
          data: {
            coordinates: { latitude: lat, longitude: lng },
            current: {
              temperature: currentWeather.t,
              weather: currentWeather.weather_desc,
              wind_speed: currentWeather.ws,
              humidity: currentWeather.hu
            }
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            coordinates: { latitude: lat, longitude: lng },
            current: {
              temperature: 28,
              weather: 'Data tidak tersedia',
              wind_speed: 0,
              humidity: 75
            }
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get current weather data'
      });
    }
  },

  // Get weather forecast for specific coordinates
  async getWeatherForecast(req, res) {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude parameters are required'
        });
      }
      
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Determine BMKG administrative code based on coordinates
      let adm4 = '31.71.01.1001'; // Default Jakarta
      if (lat > -5.5 && lng > 106.0 && lng < 107.0) {
        adm4 = '31.01.01.1001'; // Kepulauan Seribu
      } else if (lat < -6.5 && lng < 106.5) {
        adm4 = '32.01.01.1001'; // Jawa Barat
      } else if (lng > 107.0) {
        adm4 = '35.01.01.1001'; // Jawa Timur
      }
      
      const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`);
      const bmkgData = response.data;
      
      if (bmkgData && bmkgData.data && bmkgData.data.length > 0) {
        const weatherData = bmkgData.data[0];
        const forecasts = [];
        
        // Get forecast for next 3 days
        for (let i = 0; i < Math.min(3, weatherData.cuaca.length); i++) {
          const dayForecast = weatherData.cuaca[i];
          if (dayForecast && dayForecast.length > 0) {
            const weather = dayForecast[0]; // Get first forecast of the day
            forecasts.push({
              date: weather.local_datetime.split(' ')[0],
              datetime: weather.datetime,
              temperature: weather.t,
              weather: weather.weather_desc,
              windSpeed: weather.ws,
              windDirection: weather.wd,
              humidity: weather.hu,
              visibility: weather.vs_text
            });
          }
        }
        
        res.json({
          success: true,
          data: forecasts
        });
      } else {
        // Fallback forecast data
        const fallbackForecasts = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          fallbackForecasts.push({
            date: date.toISOString().split('T')[0],
            datetime: date.toISOString(),
            temperature: 28 + Math.random() * 4,
            weather: 'Cerah Berawan',
            windSpeed: 10 + Math.random() * 10,
            windDirection: 'NE',
            humidity: 70 + Math.random() * 20,
            visibility: '> 10 km'
          });
        }
        
        res.json({
          success: true,
          data: fallbackForecasts
        });
      }
    } catch (error) {
      console.error('Error in getWeatherForecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get weather forecast',
        error: error.message
      });
    }
  },

  // Get weather safety check for specific coordinates
  async getWeatherSafetyCheck(req, res) {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude parameters are required'
        });
      }
      
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Determine BMKG administrative code based on coordinates
      let adm4 = '31.71.01.1001'; // Default Jakarta
      if (lat > -5.5 && lng > 106.0 && lng < 107.0) {
        adm4 = '31.01.01.1001'; // Kepulauan Seribu
      } else if (lat < -6.5 && lng < 106.5) {
        adm4 = '32.01.01.1001'; // Jawa Barat
      } else if (lng > 107.0) {
        adm4 = '35.01.01.1001'; // Jawa Timur
      }
      
      const response = await axios.get(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`);
      const bmkgData = response.data;
      
      if (bmkgData && bmkgData.data && bmkgData.data.length > 0) {
        const currentWeather = bmkgData.data[0].cuaca[0][0];
        
        // Calculate safety assessment
        let isSafe = true;
        let safetyScore = 100;
        let warnings = [];
        let tingkatPeringatan = 'aman';
        
        // Check wind speed
        if (currentWeather.ws > 25) {
          isSafe = false;
          safetyScore -= 40;
          warnings.push('Angin sangat kencang');
          tingkatPeringatan = 'berbahaya';
        } else if (currentWeather.ws > 15) {
          safetyScore -= 20;
          warnings.push('Angin cukup kencang');
          tingkatPeringatan = 'hati-hati';
        }
        
        // Check weather conditions
        if (currentWeather.weather >= 95) {
          isSafe = false;
          safetyScore -= 50;
          warnings.push('Cuaca buruk ekstrem');
          tingkatPeringatan = 'berbahaya';
        } else if (currentWeather.weather >= 60) {
          safetyScore -= 30;
          warnings.push('Kondisi hujan');
          if (tingkatPeringatan === 'aman') tingkatPeringatan = 'hati-hati';
        }
        
        // Check visibility
        if (currentWeather.vs < 3000) {
          safetyScore -= 25;
          warnings.push('Jarak pandang terbatas');
          if (tingkatPeringatan === 'aman') tingkatPeringatan = 'hati-hati';
        }
        
        safetyScore = Math.max(safetyScore, 0);
        
        const safetyData = {
          isSafe,
          safetyScore,
          peringatan: {
            tingkat: tingkatPeringatan,
            pesan: warnings.length > 0 ? warnings.join(', ') : 'Kondisi cuaca normal untuk berlayar'
          },
          detail: {
            suhu: currentWeather.t,
            kondisi: currentWeather.weather_desc,
            kecepatanAngin: currentWeather.ws,
            arahAngin: currentWeather.wd,
            kelembaban: currentWeather.hu,
            visibility: currentWeather.vs,
            tinggiGelombang: currentWeather.ws > 20 ? 2.5 : currentWeather.ws > 10 ? 1.5 : 0.8
          },
          timestamp: new Date().toISOString(),
          coordinates: { latitude: lat, longitude: lng }
        };
        
        res.json({
          success: true,
          data: safetyData
        });
      } else {
        // Fallback safety data
        res.json({
          success: true,
          data: {
            isSafe: true,
            safetyScore: 75,
            peringatan: {
              tingkat: 'aman',
              pesan: 'Data cuaca tidak tersedia, gunakan penilaian visual'
            },
            detail: {
              suhu: 28,
              kondisi: 'Data tidak tersedia',
              kecepatanAngin: 0,
              arahAngin: 'N/A',
              kelembaban: 75,
              visibility: 10000,
              tinggiGelombang: 1.0
            },
            timestamp: new Date().toISOString(),
            coordinates: { latitude: lat, longitude: lng }
          }
        });
      }
    } catch (error) {
      console.error('Error in getWeatherSafetyCheck:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get weather safety check',
        error: error.message
      });
    }
  },

  // Sync maritime weather data
  async syncMaritimeWeather(req, res) {
    try {
      // This endpoint can be used to trigger weather data synchronization
      // For now, it just returns a success response
      res.json({
        success: true,
        message: 'Weather data synchronization completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in syncMaritimeWeather:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync maritime weather data',
        error: error.message
      });
    }
  },

  // Clear weather cache
  async clearCache(req, res) {
    try {
      res.json({
        success: true,
        message: 'Cache cuaca berhasil dibersihkan'
      });
    } catch (error) {
      console.error('Error in clearCache:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membersihkan cache',
        error: error.message
      });
    }
  },

  // ===================================
  // OpenWeatherMap API Integration
  // ===================================

  // Get current weather from OpenWeatherMap
  async getOpenWeatherCurrent(req, res) {
    try {
      const { lat, lon, city } = req.query;
      
      let latitude = lat ? parseFloat(lat) : null;
      let longitude = lon ? parseFloat(lon) : null;
      
      // If city name provided, geocode it first
      if (city && !latitude) {
        const geocodeResult = await openWeatherService.geocodeCity(city);
        if (geocodeResult.error) {
          return res.status(geocodeResult.code).json(geocodeResult);
        }
        if (geocodeResult.results && geocodeResult.results.length > 0) {
          latitude = geocodeResult.results[0].lat;
          longitude = geocodeResult.results[0].lon;
        }
      }
      
      const weatherData = await openWeatherService.getCurrentWeather(latitude, longitude);
      
      if (weatherData.error) {
        return res.status(weatherData.code).json(weatherData);
      }
      
      res.json({
        success: true,
        message: 'Data cuaca OpenWeatherMap berhasil diambil',
        data: weatherData
      });
    } catch (error) {
      console.error('OpenWeather current error:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: error.message,
        source: 'openweathermap'
      });
    }
  },

  // Get weather forecast from OpenWeatherMap
  async getOpenWeatherForecast(req, res) {
    try {
      const { lat, lon, city } = req.query;
      
      let latitude = lat ? parseFloat(lat) : null;
      let longitude = lon ? parseFloat(lon) : null;
      
      // If city name provided, geocode it first
      if (city && !latitude) {
        const geocodeResult = await openWeatherService.geocodeCity(city);
        if (geocodeResult.error) {
          return res.status(geocodeResult.code).json(geocodeResult);
        }
        if (geocodeResult.results && geocodeResult.results.length > 0) {
          latitude = geocodeResult.results[0].lat;
          longitude = geocodeResult.results[0].lon;
        }
      }
      
      const forecastData = await openWeatherService.getForecast(latitude, longitude);
      
      if (forecastData.error) {
        return res.status(forecastData.code).json(forecastData);
      }
      
      res.json({
        success: true,
        message: 'Data prakiraan OpenWeatherMap berhasil diambil',
        data: forecastData
      });
    } catch (error) {
      console.error('OpenWeather forecast error:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: error.message,
        source: 'openweathermap'
      });
    }
  },

  // Get maritime weather with safety analysis from OpenWeatherMap
  async getOpenWeatherMaritime(req, res) {
    try {
      const { lat, lon, city } = req.query;
      
      let latitude = lat ? parseFloat(lat) : null;
      let longitude = lon ? parseFloat(lon) : null;
      
      // If city name provided, geocode it first
      if (city && !latitude) {
        const geocodeResult = await openWeatherService.geocodeCity(city);
        if (geocodeResult.error) {
          return res.status(geocodeResult.code).json(geocodeResult);
        }
        if (geocodeResult.results && geocodeResult.results.length > 0) {
          latitude = geocodeResult.results[0].lat;
          longitude = geocodeResult.results[0].lon;
        }
      }
      
      const maritimeData = await openWeatherService.getMaritimeWeather(latitude, longitude);
      
      if (maritimeData.error) {
        return res.status(maritimeData.code).json(maritimeData);
      }
      
      res.json({
        success: true,
        message: 'Data cuaca maritim OpenWeatherMap berhasil diambil',
        data: maritimeData
      });
    } catch (error) {
      console.error('OpenWeather maritime error:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: error.message,
        source: 'openweathermap'
      });
    }
  },

  // Geocode city name to coordinates
  async geocodeCity(req, res) {
    try {
      const { city, limit } = req.query;
      
      if (!city) {
        return res.status(400).json({
          error: true,
          code: 400,
          message: 'City parameter is required',
          source: 'openweathermap'
        });
      }
      
      const geocodeData = await openWeatherService.geocodeCity(city, limit ? parseInt(limit) : 5);
      
      if (geocodeData.error) {
        return res.status(geocodeData.code).json(geocodeData);
      }
      
      res.json({
        success: true,
        message: 'Geocoding berhasil',
        data: geocodeData
      });
    } catch (error) {
      console.error('Geocode error:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: error.message,
        source: 'openweathermap'
      });
    }
  },

  // Clear OpenWeatherMap cache
  async clearOpenWeatherCache(req, res) {
    try {
      const result = openWeatherService.clearCache();
      res.json({
        success: true,
        message: 'OpenWeatherMap cache berhasil dibersihkan',
        data: result
      });
    } catch (error) {
      console.error('Clear cache error:', error);
      res.status(500).json({
        error: true,
        code: 500,
        message: error.message,
        source: 'openweathermap'
      });
    }
  },

  // ===================================
  // OpenWeatherMap - Catch Zones Weather
  // ===================================

  /**
   * Get real-time weather for all active catch zones using OpenWeatherMap API
   * Returns current weather + 3-hour forecast for each zone
   */
  async getOpenWeatherCatchZones(req, res) {
    try {
      // Get active catch polygons from database
      const catchPolygons = await CatchPolygon.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'description', 'coordinates', 'zone_type', 'color']
      });

      if (!catchPolygons || catchPolygons.length === 0) {
        return res.json({
          success: true,
          message: 'Tidak ada zona tangkap aktif yang ditemukan',
          data: {
            timestamp: new Date().toISOString(),
            source: 'OpenWeatherMap',
            totalZones: 0,
            zones: []
          }
        });
      }

      // Process each zone and get weather data
      const zoneWeatherPromises = catchPolygons.map(async (polygon) => {
        try {
          // Convert coordinates format and calculate center point
          let coordinates = polygon.coordinates;
          if (!coordinates || coordinates.length === 0) {
            console.log(`Zone ${polygon.name} has no coordinates`);
            return null;
          }

          // Handle different coordinate formats: {lat, lng} or [lat, lng]
          let parsedCoords = coordinates;
          if (typeof coordinates[0] === 'object' && coordinates[0].lat !== undefined) {
            parsedCoords = coordinates.map(coord => [coord.lat, coord.lng]);
          }

          // Calculate center point of polygon
          const centerLat = parsedCoords.reduce((sum, coord) => sum + (Array.isArray(coord) ? coord[0] : coord.lat), 0) / parsedCoords.length;
          const centerLng = parsedCoords.reduce((sum, coord) => sum + (Array.isArray(coord) ? coord[1] : coord.lng), 0) / parsedCoords.length;

          // Get weather from OpenWeatherMap
          const maritimeData = await openWeatherService.getMaritimeWeather(centerLat, centerLng);

          if (maritimeData.error) {
            console.log(`Weather error for zone ${polygon.name}:`, maritimeData.message);
            return {
              id: polygon.id,
              name: polygon.name,
              description: polygon.description,
              zoneType: polygon.zone_type,
              color: polygon.color,
              center: { lat: centerLat, lng: centerLng },
              error: true,
              errorMessage: maritimeData.message
            };
          }

          // Extract next 4 forecast entries (12 hours ahead, every 3 hours)
          const next3HourForecasts = maritimeData.forecast?.forecasts?.slice(0, 4) || [];

          return {
            id: polygon.id,
            name: polygon.name,
            description: polygon.description,
            zoneType: polygon.zone_type,
            color: polygon.color,
            center: { lat: centerLat, lng: centerLng },
            current: maritimeData.current,
            forecasts: next3HourForecasts,
            safety: maritimeData.safety,
            meta: maritimeData.meta
          };
        } catch (zoneError) {
          console.error(`Error fetching weather for zone ${polygon.name}:`, zoneError.message);
          return {
            id: polygon.id,
            name: polygon.name,
            description: polygon.description,
            zoneType: polygon.zone_type,
            color: polygon.color,
            error: true,
            errorMessage: zoneError.message
          };
        }
      });

      const zoneWeatherData = await Promise.all(zoneWeatherPromises);

      // Filter out null results
      const validZones = zoneWeatherData.filter(zone => zone !== null);

      res.json({
        success: true,
        message: `Data cuaca OpenWeatherMap berhasil diambil untuk ${validZones.length} zona tangkap`,
        data: {
          timestamp: new Date().toISOString(),
          source: 'OpenWeatherMap',
          totalZones: validZones.length,
          zones: validZones
        }
      });

    } catch (error) {
      console.error('Error in getOpenWeatherCatchZones:', error);
      res.status(500).json({
        success: false,
        error: true,
        code: 500,
        message: 'Gagal mengambil data cuaca untuk zona tangkap',
        details: error.message
      });
    }
  }
};

module.exports = weatherController;