import React, { useState, useEffect } from 'react';
import { FaCamera, FaUpload, FaMapMarkerAlt, FaClock, FaExpand } from 'react-icons/fa';

const PhotoTimeline = ({ addNotification, onUploadClick }) => {
  const [photos, setPhotos] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    // Load photos from localStorage
    const loadPhotos = () => {
      try {
        const stored = localStorage.getItem('floodx-photos');
        const storedPhotos = stored ? JSON.parse(stored) : [];

        // Filter out expired photos
        const now = Date.now();
        const validPhotos = storedPhotos.filter(photo => photo.expiresAt > now);

        // Update localStorage if we removed expired photos
        if (validPhotos.length !== storedPhotos.length) {
          localStorage.setItem('floodx-photos', JSON.stringify(validPhotos));
        }

        setPhotos(validPhotos);
      } catch (error) {
        console.error('Failed to load photos:', error);
        setPhotos([]);
      }
    };

    loadPhotos();

    // Set up interval to check for expired photos
    const interval = setInterval(loadPhotos, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getExpiryTime = (expiresAt) => {
    const now = Date.now();
    const remaining = expiresAt - now;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (remaining <= 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const sortedPhotos = [...photos].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="photo-timeline">
      <div className="timeline-header">
        <h3>
          <FaCamera style={{ marginRight: '8px' }} />
          Community Reports
        </h3>
        <div className="timeline-controls">
          <button
            className="upload-button"
            onClick={onUploadClick}
            title="Upload Photo Report"
          >
            <FaUpload />
          </button>
          <button
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline'}
          >
            <FaExpand />
          </button>
        </div>
      </div>

      <div className="timeline-stats">
        <div className="stat-item">
          <div className="stat-value">{photos.length}</div>
          <div className="stat-label">Active Reports</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {photos.length > 0 ? getTimeAgo(Math.max(...photos.map(p => p.createdAt))) : 'None'}
          </div>
          <div className="stat-label">Latest Report</div>
        </div>
      </div>

      {isExpanded && (
        <div className="timeline-content">
          {sortedPhotos.length === 0 ? (
            <div className="empty-timeline">
              <FaCamera className="empty-icon" />
              <p>No community reports yet</p>
              <button
                className="upload-cta"
                onClick={onUploadClick}
              >
                📸 Share a Flood Report
              </button>
            </div>
          ) : (
            <div className="timeline-list">
              {sortedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="timeline-item"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <div className="timeline-marker">
                    <div className="marker-dot"></div>
                    <div className="marker-line"></div>
                  </div>

                  <div className="timeline-card">
                    <div className="card-header">
                      <div className="time-info">
                        <FaClock style={{ marginRight: '4px' }} />
                        {getTimeAgo(photo.createdAt)}
                      </div>
                      <div className="expiry-info">
                        {getExpiryTime(photo.expiresAt)}
                      </div>
                    </div>

                    <div className="photo-container">
                      <img
                        src={photo.url}
                        alt={`Flood report at ${photo.lat.toFixed(3)}, ${photo.lng.toFixed(3)}`}
                        className="timeline-photo"
                      />
                      <div className="photo-overlay">
                        <span>Click to enlarge</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="location-info">
                        <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                        {photo.lat.toFixed(5)}, {photo.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox for enlarged photo view */}
      {selectedPhoto && (
        <div className="photo-lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>Flood Report Details</h4>
              <button className="close-button" onClick={closeLightbox}>
                ×
              </button>
            </div>
            <img
              src={selectedPhoto.url}
              alt="Enlarged flood report"
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <div className="info-row">
                <span>📍 Location:</span>
                <span>{selectedPhoto.lat.toFixed(5)}, {selectedPhoto.lng.toFixed(5)}</span>
              </div>
              <div className="info-row">
                <span>🕒 Reported:</span>
                <span>{new Date(selectedPhoto.createdAt).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span>⏰ Expires:</span>
                <span>{getExpiryTime(selectedPhoto.expiresAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .photo-timeline {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
          border: 1px solid #333;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .timeline-header h3 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .timeline-controls {
          display: flex;
          gap: 8px;
        }

        .upload-button,
        .expand-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .upload-button:hover,
        .expand-button:hover {
          background: #0056b3;
        }

        .timeline-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          flex: 1;
        }

        .stat-value {
          font-size: 16px;
          font-weight: bold;
          color: #fff;
        }

        .stat-label {
          font-size: 12px;
          color: #ccc;
          margin-top: 2px;
        }

        .timeline-content {
          max-height: 400px;
          overflow-y: auto;
        }

        .empty-timeline {
          text-align: center;
          padding: 40px 20px;
          color: #ccc;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .upload-cta {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 15px;
          transition: background-color 0.3s;
        }

        .upload-cta:hover {
          background: #059669;
        }

        .timeline-list {
          position: relative;
        }

        .timeline-item {
          display: flex;
          margin-bottom: 20px;
          cursor: pointer;
        }

        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 15px;
          z-index: 1;
        }

        .marker-dot {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid #1e293b;
          margin-top: 8px;
        }

        .marker-line {
          width: 2px;
          flex: 1;
          background: #334155;
          margin-top: 4px;
        }

        .timeline-item:last-child .marker-line {
          display: none;
        }

        .timeline-card {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #334155;
          transition: all 0.3s;
        }

        .timeline-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          border-color: #3b82f6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-bottom: 1px solid #334155;
        }

        .time-info {
          color: #94a3b8;
          font-size: 12px;
          display: flex;
          align-items: center;
        }

        .expiry-info {
          color: #f59e0b;
          font-size: 11px;
          font-weight: 500;
        }

        .photo-container {
          position: relative;
          overflow: hidden;
        }

        .timeline-photo {
          width: 100%;
          height: 120px;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .timeline-card:hover .timeline-photo {
          transform: scale(1.05);
        }

        .photo-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          color: white;
          text-align: center;
          padding: 8px;
          font-size: 11px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .timeline-card:hover .photo-overlay {
          opacity: 1;
        }

        .card-footer {
          padding: 8px 12px;
        }

        .location-info {
          color: #64748b;
          font-size: 11px;
          font-family: monospace;
          display: flex;
          align-items: center;
        }

        .photo-lightbox {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .lightbox-content {
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
          max-width: 600px;
          max-height: 90vh;
          overflow: auto;
          border: 1px solid #334155;
        }

        .lightbox-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #334155;
        }

        .lightbox-header h4 {
          color: #fff;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: color 0.3s;
        }

        .close-button:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .lightbox-image {
          width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .lightbox-info {
          space-y: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #334155;
          font-size: 14px;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row span:first-child {
          color: #94a3b8;
        }

        .info-row span:last-child {
          color: #fff;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .timeline-stats {
            flex-direction: column;
            gap: 8px;
          }

          .timeline-content {
            max-height: 300px;
          }

          .timeline-photo {
            height: 100px;
          }

          .lightbox-content {
            margin: 10px;
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default PhotoTimeline;