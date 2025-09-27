import React, { useState, useCallback } from 'react';
import { FaUpload, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';

const PhotoUpload = ({ onClose, onUploaded, addNotification }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [coords, setCoords] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFileChange = useCallback(async (selectedFile) => {
    setError(null);
    setFile(selectedFile);
    setCoords(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);

    if (!selectedFile) return;

    // Check file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP, or GIF).');
      setFile(null);
      return;
    }

    try {
      // Create preview
      const preview = URL.createObjectURL(selectedFile);
      setPreviewUrl(preview);

      // Mock GPS coordinates (in real app, would extract from EXIF)
      // For demo, use default Chiang Mai coordinates with small random offset
      const mockCoords = {
        lat: 18.7883 + (Math.random() - 0.5) * 0.01,
        lng: 98.9853 + (Math.random() - 0.5) * 0.01
      };
      setCoords(mockCoords);

      if (addNotification) {
        addNotification('info', 'Location Detected', 'GPS coordinates extracted from photo');
      }
    } catch (err) {
      setError('Failed to process image. Please try again.');
    }
  }, [previewUrl, addNotification]);

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          if (addNotification) {
            addNotification('success', 'Location Updated', 'Using your current location');
          }
        },
        (error) => {
          if (addNotification) {
            addNotification('error', 'Location Error', 'Could not get your location');
          }
        }
      );
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !coords) return;

    setUploading(true);
    setError(null);

    try {
      // Mock upload process (in real app, would upload to server)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock photo data
      const photoData = {
        id: Date.now().toString(),
        lat: coords.lat,
        lng: coords.lng,
        createdAt: Date.now(),
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
        filename: file.name,
        url: previewUrl
      };

      // Store in localStorage for demo
      const existingPhotos = JSON.parse(localStorage.getItem('floodx-photos') || '[]');
      existingPhotos.push(photoData);
      localStorage.setItem('floodx-photos', JSON.stringify(existingPhotos));

      if (addNotification) {
        addNotification('success', 'Photo Uploaded', 'Your flood report has been submitted');
      }

      if (onUploaded) {
        onUploaded(photoData);
      }

      onClose();
    } catch (err) {
      setError('Failed to upload. Please try again.');
      if (addNotification) {
        addNotification('error', 'Upload Failed', 'Could not upload photo');
      }
    } finally {
      setUploading(false);
    }
  }, [file, coords, previewUrl, onUploaded, onClose, addNotification]);

  const canUpload = file && coords && !uploading;

  return (
    <div className="photo-upload-overlay">
      <div className="photo-upload-modal">
        <div className="upload-header">
          <h3>📸 Report Flood Conditions</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="upload-content">
          <div className="file-input-section">
            <label className="file-input-label">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="file-input"
              />
              <div className="file-input-display">
                <FaUpload />
                <span>Choose Image</span>
              </div>
            </label>
          </div>

          {previewUrl && (
            <div className="preview-section">
              <img
                src={previewUrl}
                alt="Preview"
                className="preview-image"
              />
            </div>
          )}

          <div className="location-section">
            <div className="location-header">
              <FaMapMarkerAlt />
              <span>Location</span>
              <button
                className="location-button"
                onClick={handleLocationClick}
                type="button"
              >
                Use Current Location
              </button>
            </div>

            {coords ? (
              <div className="coordinates-display">
                <span>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </div>
            ) : (
              <div className="no-location">
                <span>No location selected</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="upload-actions">
            <button
              className="cancel-button"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`upload-button ${canUpload ? 'enabled' : 'disabled'}`}
              onClick={handleUpload}
              disabled={!canUpload}
              type="button"
            >
              {uploading ? (
                <>⏳ Uploading...</>
              ) : (
                <>📤 Upload Report</>
              )}
            </button>
          </div>

          <div className="info-text">
            📝 Photos expire after 8 hours and help track flood conditions
          </div>
        </div>

        <style jsx>{`
          .photo-upload-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
          }

          .photo-upload-modal {
            background: #1e293b;
            border-radius: 16px;
            padding: 24px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid #334155;
          }

          .upload-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #334155;
          }

          .upload-header h3 {
            color: #f1f5f9;
            margin: 0;
            font-size: 18px;
          }

          .close-button {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: color 0.3s;
          }

          .close-button:hover {
            color: #f1f5f9;
          }

          .upload-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .file-input-section {
            width: 100%;
          }

          .file-input-label {
            display: block;
            cursor: pointer;
          }

          .file-input {
            display: none;
          }

          .file-input-display {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            border: 2px dashed #475569;
            border-radius: 12px;
            background: rgba(51, 65, 85, 0.3);
            color: #94a3b8;
            transition: all 0.3s;
            gap: 12px;
          }

          .file-input-display:hover {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            color: #f1f5f9;
          }

          .file-input-display svg {
            font-size: 24px;
          }

          .preview-section {
            text-align: center;
          }

          .preview-image {
            max-width: 100%;
            max-height: 200px;
            border-radius: 8px;
            border: 1px solid #334155;
          }

          .location-section {
            background: rgba(51, 65, 85, 0.3);
            border-radius: 12px;
            padding: 16px;
          }

          .location-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: #f1f5f9;
            font-weight: 500;
          }

          .location-button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            margin-left: auto;
            transition: background-color 0.3s;
          }

          .location-button:hover {
            background: #2563eb;
          }

          .coordinates-display {
            color: #10b981;
            font-family: monospace;
            font-size: 14px;
          }

          .no-location {
            color: #64748b;
            font-style: italic;
            font-size: 14px;
          }

          .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #f87171;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
          }

          .upload-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .cancel-button {
            background: #475569;
            color: #f1f5f9;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s;
          }

          .cancel-button:hover {
            background: #64748b;
          }

          .upload-button {
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 500;
          }

          .upload-button.enabled {
            background: #10b981;
            color: white;
          }

          .upload-button.enabled:hover {
            background: #059669;
          }

          .upload-button.disabled {
            background: #374151;
            color: #6b7280;
            cursor: not-allowed;
          }

          .info-text {
            font-size: 12px;
            color: #64748b;
            text-align: center;
            padding-top: 12px;
            border-top: 1px solid #334155;
          }

          @media (max-width: 480px) {
            .photo-upload-modal {
              padding: 16px;
              margin: 10px;
            }

            .upload-actions {
              flex-direction: column;
            }

            .file-input-display {
              padding: 30px 15px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PhotoUpload;