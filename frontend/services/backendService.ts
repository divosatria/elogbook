import { API_URLS, API_CONFIG } from '../config/urls';
import { safeLog } from '../utils/security';
import ENV from '../config/environment';

class BackendService {
  public baseURL = ENV.API_BASE_URL;
  private csrfToken: string | null = null;
  
  private async fetchCsrfToken() {
    try {
      if (this.csrfToken) return; // Already have token
      
      const response = await fetch(`${this.baseURL}/api/csrf-token`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          this.csrfToken = data.csrfToken;
          safeLog.info('CSRF token fetched successfully');
        }
      }
    } catch (error) {
      safeLog.error('Failed to fetch CSRF token', error);
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Wait a bit to ensure token is available
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Ensure we have CSRF token for non-GET requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
      if (!this.csrfToken) {
        await this.fetchCsrfToken();
      }
    }

    const token = localStorage.getItem('token');
    safeLog.info('Making request to API endpoint', { endpoint });
    safeLog.info('Token status', token ? 'Present' : 'Missing');
    
    // Build full URL with base URL
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    // Add timestamp to bypass cache
    const separator = fullUrl.includes('?') ? '&' : '?';
    const cacheBuster = `${separator}_t=${Date.now()}`;
    const finalEndpoint = `${fullUrl}${cacheBuster}`;
    
    const isFormData = options.body instanceof FormData;
    
