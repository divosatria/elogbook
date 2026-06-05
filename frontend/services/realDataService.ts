import { backendAPI } from './backendService';

// Default coordinates for Jakarta (fallback)
const DEFAULT_COORDINATES = {
  latitude: -6.2088,
  longitude: 106.8456
};

export class RealDataService {
  // Get real weather data instead of mock
  async getRealWeatherData(latitude?: number, longitude?: number) {
    try {
      const coords = {
        latitude: latitude || DEFAULT_COORDINATES.latitude,
        longitude: longitude || DEFAULT_COORDINATES.longitude
      };
      
      const weatherData = await backendAPI.getWeatherData(coords.latitude, coords.longitude);
      
      // Transform to match frontend interface
      return {
        temperature: weatherData.suhu || 28,
        humidity: weatherData.kelembaban || 75,
        windSpeed: weatherData.kecepatanAngin || 15,
        windDirection: weatherData.arahAngin || 'SW',
        waveHeight: weatherData.tinggiGelombang || 1.2,
        visibility: weatherData.visibility || 10,
        condition: this.mapConditionToEnglish(weatherData.kondisi) || 'Partly Cloudy',
        safetyLevel: this.mapSafetyLevel(weatherData.peringatan?.tingkat) || 'SAFE'
      };
    } catch (error) {
      console.error('Failed to get real weather data:', error);
      throw new Error('Weather data unavailable');
    }
  }

  // Get real safety zones instead of mock
  async getRealSafetyZones() {
    try {
      const response = await backendAPI.getCatchPolygons();
      console.log('Raw polygon response:', response);
      
      // Extract polygons array from response - backendAPI returns { data: [...] }
      let polygons: any[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        polygons = response.data;
      } else if (Array.isArray(response)) {
        polygons = response;
      }
      
      console.log('Extracted polygons:', polygons);
      
      // Handle empty or invalid data
      if (!polygons || polygons.length === 0) {
        console.warn('No polygon data available, returning empty array');
        return [];
      }
      
      // Transform catch polygons to safety zones format
      return polygons.map((polygon: any, index: number) => {
        // Provide fallback values for missing properties
        const safePolygon = {
          id: polygon.id || polygon._id || `zone_${index}`,
          name: polygon.name || polygon.nama || `Zona ${index + 1}`,
          radiusKm: polygon.coordinates ? this.calculatePolygonRadius(polygon.coordinates) : 5,
          safetyLevel: this.mapZoneTypeToSafety(polygon.zone_type || polygon.zoneType || polygon.type || 'fishing'),
          weatherNote: polygon.description || polygon.deskripsi || `Zona ${polygon.zone_type || polygon.zoneType || 'tangkap'} - perhatikan kondisi cuaca`,
          coordinates: polygon.coordinates || [],
          zoneType: polygon.zone_type || polygon.zoneType || polygon.type || 'fishing',
          color: polygon.color || polygon.warna || '#3b82f6'
        };
        
        console.log('Transformed polygon:', safePolygon);
        return safePolygon;
      });
    } catch (error) {
      console.error('Failed to get real safety zones:', error);
      // Return empty array instead of throwing error to prevent app crash
      return [];
    }
  }

  // Get weather safety check
  async getWeatherSafetyCheck(latitude?: number, longitude?: number) {
    try {
      const coords = {
        latitude: latitude || DEFAULT_COORDINATES.latitude,
        longitude: longitude || DEFAULT_COORDINATES.longitude
      };
      
      const safetyData = await backendAPI.checkWeatherSafety(coords.latitude, coords.longitude);
      
      return {
        status: safetyData.isSafe ? 'Safe' : 'Danger',
        summary: safetyData.peringatan?.pesan || 'Kondisi cuaca normal',
        advice: this.generateAdvice(safetyData),
        details: safetyData.detail || {}
      };
    } catch (error) {
      console.error('Failed to get weather safety check:', error);
      throw new Error('Weather safety check unavailable');
    }
  }

  // Helper methods
  private mapConditionToEnglish(kondisi: string): string {
    const mapping: { [key: string]: string } = {
      'cerah': 'Clear',
      'berawan': 'Partly Cloudy',
      'mendung': 'Cloudy',
      'hujan_ringan': 'Light Rain',
      'hujan_lebat': 'Heavy Rain',
      'badai': 'Storm'
    };
    return mapping[kondisi] || 'Partly Cloudy';
  }

  private mapSafetyLevel(tingkat: string): 'SAFE' | 'CAUTION' | 'DANGER' {
    const mapping: { [key: string]: 'SAFE' | 'CAUTION' | 'DANGER' } = {
      'aman': 'SAFE',
      'hati-hati': 'CAUTION',
      'berbahaya': 'DANGER'
    };
    return mapping[tingkat] || 'SAFE';
  }

  private mapZoneTypeToSafety(zoneType: string): 'SAFE' | 'CAUTION' | 'DANGER' {
    const mapping: { [key: string]: 'SAFE' | 'CAUTION' | 'DANGER' } = {
      'fishing': 'SAFE',
      'conservation': 'CAUTION',
      'restricted': 'DANGER',
      'special': 'CAUTION'
    };
    return mapping[zoneType] || 'SAFE';
  }

  private calculatePolygonRadius(coordinates: any[]): number {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      console.warn('Invalid coordinates for polygon radius calculation');
      return 5;
    }
    
    try {
      // Handle different coordinate formats
      let validCoords = coordinates;
      
      // If coordinates are nested arrays (GeoJSON format)
      if (coordinates[0] && Array.isArray(coordinates[0])) {
        validCoords = coordinates[0];
      }
      
      // Filter out invalid coordinates
      validCoords = validCoords.filter(coord => {
        return coord && 
               typeof coord === 'object' && 
               (coord.lat !== undefined || coord.latitude !== undefined) && 
               (coord.lng !== undefined || coord.longitude !== undefined);
      });
      
      if (validCoords.length === 0) {
        console.warn('No valid coordinates found for radius calculation');
        return 5;
      }
      
      // Calculate center point
      const centerLat = validCoords.reduce((sum, coord) => {
        return sum + (coord.lat || coord.latitude || 0);
      }, 0) / validCoords.length;
      
      const centerLng = validCoords.reduce((sum, coord) => {
        return sum + (coord.lng || coord.longitude || 0);
      }, 0) / validCoords.length;
      
      // Find maximum distance from center
      let maxDistance = 0;
      validCoords.forEach(coord => {
        const lat = coord.lat || coord.latitude || 0;
        const lng = coord.lng || coord.longitude || 0;
        const distance = this.calculateDistance(centerLat, centerLng, lat, lng);
        if (distance > maxDistance) maxDistance = distance;
      });
      
      return Math.round(maxDistance) || 5;
    } catch (error) {
      console.error('Error calculating polygon radius:', error);
      return 5;
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private generateAdvice(safetyData: any): string {
    if (safetyData.isSafe) {
      return 'Kondisi aman untuk berlayar. Tetap waspada terhadap perubahan cuaca.';
    } else {
      const details = safetyData.detail || {};
      if (details.kecepatanAngin > 40) {
        return 'Angin kencang! Tunda keberangkatan hingga kondisi membaik.';
      } else if (details.tinggiGelombang > 3) {
        return 'Gelombang tinggi! Hanya kapal besar yang disarankan berlayar.';
      } else {
        return 'Kondisi cuaca kurang baik. Pertimbangkan untuk menunda perjalanan.';
      }
    }
  }
}

export const realDataService = new RealDataService();