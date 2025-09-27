import React, { useState } from 'react';
import { FaQuestionCircle, FaTimes, FaMapMarkerAlt, FaEye, FaSearch, FaHome } from 'react-icons/fa';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const helpSections = {
    overview: {
      title: '🌊 FloodX Overview',
      content: (
        <div>
          <h3>Welcome to FloodX</h3>
          <p>FloodX is a comprehensive flood monitoring system that provides real-time water level data, predictions, and alerts for flood-prone areas.</p>
          
          <h4>Key Features:</h4>
          <ul>
            <li>🗺️ Interactive flood map with real-time water levels</li>
            <li>📊 Historical data analysis and trend visualization</li>
            <li>🔮 AI-powered flood predictions (24-hour forecast)</li>
            <li>🚨 Real-time flood alerts and notifications</li>
            <li>📱 Mobile-responsive design</li>
            <li>🌙 Dark/Light mode toggle</li>
          </ul>
          
          <h4>Data Sources:</h4>
          <p>FloodX integrates with multiple APIs including:</p>
          <ul>
            <li>Thailand's Royal Irrigation Department (RID)</li>
            <li>OpenStreetMap for location services</li>
            <li>Weather data integration</li>
          </ul>
        </div>
      )
    },
    navigation: {
      title: '🧭 Navigation Guide',
      content: (
        <div>
          <h3>How to Navigate FloodX</h3>
          
          <div className="help-feature">
            <FaMapMarkerAlt className="help-icon" />
            <div>
              <h4>Map Markers</h4>
              <p>Different colored markers represent water level status:</p>
              <ul>
                <li><span className="marker-green">🟢 Green:</span> Normal levels (&lt; 5m)</li>
                <li><span className="marker-orange">🟠 Orange:</span> Warning levels (5-8m)</li>
                <li><span className="marker-red">🔴 Red:</span> Danger levels (&gt; 8m)</li>
              </ul>
            </div>
          </div>

          <div className="help-feature">
            <FaSearch className="help-icon" />
            <div>
              <h4>Location Search</h4>
              <p>Use the search bar to find specific locations. Type a place name and press Enter to navigate there.</p>
            </div>
          </div>

          <div className="help-feature">
            <FaHome className="help-icon" />
            <div>
              <h4>Find Your Location</h4>
              <p>Click the "Home" button to automatically center the map on your current location using GPS.</p>
            </div>
          </div>

          <div className="help-feature">
            <FaEye className="help-icon" />
            <div>
              <h4>Station Details</h4>
              <p>Click on any marker to view detailed information including:</p>
              <ul>
                <li>Current water level</li>
                <li>Flow rate (Q)</li>
                <li>Ground level (ZG)</li>
                <li>Last update time</li>
                <li>Weather conditions</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    alerts: {
      title: '🚨 Alerts & Notifications',
      content: (
        <div>
          <h3>Understanding Alerts</h3>
          
          <div className="alert-type">
            <div className="alert-indicator normal">Normal</div>
            <div>
              <h4>Normal Status</h4>
              <p>Water levels are within safe parameters. No immediate flood risk.</p>
            </div>
          </div>

          <div className="alert-type">
            <div className="alert-indicator warning">Warning</div>
            <div>
              <h4>Warning Status</h4>
              <p>Water levels are elevated. Monitor conditions closely for potential flooding.</p>
            </div>
          </div>

          <div className="alert-type">
            <div className="alert-indicator danger">Danger</div>
            <div>
              <h4>Danger Status</h4>
              <p>High flood risk! Take immediate precautions and follow evacuation procedures if advised.</p>
            </div>
          </div>

          <h4>Notification Settings</h4>
          <p>FloodX automatically sends notifications for:</p>
          <ul>
            <li>Sudden water level changes</li>
            <li>Status changes (Normal → Warning → Danger)</li>
            <li>System updates and connectivity issues</li>
            <li>Prediction alerts for upcoming flood risks</li>
          </ul>
        </div>
      )
    },
    predictions: {
      title: '🔮 Predictions & Analysis',
      content: (
        <div>
          <h3>Flood Predictions</h3>
          
          <h4>How Predictions Work</h4>
          <p>FloodX uses advanced algorithms to analyze:</p>
          <ul>
            <li>Historical water level patterns</li>
            <li>Recent trend analysis (24-hour moving window)</li>
            <li>Seasonal variations and rainfall data</li>
            <li>Flow rate and ground level correlations</li>
          </ul>

          <h4>Prediction Accuracy</h4>
          <div className="accuracy-info">
            <div className="accuracy-item">
              <strong>1-6 Hours:</strong> <span className="accuracy-high">95% Accurate</span>
            </div>
            <div className="accuracy-item">
              <strong>6-12 Hours:</strong> <span className="accuracy-medium">85% Accurate</span>
            </div>
            <div className="accuracy-item">
              <strong>12-24 Hours:</strong> <span className="accuracy-low">70% Accurate</span>
            </div>
          </div>

          <h4>Using Prediction Data</h4>
          <p>Visit the "Ping River Level" page to see:</p>
          <ul>
            <li>Interactive charts with historical and predicted data</li>
            <li>Detailed prediction tables</li>
            <li>Trend analysis and pattern recognition</li>
            <li>Export functionality for further analysis</li>
          </ul>
        </div>
      )
    },
    troubleshooting: {
      title: '🔧 Troubleshooting',
      content: (
        <div>
          <h3>Common Issues & Solutions</h3>
          
          <div className="trouble-item">
            <h4>❌ No Data Showing</h4>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Check your internet connection</li>
              <li>Try refreshing the page (F5)</li>
              <li>Click the refresh button in the top menu</li>
              <li>Clear browser cache and reload</li>
            </ul>
          </div>

          <div className="trouble-item">
            <h4>🔄 Connection Issues</h4>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Ensure you have a stable internet connection</li>
              <li>Check if the data source servers are online</li>
              <li>Try switching networks (mobile data/WiFi)</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>

          <div className="trouble-item">
            <h4>📍 Location Not Found</h4>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Enable location services in your browser</li>
              <li>Check location permissions for the website</li>
              <li>Try typing a more specific location name</li>
              <li>Use landmark names or nearby cities</li>
            </ul>
          </div>

          <div className="trouble-item">
            <h4>📱 Mobile Issues</h4>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Rotate your device for better view</li>
              <li>Zoom out if map controls are hidden</li>
              <li>Close other apps to free up memory</li>
              <li>Update your browser to the latest version</li>
            </ul>
          </div>

          <h4>Still Need Help?</h4>
          <p>If problems persist, please check the system status or contact technical support.</p>
        </div>
      )
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '🌊' },
    { key: 'navigation', label: 'Navigation', icon: '🧭' },
    { key: 'alerts', label: 'Alerts', icon: '🚨' },
    { key: 'predictions', label: 'Predictions', icon: '🔮' },
    { key: 'troubleshooting', label: 'Help', icon: '🔧' }
  ];

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>
            <FaQuestionCircle /> FloodX Help Center
          </h2>
          <button className="help-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="help-modal-content">
          <div className="help-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`help-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="help-tab-icon">{tab.icon}</span>
                <span className="help-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="help-content">
            <h2>{helpSections[activeTab].title}</h2>
            <div className="help-section-content">
              {helpSections[activeTab].content}
            </div>
          </div>
        </div>
        
        <div className="help-modal-footer">
          <div className="help-footer-info">
            <span>FloodX v1.2.0 | Made with ❤️ by Jxxn03</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;