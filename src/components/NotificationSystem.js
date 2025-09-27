import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaBell } from 'react-icons/fa';
import './NotificationSystem.css';

const NotificationSystem = ({ notifications, onRemove, onClearAll }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsVisible(true);
    }
  }, [notifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <FaCheckCircle className="notification-icon success" />;
      case 'warning': return <FaExclamationTriangle className="notification-icon warning" />;
      case 'error': return <FaExclamationTriangle className="notification-icon error" />;
      case 'flood-alert': return <FaBell className="notification-icon flood-alert" />;
      default: return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const getNotificationClass = (type, priority) => {
    let baseClass = `notification notification-${type}`;
    if (priority === 'high') {
      baseClass += ' notification-high-priority';
    }
    return baseClass;
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      <div className="notification-header">
        <span className="notification-title">
          <FaBell /> Alerts ({notifications.length})
        </span>
        {notifications.length > 1 && (
          <button 
            className="clear-all-btn" 
            onClick={onClearAll}
            title="Clear all notifications"
          >
            Clear All
          </button>
        )}
        <button 
          className="hide-notifications-btn" 
          onClick={() => setIsVisible(false)}
          title="Hide notifications"
        >
          <FaTimes />
        </button>
      </div>
      
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={getNotificationClass(notification.type, notification.priority)}
          >
            <div className="notification-content">
              {getIcon(notification.type)}
              <div className="notification-text">
                <div className="notification-message">{notification.message}</div>
                {notification.details && (
                  <div className="notification-details">{notification.details}</div>
                )}
                <div className="notification-time">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <button 
              className="notification-close" 
              onClick={() => onRemove(notification.id)}
              title="Dismiss"
            >
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSystem;