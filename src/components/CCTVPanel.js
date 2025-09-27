import React, { useState, useEffect } from 'react';
import { FaCamera, FaSync, FaTimes } from 'react-icons/fa';
import dataSourceService from '../services/dataSourceService';

const CCTVPanel = ({ addNotification }) => {
  const [cctvImages, setCctvImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const cameras = ['TP1']; // Only TP1 camera works according to API

  const fetchCCTVImage = async (cameraId) => {
    setLoading(true);
    try {
      const result = await dataSourceService.fetchCCTVImage(cameraId);
      if (result.success) {
        setCctvImages(prev => ({
          ...prev,
          [cameraId]: result
        }));
        if (addNotification) {
          addNotification('success', 'CCTV Updated', `Camera ${cameraId} image refreshed`);
        }
      } else {
        if (addNotification) {
          addNotification('error', 'CCTV Error', `Failed to load camera ${cameraId}`);
        }
      }
    } catch (error) {
      if (addNotification) {
        addNotification('error', 'CCTV Error', `Failed to load camera ${cameraId}: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCCTVImages = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        cameras.map(camera => dataSourceService.fetchCCTVImage(camera))
      );

      const newImages = {};
      results.forEach((result, index) => {
        if (result.success) {
          newImages[cameras[index]] = result;
        }
      });

      setCctvImages(newImages);
      if (addNotification) {
        addNotification('success', 'CCTV Updated', `Refreshed ${Object.keys(newImages).length} cameras`);
      }
    } catch (error) {
      if (addNotification) {
        addNotification('error', 'CCTV Error', 'Failed to refresh cameras');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial CCTV images
    fetchAllCCTVImages();

    // Set up auto-refresh every 2 minutes for CCTV
    const interval = setInterval(() => {
      if (!loading) {
        fetchAllCCTVImages();
      }
    }, 120000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraClick = (cameraId) => {
    setSelectedCamera(cameraId);
  };

  const closeLightbox = () => {
    setSelectedCamera(null);
  };

  return (
    <div className="cctv-panel">
      <div className="cctv-header">
        <h3>📹 CCTV Monitoring</h3>
        <div className="cctv-controls">
          <button
            className={`toggle-button ${isExpanded ? 'active' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse CCTV Panel' : 'Expand CCTV Panel'}
          >
            {isExpanded ? '◀' : '▶'}
          </button>
          <button
            className="refresh-button"
            onClick={fetchAllCCTVImages}
            disabled={loading}
            title="Refresh All Cameras"
          >
            <FaSync className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="cctv-content">
          <div className="camera-grid">
            {cameras.map(cameraId => (
              <div key={cameraId} className="camera-card">
                <div className="camera-header">
                  <span className="camera-name">Camera {cameraId}</span>
                  <button
                    className="camera-refresh"
                    onClick={() => fetchCCTVImage(cameraId)}
                    disabled={loading}
                    title={`Refresh Camera ${cameraId}`}
                  >
                    <FaCamera />
                  </button>
                </div>
                <div className="camera-image-container" onClick={() => handleCameraClick(cameraId)}>
                  {cctvImages[cameraId] ? (
                    <img
                      src={cctvImages[cameraId].imageUrl}
                      alt={`Camera ${cameraId}`}
                      className="camera-image"
                      onError={() => {
                        console.warn(`Failed to load image for camera ${cameraId}`);
                      }}
                    />
                  ) : (
                    <div className="camera-placeholder">
                      <FaCamera />
                      <p>Loading...</p>
                    </div>
                  )}
                  <div className="camera-overlay">
                    <span>Click to enlarge</span>
                  </div>
                </div>
                {cctvImages[cameraId] && (
                  <div className="camera-info">
                    <small>
                      Updated: {new Date(cctvImages[cameraId].timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox for enlarged view */}
      {selectedCamera && cctvImages[selectedCamera] && (
        <div className="cctv-lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <h3>Camera {selectedCamera}</h3>
              <button className="close-button" onClick={closeLightbox}>
                <FaTimes />
              </button>
            </div>
            <img
              src={cctvImages[selectedCamera].imageUrl}
              alt={`Camera ${selectedCamera} - Enlarged`}
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <p>Last updated: {new Date(cctvImages[selectedCamera].timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .cctv-panel {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #333;
        }

        .cctv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .cctv-header h3 {
          color: #fff;
          margin: 0;
          font-size: 16px;
        }

        .cctv-controls {
          display: flex;
          gap: 10px;
        }

        .toggle-button, .refresh-button, .camera-refresh {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .toggle-button:hover, .refresh-button:hover, .camera-refresh:hover {
          background: #0056b3;
        }

        .toggle-button.active {
          background: #28a745;
        }

        .camera-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .camera-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid #555;
        }

        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .camera-name {
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }

        .camera-image-container {
          position: relative;
          cursor: pointer;
          border-radius: 5px;
          overflow: hidden;
          background: #222;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .camera-placeholder {
          color: #ccc;
          text-align: center;
          padding: 20px;
        }

        .camera-placeholder svg {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .camera-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          text-align: center;
          padding: 5px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
        }

        .camera-image-container:hover .camera-overlay {
          opacity: 1;
        }

        .camera-info {
          margin-top: 8px;
          text-align: center;
        }

        .camera-info small {
          color: #ccc;
          font-size: 11px;
        }

        .cctv-lightbox {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .lightbox-content {
          background: #222;
          border-radius: 10px;
          padding: 20px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }

        .lightbox-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .lightbox-header h3 {
          color: #fff;
          margin: 0;
        }

        .close-button {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 12px;
          cursor: pointer;
        }

        .close-button:hover {
          background: #c82333;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 70vh;
          border-radius: 5px;
        }

        .lightbox-info {
          text-align: center;
          margin-top: 15px;
          color: #ccc;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CCTVPanel;