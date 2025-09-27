import React from 'react';
import { FaWifi, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import './StatusIndicator.css';

const StatusIndicator = ({ connectionStatus, lastUpdate, isLoading, apiFailureCount, onResetApi }) => {
  const getConnectionIcon = () => {
    if (isLoading) return <FaClock className="status-icon loading" />;
    if (connectionStatus.connected) return <FaCheckCircle className="status-icon connected" />;
    if (connectionStatus.reconnectAttempts > 0) return <FaExclamationTriangle className="status-icon reconnecting" />;
    return <FaWifi className="status-icon disconnected" />;
  };

  const getConnectionText = () => {
    if (isLoading) return 'Loading...';
    if (connectionStatus.connected) return 'Connected';
    if (connectionStatus.reconnectAttempts > 0) return `Reconnecting... (${connectionStatus.reconnectAttempts}/5)`;
    return 'Disconnected';
  };

  const getStatusClass = () => {
    if (isLoading) return 'status-loading';
    if (connectionStatus.connected) return 'status-connected';
    if (connectionStatus.reconnectAttempts > 0) return 'status-reconnecting';
    return 'status-disconnected';
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const update = new Date(timestamp);
    const diffMs = now - update;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return update.toLocaleDateString();
  };

  return (
    <div className={`status-indicator ${getStatusClass()}`}>
      <div className="status-connection">
        {getConnectionIcon()}
        <span className="status-text">{getConnectionText()}</span>
      </div>
      {lastUpdate && (
        <div className="status-update">
          <span className="status-label">Last Update:</span>
          <span className="status-time">{formatLastUpdate(lastUpdate)}</span>
        </div>
      )}
      {apiFailureCount > 5 && (
        <div className="status-warning">
          <span className="status-label">API Issues:</span>
          <span className="status-error">{apiFailureCount} failures</span>
          {onResetApi && (
            <button className="reset-api-btn" onClick={onResetApi} title="Reset API connection">
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;