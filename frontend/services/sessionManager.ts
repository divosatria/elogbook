class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private onLogoutCallback: (() => void) | null = null;

  constructor() {
    this.setupActivityListeners();
  }

  // Initialize session timeout
  startSession(onLogout: () => void) {
    this.onLogoutCallback = onLogout;
    this.updateLastActivity();
    this.resetTimeout();
  }

  // Reset the timeout when user is active
  private resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.logout();
    }, this.TIMEOUT_DURATION);
  }

  // Update last activity timestamp
  private updateLastActivity() {
    localStorage.setItem('lastActivity', Date.now().toString());
  }

  // Check if session is still valid
  isSessionValid(): boolean {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return false;

    const timeDiff = Date.now() - parseInt(lastActivity);
    return timeDiff < this.TIMEOUT_DURATION;
  }

  // Handle user activity
  private handleActivity = () => {
    if (this.onLogoutCallback) {
      this.updateLastActivity();
      this.resetTimeout();
    }
  };

  // Setup event listeners for user activity
  private setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  // Logout user
  private logout() {
    console.log('🕐 Session expired due to inactivity');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    
    if (this.onLogoutCallback) {
      this.onLogoutCallback();
    }
  }

  // Manual logout
  endSession() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    this.onLogoutCallback = null;
  }

  // Clean up event listeners
  destroy() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

export const sessionManager = new SessionManager();