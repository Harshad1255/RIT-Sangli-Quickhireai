import React, { useState, useEffect } from 'react';
import './SuspiciousActivityMonitor.css';

const SuspiciousActivityMonitor = ({ 
  isActive, 
  suspiciousActivities, 
  tabSwitchCount, 
  onActivityReport 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [activityLevel, setActivityLevel] = useState('low');

  useEffect(() => {
    // Calculate activity level based on suspicious activities
    const activityCount = suspiciousActivities.length;
    if (activityCount === 0) {
      setActivityLevel('low');
    } else if (activityCount <= 3) {
      setActivityLevel('medium');
    } else {
      setActivityLevel('high');
    }
  }, [suspiciousActivities]);

  const getActivityIcon = () => {
    switch (activityLevel) {
      case 'low':
        return '•';
      case 'medium':
        return '•';
      case 'high':
        return '•';
      default:
        return '•';
    }
  };

  const getActivityMessage = () => {
    switch (activityLevel) {
      case 'low':
        return 'No suspicious activity detected';
      case 'medium':
        return 'Some suspicious activity detected';
      case 'high':
        return 'High level of suspicious activity';
      default:
        return 'Monitoring active';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getActivityTypeIcon = (type) => {
    const icons = {
      'tab_switch': 'T',
      'tab_return': 'R',
      'right_click': 'M',
      'keyboard_shortcut': 'K',
      'developer_tools': 'D',
      'inactivity': 'I'
    };
    return icons[type] || '!';
  };

  const getActivityTypeLabel = (type) => {
    const labels = {
      'tab_switch': 'Tab Switch',
      'tab_return': 'Tab Return',
      'right_click': 'Right Click',
      'keyboard_shortcut': 'Keyboard Shortcut',
      'developer_tools': 'Developer Tools',
      'inactivity': 'Inactivity'
    };
    return labels[type] || 'Unknown';
  };

  const handleReportActivity = () => {
    if (onActivityReport) {
      onActivityReport({
        suspiciousActivities,
        tabSwitchCount,
        activityLevel,
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="suspicious-activity-monitor">
      {/* Main Monitor Display */}
      <div className={`monitor-header ${activityLevel}`}>
        <div className="monitor-icon">
          {getActivityIcon()}
        </div>
        <div className="monitor-info">
          <div className="monitor-status">
            {isActive ? 'Monitoring Active' : 'Monitoring Paused'}
          </div>
          <div className="monitor-message">
            {getActivityMessage()}
          </div>
        </div>
        <div className="monitor-actions">
          <button 
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            aria-label={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="activity-summary">
        <div className="summary-item">
          <span className="summary-label">Tab Switches:</span>
          <span className={`summary-value ${tabSwitchCount > 2 ? 'warning' : ''}`}>
            {tabSwitchCount}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Suspicious Activities:</span>
          <span className={`summary-value ${suspiciousActivities.length > 3 ? 'warning' : ''}`}>
            {suspiciousActivities.length}
          </span>
        </div>
      </div>

      {/* Detailed Activity Log */}
      {showDetails && (
        <div className="activity-details">
          <div className="details-header">
            <h4>Activity Log</h4>
            <button 
              className="report-button"
              onClick={handleReportActivity}
              disabled={suspiciousActivities.length === 0}
            >
              Report Activity
            </button>
          </div>
          
          {suspiciousActivities.length === 0 ? (
            <div className="no-activity">
              <span className="no-activity-icon">✅</span>
              <p>No suspicious activities detected</p>
            </div>
          ) : (
            <div className="activity-list">
              {suspiciousActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {getActivityTypeIcon(activity.data.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-type">
                      {getActivityTypeLabel(activity.data.type)}
                    </div>
                    <div className="activity-time">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                    {activity.data.count && (
                      <div className="activity-count">
                        Count: {activity.data.count}
                      </div>
                    )}
                    {activity.data.duration && (
                      <div className="activity-duration">
                        Duration: {Math.round(activity.data.duration / 1000)}s
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning Banner for High Activity */}
      {activityLevel === 'high' && (
        <div className="warning-banner">
          <span className="warning-icon"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /></span>
          <span className="warning-text">
            High level of suspicious activity detected. This may affect your interview evaluation.
          </span>
        </div>
      )}
    </div>
  );
};

export default SuspiciousActivityMonitor; 