    try {
      safeLog.info('Final request URL', { url: finalEndpoint });
      const response = await fetch(finalEndpoint, {
        headers: {
          ...(!isFormData && { 'Content-Type': 'application/json' }),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }),
          ...options.headers,
        },
        ...options,
      });

      safeLog.info('Response status', { status: response.status });
      
      if (response.status === 401) {
        // Token expired or invalid, clear it
        safeLog.info('Token invalid, clearing localStorage');
        localStorage.removeItem('token');
        throw new Error('UNAUTHORIZED');
      }
      
      if (!response.ok) {
        let errorMessage = 'Terjadi kesalahan pada server';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          if (errorData.error) errorMessage += ` | ${errorData.error}`;
          if (errorData.details) errorMessage += ` | Details: ${Array.isArray(errorData.details) ? errorData.details.join(', ') : JSON.stringify(errorData.details)}`;
        } catch {
          const errorText = await response.text().catch(() => 'Unknown error');
          // Parse common error patterns
          if (errorText.includes('dokumen')) {
            errorMessage = 'Dokumen tidak lengkap atau tidak valid';
          } else if (errorText.includes('unauthorized') || errorText.includes('401')) {
            errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang';
          } else if (errorText.includes('forbidden') || errorText.includes('403')) {
            errorMessage = 'Anda tidak memiliki akses untuk melakukan operasi ini';
          } else if (errorText.includes('not found') || errorText.includes('404')) {
            errorMessage = 'Data yang dicari tidak ditemukan';
          } else if (response.status >= 500) {
            errorMessage = 'Server sedang bermasalah. Silakan coba lagi nanti';
          }
        }
        
        safeLog.error('HTTP error for endpoint', { endpoint: finalEndpoint, status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        safeLog.error('Non-JSON response received', { endpoint: finalEndpoint, contentType, response: textResponse.substring(0, 200) });
        throw new Error(`Expected JSON response but got: ${contentType}. Response: ${textResponse.substring(0, 100)}...`);
      }

      const data = await response.json();
      safeLog.info('Response received successfully');
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        safeLog.error('Network error - backend may be offline', { baseURL: this.baseURL, endpoint });
        throw new Error('NETWORK_ERROR');
      }
      throw error;
    }
  }

  // Public request method for external use
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, options);
  }

  // Auth
  async login(username: string, password: string) {
    const response = await this.makeRequest<any>(API_URLS.login, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return response;
  }

  // Mobile Login - khusus untuk mobile app dengan email dan password
  async mobileLogin(email: string, password: string) {
    const response = await this.makeRequest<any>(API_URLS.mobileLogin, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response;
  }

  async register(userData: any) {
    return this.makeRequest<any>(API_URLS.register, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.makeRequest<any>(API_URLS.profile);
  }

  // Dashboard
  async getDashboardData(period: string = 'month') {
    return this.makeRequest<any>(`${API_URLS.dashboard}?period=${period}`);
  }

  // Catch Reports
  async getCatchReports(): Promise<any[]> {
    const response = await this.makeRequest<any>(API_URLS.reports);
    return response.data || response || [];
  }

  async getMobileCatchReports(): Promise<any[]> {
    const response = await this.makeRequest<any>(API_URLS.MOBILE.CATCHES.LIST);
    return response.data || response || [];
  }

  async submitCatchReport(report: any): Promise<any> {
    return this.makeRequest<any>(API_URLS.reports, {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async updateCatchReport(reportId: string, report: any): Promise<any> {
    return this.makeRequest<any>(`${API_URLS.reports}/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(report),
    });
  }

  async deleteCatchReport(reportId: string): Promise<any> {
    return this.makeRequest<any>(`${API_URLS.reports}/${reportId}`, {
      method: 'DELETE',
    });
  }

  // Trips
  async getTrips(): Promise<any> {
    const response = await this.makeRequest<any>(API_URLS.trips);
    return response.data || response || [];
  }

  async createTrip(tripData: any) {
    return this.makeRequest<any>(API_URLS.trips, {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  async createTripTask(taskData: any) {
    return this.makeRequest<any>(`${API_URLS.trips}/task`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async completeTripTask(tripId: string, completionData: any) {
    return this.makeRequest<any>(`${API_URLS.trips}/${tripId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(completionData),
    });
  }

  async updateTripStatus(tripId: string, status: string, catatan?: string) {
    return this.makeRequest<any>(`/api/trip/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, catatan }),
    });
  }

  async deleteTrip(tripId: string) {
    return this.makeRequest<any>(`/api/trip/${tripId}`, {
      method: 'DELETE',
    });
  }

  async updateTripDocuments(tripId: string, dokumen: any) {
    return this.makeRequest<any>(`${API_URLS.trips}/${tripId}/documents`, {
      method: 'PATCH',
      body: JSON.stringify({ dokumen }),
    });
  }

  // Document approval per dokumen
  async approveDocument(tripId: string, documentType: string, approved: boolean, catatan?: string) {
    return this.makeRequest<any>(`/api/trip/${tripId}/document/${documentType}`, {
      method: 'PATCH',
      body: JSON.stringify({ approved, catatan }),
    });
  }

  // Document Verification (Admin)
  async getPendingDocuments() {
    return this.makeRequest<any>(API_URLS.ADMIN.DOCUMENTS.PENDING);
  }

  async approveUserDocument(userId: string, docId: string) {
    return this.makeRequest<any>(API_URLS.ADMIN.DOCUMENTS.APPROVE(userId, docId), {
      method: 'PATCH'
    });
  }

  async rejectDocument(userId: string, docId: string, reason: string) {
    return this.makeRequest<any>(API_URLS.ADMIN.DOCUMENTS.REJECT(userId, docId), {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  }

  // Delete Document by Admin
  async deleteDocument(userId: string, docId: string) {
    return this.makeRequest<any>(API_URLS.ADMIN.DOCUMENTS.DELETE(userId, docId), {
      method: 'DELETE'
    });
  }

  // Clean vessel data
  async cleanVesselData(vesselId: string) {
    return this.makeRequest<any>(`/api/trip/clean-vessel/${vesselId}`, {
      method: 'POST',
    });
  }

  // Debug methods for checking vessel data
  async getVesselFuelData(vesselId: string) {
    return this.makeRequest<any>(`/api/mobile/vessel/${vesselId}/bahan-bakar`);
  }

  async getVesselIceData(vesselId: string) {
    return this.makeRequest<any>(`/api/mobile/vessel/${vesselId}/ice-data`);
  }

  async getVesselIceDataDebug(vesselId: string) {
    return this.makeRequest<any>(`/api/mobile/vessel/${vesselId}/ice-data-debug`);
  }

  async getVesselDocuments(vesselId: string) {
    return this.makeRequest<any>(`/api/mobile/vessel/${vesselId}/documents-debug`);
  }

  // Vessels (Kapal)
  async getVessels(): Promise<any[]> {
    const response = await this.makeRequest<any>(API_URLS.vessels);
    return response.data || response || [];
  }

  async createVessel(vesselData: any) {
    return this.makeRequest<any>(API_URLS.vessels, {
      method: 'POST',
      body: JSON.stringify(vesselData),
    });
  }

  async updateVessel(vesselId: string, vesselData: any) {
    return this.makeRequest<any>(API_URLS.vesselById(vesselId), {
      method: 'PUT',
      body: JSON.stringify(vesselData),
    });
  }

  async deleteVessel(vesselId: string) {
    return this.makeRequest<any>(API_URLS.vesselById(vesselId), {
      method: 'DELETE',
    });
  }

  async updateVesselLocation(vesselId: string, latitude: number, longitude: number, speed?: number, heading?: number) {
    return this.makeRequest<any>(`${API_URLS.vesselById(vesselId)}/location`, {
      method: 'POST',
      body: JSON.stringify({ 
        latitude, 
        longitude, 
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date().toISOString()
      }),
    });
  }

  async updateVesselZone(tripId: string, zoneId: string) {
    return this.makeRequest<any>(`/api/trip/${tripId}/zone`, {
      method: 'PATCH',
      body: JSON.stringify({ harborZoneId: zoneId }),
    });
  }

  async getVesselsByZone(zoneId: string) {
    return this.makeRequest<any>(`/api/harbor-zones/${zoneId}/vessels`);
  }

  // Get active vessels with GPS tracking
  async getActiveVessels() {
    const response = await this.makeRequest<any>(`${API_URLS.vessels}/active`);
    return response.data || response || { vessels: [], totalVessels: 0, activeGPSVessels: 0 };
  }

  // Get vessel GPS history
  async getVesselGPSHistory(vesselId: string, startDate?: string, endDate?: string, limit?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (limit) params.append('limit', limit.toString());
    
    const url = `${API_URLS.vesselById(vesselId)}/gps-history${params.toString() ? '?' + params.toString() : ''}`;
    return this.makeRequest<any>(url);
  }

  // Weather Safety Check
  async checkWeatherSafety(lat?: number, lng?: number) {
    try {
      const params = new URLSearchParams();
      if (lat) params.append('latitude', lat.toString());
      if (lng) params.append('longitude', lng.toString());
      
      const url = `${API_URLS.weatherSafetyCheck}${params.toString() ? '?' + params.toString() : ''}`;
      return await this.makeRequest<any>(url);
    } catch (error) {
      console.warn('Weather safety check unavailable:', error.message);
      return {
        success: false,
        message: 'Layanan cuaca tidak tersedia',
        data: {
          safe: true, // Default safe untuk fallback
          conditions: 'Data cuaca tidak tersedia'
        }
      };
    }
  }

  // SOS Alerts
  async getSOSAlerts() {
    try {
      return await this.makeRequest<any>(API_URLS.emergency);
    } catch (error) {
      console.warn('SOS alerts unavailable:', error.message);
      return {
        success: true,
        data: [] // Return empty array as fallback
      };
    }
  }

  // Weather Data
  async getWeatherData(lat: number, lng: number) {
    try {
      return await this.makeRequest<any>(`${API_URLS.weatherCurrent}?latitude=${lat}&longitude=${lng}`);
    } catch (error) {
      console.warn('Weather data unavailable:', error.message);
      return {
        success: false,
        message: 'Data cuaca tidak tersedia',
        data: {
          suhu: 28,
          kelembaban: 75,
          kecepatanAngin: 15,
          arahAngin: 'SW',
          tinggiGelombang: 1.2,
          visibility: 10,
          kondisi: 'berawan'
        }
      };
    }
  }

  // Catch Polygons
  async getCatchPolygons() {
    try {
      return await this.makeRequest<any>('/api/catch-polygons');
    } catch (error) {
      console.warn('Catch polygons unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }

  async createCatchPolygon(polygonData: any) {
    return this.makeRequest<any>('/api/catch-polygons', {
      method: 'POST',
      body: JSON.stringify(polygonData),
    });
  }

  async updateCatchPolygon(polygonId: string, polygonData: any) {
    return this.makeRequest<any>(`/api/catch-polygons/${polygonId}`, {
      method: 'PUT',
      body: JSON.stringify(polygonData),
    });
  }

  async deleteCatchPolygon(polygonId: string) {
    return this.makeRequest<any>(`/api/catch-polygons/${polygonId}`, {
      method: 'DELETE',
    });
  }

  async toggleCatchPolygonStatus(polygonId: string) {
    return this.makeRequest<any>(`/api/catch-polygons/${polygonId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // Notifications
  async getNotifications(unreadOnly = false, limit = 20) {
    return this.makeRequest<any>(`/api/notifications?unreadOnly=${unreadOnly}&limit=${limit}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.makeRequest<any>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async sendNotification(notificationData: any) {
    return this.makeRequest<any>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  // Harbor Zones
  async getHarborZones() {
    try {
      return await this.makeRequest<any>('/api/harbor-zones');
    } catch (error) {
      console.warn('Harbor zones unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }

  async createHarborZone(zoneData: any) {
    return this.makeRequest<any>('/api/harbor-zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  }

  async updateHarborZone(zoneId: string, zoneData: any) {
    return this.makeRequest<any>(`/api/harbor-zones/${zoneId}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    });
  }

  async deleteHarborZone(zoneId: string) {
    return this.makeRequest<any>(`/api/harbor-zones/${zoneId}`, {
      method: 'DELETE',
    });
  }

  async toggleHarborZoneStatus(zoneId: string) {
    return this.makeRequest<any>(`/api/harbor-zones/${zoneId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // Harbor POIs
  async getHarborPOIs() {
    try {
      return await this.makeRequest<any>('/api/harbor-pois');
    } catch (error) {
      console.warn('Harbor POIs unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }

  async createHarborPOI(poiData: any) {
    return this.makeRequest<any>('/api/harbor-pois', {
      method: 'POST',
      body: JSON.stringify(poiData),
    });
  }

  async updateHarborPOI(poiId: string, poiData: any) {
    return this.makeRequest<any>(`/api/harbor-pois/${poiId}`, {
      method: 'PUT',
      body: JSON.stringify(poiData),
    });
  }

  async deleteHarborPOI(poiId: string) {
    return this.makeRequest<any>(`/api/harbor-pois/${poiId}`, {
      method: 'DELETE',
    });
  }

  // Users
  async getUsers() {
    try {
      return await this.makeRequest<any>(API_URLS.users);
    } catch (error) {
      console.warn('Users data unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }

  // Resolve SOS Alert
  async resolveSOSAlert(alertId: string) {
    try {
      return await this.makeRequest<any>(`${API_URLS.emergency}/${alertId}/resolve`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.warn('Failed to resolve SOS alert:', error.message);
      return {
        success: true,
        message: 'SOS alert resolved (offline mode)'
      };
    }
  }

  // Nelayan (Fishermen)
  async getFishermen() {
    const response = await this.makeRequest<any>(API_URLS.fishermen);
    return response.data || response || [];
  }

  async createFisherman(fishermanData: any) {
    return this.makeRequest<any>(API_URLS.fishermen, {
      method: 'POST',
      body: JSON.stringify(fishermanData),
    });
  }

  async updateFisherman(fishermanId: string, fishermanData: any) {
    return this.makeRequest<any>(API_URLS.fishermanById(fishermanId), {
      method: 'PUT',
      body: JSON.stringify(fishermanData),
    });
  }

  async deleteFisherman(fishermanId: string) {
    return this.makeRequest<any>(API_URLS.fishermanById(fishermanId), {
      method: 'DELETE',
    });
  }

  // Users
  async createUser(userData: any) {
    const isFormData = userData instanceof FormData;
    return this.makeRequest<any>(API_URLS.users, {
      method: 'POST',
      body: isFormData ? userData : JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    const isFormData = userData instanceof FormData;
    return this.makeRequest<any>(API_URLS.userById(userId), {
      method: 'PUT',
      body: isFormData ? userData : JSON.stringify(userData),
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    return this.makeRequest<any>(API_URLS.usersToggleStatus(userId), {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteUser(userId: string) {
    return this.makeRequest<any>(API_URLS.userById(userId), {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
  }

  // Analytics
  async getAnalyticsData(period: string = 'month') {
    return this.makeRequest<any>(`${API_URLS.analytics}?period=${period}`);
  }

  // Settings
  async getSettings() {
    return this.makeRequest<any>(API_URLS.settings);
  }

  async updateSettings(settings: any) {
    return this.makeRequest<any>(API_URLS.settings, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // File Upload
  async uploadFile(file: File, type: string = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.makeRequest<any>(API_URLS.upload, {
      method: 'POST',
      body: formData,
    });
  }

  // Backup & Restore
  async createBackup() {
    return this.makeRequest<any>(API_URLS.backup, {
      method: 'POST',
    });
  }

  async getBackups() {
    const response = await this.makeRequest<any>(API_URLS.backup);
    return response.data || response || [];
  }

  async restoreBackup(backupId: string) {
    return this.makeRequest<any>(`${API_URLS.backup}/${backupId}/restore`, {
      method: 'POST',
    });
  }

  async deleteBackup(backupId: string) {
    return this.makeRequest<any>(`${API_URLS.backup}/${backupId}`, {
      method: 'DELETE',
    });
  }

  // Fish Prices
  async getFishPrices() {
    try {
      return await this.makeRequest<any>('/api/fish-prices');
    } catch (error) {
      console.warn('Fish prices unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }

  async createFishPrice(fishPriceData: any) {
    return this.makeRequest<any>('/api/fish-prices', {
      method: 'POST',
      body: JSON.stringify(fishPriceData),
    });
  }

  async updateFishPrice(fishPriceId: number, fishPriceData: any) {
    return this.makeRequest<any>(`/api/fish-prices/${fishPriceId}`, {
      method: 'PUT',
      body: JSON.stringify(fishPriceData),
    });
  }

  async deleteFishPrice(fishPriceId: number) {
    return this.makeRequest<any>(`/api/fish-prices/${fishPriceId}`, {
      method: 'DELETE',
    });
  }

  // Signature Settings for PDF Export
  async getSignatureSettings() {
    try {
      const result = await this.makeRequest<any>('/api/admin/signature');
      return result;
    } catch (error: any) {
      // Return default values if can't access (e.g., not admin role)
      // This allows PDF generation to work for all users
      console.info('Using default signature settings for PDF');
      return {
        name: 'Kepala Dinas Kelautan dan Perikanan',
        position: 'Kepala Dinas',
        signature_image_path: null
      };
    }
  }

  async getTripLogbookData(tripId: string) {
    return this.makeRequest<any>(`/api/trip/${tripId}/logbook-data`);
  }

  // Fishing Points
  async getFishingPoints(tripId?: string, kapalId?: string) {
    const params = new URLSearchParams();
    if (tripId) params.append('tripId', tripId);
    if (kapalId) params.append('kapalId', kapalId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest<any>(`/api/fishing-points${qs}`);
  }

  async deleteFishingPoint(pointId: string, deleteRelatedCatches = false) {
    return this.makeRequest<any>(
      `/api/fishing-points/${pointId}?deleteRelatedCatches=${deleteRelatedCatches}`,
      { method: 'DELETE' }
    );
  }

  async getFishingPointByCatch(catchId: string) {
    return this.makeRequest<any>(`/api/fishing-points/by-catch/${catchId}`);
  }

  async updateSignatureSettings(settingsData: { name: string; position: string }) {
    return this.makeRequest<any>('/api/admin/signature', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  async uploadSignatureImage(file: File) {
    const formData = new FormData();
    formData.append('signature', file);

    return this.makeRequest<any>('/api/admin/signature/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteSignatureImage() {
    return this.makeRequest<any>('/api/admin/signature/image', {
      method: 'DELETE',
    });
  }

  // Edge / IoT
  async getRawEdgeData(page: number = 1, limit: number = 100) {
    try {
      return await this.makeRequest<any>(`/api/edge/raw-data?page=${page}&limit=${limit}`);
    } catch (error: any) {
      console.warn('Raw edge data unavailable:', error.message);
      return {
        success: true,
        data: []
      };
    }
  }
}

export const backendAPI = new BackendService();
export default backendAPI;