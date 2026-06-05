import { useState, useEffect } from 'react';

interface MapsStatus {
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
  canUseGPS: boolean;
}

export const useMapsDetection = () => {
  const [status, setStatus] = useState<MapsStatus>({
    isBlocked: false,
    isLoading: true,
    error: null,
    canUseGPS: false
  });

  useEffect(() => {
    const detectMapsAndGPS = async () => {
      setStatus(prev => ({ ...prev, isLoading: true }));

      try {
        // Test 1: Check if Leaflet CDN is accessible
        const testLeafletCSS = () => {
          return new Promise<boolean>((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            
            const timeout = setTimeout(() => {
              resolve(false);
            }, 5000);

            link.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };

            link.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };

            document.head.appendChild(link);
          });
        };

        // Test 2: Check if OpenStreetMap tiles are accessible
        const testOSMTiles = () => {
          return new Promise<boolean>((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
              resolve(false);
            }, 5000);

            img.onload = () => {
              clearTimeout(timeout);
              resolve(true);
            };

            img.onerror = () => {
              clearTimeout(timeout);
              resolve(false);
            };

            // Test with a basic OSM tile
            img.src = 'https://tile.openstreetmap.org/1/0/0.png';
          });
        };

        // Test 3: Check GPS availability
        const testGPS = () => {
          return new Promise<boolean>((resolve) => {
            if (!navigator.geolocation) {
              resolve(false);
              return;
            }

            const timeout = setTimeout(() => {
              resolve(false);
            }, 10000);

            navigator.geolocation.getCurrentPosition(
              () => {
                clearTimeout(timeout);
                resolve(true);
              },
              (error) => {
                clearTimeout(timeout);
                // Even if permission denied, GPS is available
                resolve(error.code !== error.POSITION_UNAVAILABLE);
              },
              {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000
              }
            );
          });
        };

        // Run all tests
        const [leafletOK, osmOK, gpsOK] = await Promise.all([
          testLeafletCSS(),
          testOSMTiles(),
          testGPS()
        ]);

        const mapsBlocked = !leafletOK || !osmOK;

        setStatus({
          isBlocked: mapsBlocked,
          isLoading: false,
          error: mapsBlocked ? 'Maps resources are blocked by network or browser' : null,
          canUseGPS: gpsOK
        });

        // Log results for debugging
        console.log('Maps Detection Results:', {
          leafletCSS: leafletOK,
          osmTiles: osmOK,
          gps: gpsOK,
          mapsBlocked
        });

      } catch (error) {
        console.error('Maps detection error:', error);
        setStatus({
          isBlocked: true,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          canUseGPS: false
        });
      }
    };

    // Only run detection once per session
    const hasRunDetection = sessionStorage.getItem('mapsDetectionRun');
    if (!hasRunDetection) {
      detectMapsAndGPS();
      sessionStorage.setItem('mapsDetectionRun', 'true');
    } else {
      // Use cached results if available
      const cachedResult = sessionStorage.getItem('mapsDetectionResult');
      if (cachedResult) {
        try {
          const parsed = JSON.parse(cachedResult);
          setStatus(parsed);
        } catch {
          detectMapsAndGPS();
        }
      } else {
        detectMapsAndGPS();
      }
    }
  }, []);

  // Cache results
  useEffect(() => {
    if (!status.isLoading) {
      sessionStorage.setItem('mapsDetectionResult', JSON.stringify(status));
    }
  }, [status]);

  return status;
};

// Hook untuk cek apakah user sudah dismiss notifikasi
export const useNotificationDismissed = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('mapsBlockedNotificationDismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  const dismissNotification = () => {
    localStorage.setItem('mapsBlockedNotificationDismissed', 'true');
    setIsDismissed(true);
  };

  const resetNotification = () => {
    localStorage.removeItem('mapsBlockedNotificationDismissed');
    setIsDismissed(false);
  };

  return {
    isDismissed,
    dismissNotification,
    resetNotification
  };
};