import React, { useState } from 'react';
import { FaExclamationTriangle, FaPhoneAlt, FaMapMarkerAlt, FaUsers, FaBullhorn, FaTimesCircle } from 'react-icons/fa';

const EmergencyHelp = ({ addNotification }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  const emergencyContacts = [
    { name: 'ศูนย์เตือนภัยพิบัติแห่งชาติ', number: '1784', icon: '🚨' },
    { name: 'หน่วยกู้ภัย เชียงใหม่', number: '191', icon: '🚑' },
    { name: 'ดับเพลิง', number: '199', icon: '🚒' },
    { name: 'ตำรวจ', number: '191', icon: '👮‍♂️' },
    { name: 'โรงพยาบาลมหาราชนครเชียงใหม่', number: '053-936-900', icon: '🏥' },
    { name: 'สำนักงานป้องกันและบรรเทาสาธารณภัย', number: '053-115-200', icon: '🛡️' }
  ];

  const safetyTips = [
    '🏠 ถ้าน้ำเริ่มขึ้น ให้ขึ้นชั้นบนหรือที่สูง',
    '📱 เก็บโทรศัพท์ให้มีแบตเตอรี่เต็ม',
    '🎒 เตรียมกระเป๋าฉุกเฉิน: น้ำ อาหาร ยา',
    '📻 ติดตามข่าวสารอย่างต่อเนื่อง',
    '🚗 หลีกเลี่ยงการขับรถผ่านน้ำท่วม',
    '⚡ ปิดไฟฟ้าหลักก่อนอพยพ'
  ];

  const handleSOSCall = (contact) => {
    // Simulate SOS call
    addNotification('success', 'กำลังโทร SOS', `กำลังเชื่อมต่อ ${contact.name} (${contact.number})`);
    setShowSOS(false);
  };

  return (
    <div className="emergency-help">
      <div className="emergency-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FaExclamationTriangle style={{ color: '#ef4444', marginRight: '8px' }} />
          ความช่วยเหลือฉุกเฉิน
        </h3>
        <div className="emergency-actions">
          <button
            className="sos-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSOS(true);
            }}
          >
            🆘 SOS
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="emergency-content">
          <div className="safety-tips">
            <h4>💡 คำแนะนำความปลอดภัย</h4>
            <div className="tips-list">
              {safetyTips.map((tip, index) => (
                <div key={index} className="tip-item">
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="emergency-contacts">
            <h4>📞 เบอร์ฉุกเฉิน</h4>
            <div className="contacts-grid">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="contact-card">
                  <div className="contact-icon">{contact.icon}</div>
                  <div className="contact-info">
                    <div className="contact-name">{contact.name}</div>
                    <div className="contact-number">{contact.number}</div>
                  </div>
                  <button
                    className="call-button"
                    onClick={() => handleSOSCall(contact)}
                  >
                    <FaPhoneAlt />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOS && (
        <div className="sos-modal-overlay">
          <div className="sos-modal">
            <div className="sos-header">
              <h3>🆘 โทรฉุกเฉิน</h3>
              <button
                className="close-sos"
                onClick={() => setShowSOS(false)}
              >
                <FaTimesCircle />
              </button>
            </div>
            <div className="sos-content">
              <p>เลือกหน่วยงานที่ต้องการติดต่อ:</p>
              <div className="sos-contacts">
                {emergencyContacts.slice(0, 4).map((contact, index) => (
                  <button
                    key={index}
                    className="sos-contact-button"
                    onClick={() => handleSOSCall(contact)}
                  >
                    <span className="sos-icon">{contact.icon}</span>
                    <span className="sos-name">{contact.name}</span>
                    <span className="sos-number">{contact.number}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .emergency-help {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
        }

        .emergency-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: ${isExpanded ? '15px' : '0'};
        }

        .emergency-header h3 {
          color: #ef4444;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .emergency-actions {
          display: flex;
          gap: 8px;
        }

        .sos-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: bold;
          animation: pulse 2s infinite;
          transition: all 0.3s;
        }

        .sos-button:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .emergency-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .safety-tips h4,
        .emergency-contacts h4 {
          color: #f1f5f9;
          margin: 0 0 10px 0;
          font-size: 14px;
        }

        .tips-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tip-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 13px;
          border-left: 3px solid #10b981;
        }

        .contacts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .contact-card {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 10px;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .contact-card:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .contact-icon {
          font-size: 20px;
          margin-right: 10px;
        }

        .contact-info {
          flex: 1;
        }

        .contact-name {
          color: #f1f5f9;
          font-size: 12px;
          font-weight: 500;
        }

        .contact-number {
          color: #10b981;
          font-family: monospace;
          font-size: 13px;
          font-weight: bold;
        }

        .call-button {
          background: #10b981;
          color: white;
          border: none;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .call-button:hover {
          background: #059669;
          transform: scale(1.1);
        }

        .sos-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
        }

        .sos-modal {
          background: #1e293b;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          border: 2px solid #ef4444;
        }

        .sos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .sos-header h3 {
          color: #ef4444;
          margin: 0;
          font-size: 18px;
        }

        .close-sos {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 20px;
          transition: color 0.3s;
        }

        .close-sos:hover {
          color: #f1f5f9;
        }

        .sos-content p {
          color: #e2e8f0;
          margin-bottom: 15px;
          text-align: center;
        }

        .sos-contacts {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sos-contact-button {
          display: flex;
          align-items: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
        }

        .sos-contact-button:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-2px);
        }

        .sos-icon {
          font-size: 24px;
          margin-right: 12px;
        }

        .sos-name {
          flex: 1;
          color: #f1f5f9;
          font-weight: 500;
          font-size: 14px;
        }

        .sos-number {
          color: #10b981;
          font-family: monospace;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .emergency-help {
            padding: 12px;
          }

          .contacts-grid {
            grid-template-columns: 1fr;
          }

          .contact-name {
            font-size: 11px;
          }

          .sos-modal {
            margin: 10px;
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default EmergencyHelp;