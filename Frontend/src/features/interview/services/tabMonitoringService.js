class TabMonitoringService {
  constructor() {
    this.isActive = true;
    this.lastActiveTime = Date.now();
    this.tabSwitchCount = 0;
    this.suspiciousActivities = [];
    this.warningThreshold = 3; // Number of tab switches before warning
    this.maxInactiveTime = 30000; // 30 seconds max inactive time
    this.monitoringInterval = null;
    this.onSuspiciousActivity = null;
    this.onTabSwitch = null;
    this.onInactivity = null;
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Monitor visibility changes (tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Monitor focus changes
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    
    // Monitor mouse and keyboard activity
    document.addEventListener('mousemove', this.handleActivity.bind(this));
    document.addEventListener('keydown', this.handleActivity.bind(this));
    document.addEventListener('click', this.handleActivity.bind(this));
    
    // Start periodic monitoring
    this.startPeriodicMonitoring();
    
    // Monitor for developer tools
    this.monitorDeveloperTools();
    
    // Monitor for right-click context menu
    document.addEventListener('contextmenu', this.handleRightClick.bind(this));
    
    // Monitor for keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.handleTabSwitch();
    } else {
      this.handleTabReturn();
    }
  }

  handleFocus() {
    this.isActive = true;
    this.lastActiveTime = Date.now();
    this.logActivity('Tab focused');
  }

  handleBlur() {
    this.isActive = false;
    this.logActivity('Tab blurred');
  }

  handleActivity() {
    this.lastActiveTime = Date.now();
    this.isActive = true;
  }

  handleTabSwitch() {
    this.tabSwitchCount++;
    this.logSuspiciousActivity('Tab switch detected', {
      type: 'tab_switch',
      count: this.tabSwitchCount,
      timestamp: Date.now()
    });

    if (this.onTabSwitch) {
      this.onTabSwitch({
        type: 'tab_switch',
        count: this.tabSwitchCount,
        timestamp: Date.now()
      });
    }

    // Show warning if too many switches
    if (this.tabSwitchCount >= this.warningThreshold) {
      this.showWarning('Multiple tab switches detected. This may affect your interview evaluation.');
    }
  }

  handleTabReturn() {
    const timeAway = Date.now() - this.lastActiveTime;
    this.logSuspiciousActivity('Tab returned after being away', {
      type: 'tab_return',
      timeAway: timeAway,
      timestamp: Date.now()
    });
  }

  handleRightClick(event) {
    event.preventDefault();
    this.logSuspiciousActivity('Right-click context menu attempted', {
      type: 'right_click',
      timestamp: Date.now()
    });
    return false;
  }

  handleKeyboardShortcuts(event) {
    const suspiciousShortcuts = [
      'F12', // Developer tools
      'Ctrl+Shift+I', // Developer tools
      'Ctrl+Shift+C', // Developer tools
      'Ctrl+U', // View source
      'Ctrl+Shift+J', // Console
      'F5', // Refresh
      'Ctrl+R', // Refresh
      'Ctrl+Shift+R', // Hard refresh
      'Alt+Tab', // Switch applications
      'Ctrl+Tab', // Switch tabs
      'Ctrl+W', // Close tab
      'Ctrl+T', // New tab
      'Ctrl+N', // New window
    ];

    const pressedKeys = [];
    if (event.ctrlKey) pressedKeys.push('Ctrl');
    if (event.shiftKey) pressedKeys.push('Shift');
    if (event.altKey) pressedKeys.push('Alt');
    if (event.metaKey) pressedKeys.push('Meta');
    pressedKeys.push(event.key);

    const keyCombination = pressedKeys.join('+');

    if (suspiciousShortcuts.includes(keyCombination)) {
      event.preventDefault();
      this.logSuspiciousActivity(`Suspicious keyboard shortcut: ${keyCombination}`, {
        type: 'keyboard_shortcut',
        keys: keyCombination,
        timestamp: Date.now()
      });
      return false;
    }
  }

  monitorDeveloperTools() {
    // Check for developer tools periodically
    this.monitoringInterval = setInterval(() => {
      const devtools = {
        open: false,
        orientation: null
      };

      const threshold = 160;

      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        devtools.open = true;
        devtools.orientation = window.outerHeight - window.innerHeight > threshold ? 'vertical' : 'horizontal';
      }

      if (devtools.open) {
        this.logSuspiciousActivity('Developer tools detected', {
          type: 'developer_tools',
          orientation: devtools.orientation,
          timestamp: Date.now()
        });
      }
    }, 1000);
  }

  startPeriodicMonitoring() {
    setInterval(() => {
      const currentTime = Date.now();
      const inactiveTime = currentTime - this.lastActiveTime;

      // Check for extended inactivity
      if (inactiveTime > this.maxInactiveTime && this.isActive) {
        this.logSuspiciousActivity('Extended inactivity detected', {
          type: 'inactivity',
          duration: inactiveTime,
          timestamp: currentTime
        });

        if (this.onInactivity) {
          this.onInactivity({
            type: 'inactivity',
            duration: inactiveTime,
            timestamp: currentTime
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  logActivity(message) {
    console.log(`[Tab Monitor] ${message}`);
  }

  logSuspiciousActivity(message, data) {
    const activity = {
      message,
      data,
      timestamp: Date.now()
    };

    this.suspiciousActivities.push(activity);
    console.warn(`[Suspicious Activity] ${message}`, data);

    if (this.onSuspiciousActivity) {
      this.onSuspiciousActivity(activity);
    }
  }

  showWarning(message) {
    // Create warning notification
    const warningDiv = document.createElement('div');
    warningDiv.className = 'interview-warning';
    warningDiv.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon" aria-hidden="true">!</span>
        <span class="warning-text">${message}</span>
        <button class="warning-dismiss" type="button" aria-label="Dismiss warning" onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    
    // Add styles
    warningDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
      z-index: 10000;
      font-family: inherit;
      font-weight: 600;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(warningDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (warningDiv.parentElement) {
        warningDiv.remove();
      }
    }, 5000);
  }

  getSuspiciousActivities() {
    return this.suspiciousActivities;
  }

  getTabSwitchCount() {
    return this.tabSwitchCount;
  }

  getActivitySummary() {
    return {
      tabSwitchCount: this.tabSwitchCount,
      suspiciousActivities: this.suspiciousActivities.length,
      lastActiveTime: this.lastActiveTime,
      isActive: this.isActive
    };
  }

  setCallbacks(callbacks) {
    this.onSuspiciousActivity = callbacks.onSuspiciousActivity;
    this.onTabSwitch = callbacks.onTabSwitch;
    this.onInactivity = callbacks.onInactivity;
  }

  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleActivity);
    document.removeEventListener('keydown', this.handleActivity);
    document.removeEventListener('click', this.handleActivity);
    document.removeEventListener('contextmenu', this.handleRightClick);
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
  }
}

export default TabMonitoringService; 