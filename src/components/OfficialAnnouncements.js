import React, { useState, useEffect } from 'react';
import { FaBullhorn, FaExclamationTriangle, FaInfoCircle, FaClock, FaMapMarkerAlt } from 'react-icons/fa';

const OfficialAnnouncements = ({ addNotification }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Mock official announcements data
    const mockAnnouncements = [
      {
        id: 1,
        title: 'เตือนภัยน้ำท่วมเชียงใหม่',
        content: 'กรมอุตุนิยมวิทยาประกาศเตือนพื้นที่จังหวัดเชียงใหม่ อาจมีฝนตกหนักถึงหนักมาก ระหว่างวันที่ 28-30 ก.ย. โดยเฉพาะบริเวณลุ่มแม่น้ำปิง',
        type: 'warning',
        priority: 'high',
        source: 'กรมอุตุนิยมวิทยา',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        area: 'เชียงใหม่',
        validUntil: Date.now() + 86400000 * 2 // Valid for 2 days
      },
      {
        id: 2,
        title: 'ประกาศปิดถนนชั่วคราว',
        content: 'ถนนสายเชียงใหม่-ลำปาง (ทางหลวงหมายเลข 11) ช่วงกิโลเมตรที่ 45-48 ปิดการจราจรชั่วคราวเนื่องจากระดับน้ำสูง คาดว่าจะเปิดการจราจรในวันที่ 29 ก.ย.',
        type: 'info',
        priority: 'medium',
        source: 'กรมทางหลวง',
        timestamp: Date.now() - 3600000, // 1 hour ago
        area: 'ลำปาง',
        validUntil: Date.now() + 86400000
      },
      {
        id: 3,
        title: 'เปิดศูนย์พักพิงชั่วคราว',
        content: 'เทศบาลนครเชียงใหม่เปิดศูนย์พักพิงชั่วคราวสำหรับผู้ประสบอุทกภัย ณ โรงเรียนมหาราชวิทยาลัย และโรงเรียนยุพราชวิทยาลัย พร้อมบริการอาหาร น้ำดื่ม และของใช้จำเป็น',
        type: 'info',
        priority: 'medium',
        source: 'เทศบาลนครเชียงใหม่',
        timestamp: Date.now() - 7200000, // 2 hours ago
        area: 'เชียงใหม่',
        validUntil: Date.now() + 86400000 * 3
      },
      {
        id: 4,
        title: 'ระดับน้ำในเขื่อนสิริกิติ์',
        content: 'ระดับน้ำในเขื่อนสิริกิติ์ปัจจุบันอยู่ที่ 78% ของความจุ กรมชลประทานแจ้งว่าจะทำการระบายน้ำเพิ่มเติมหากระดับน้ำเกิน 85% เพื่อความปลอดภัยของเขื่อน',
        type: 'info',
        priority: 'low',
        source: 'กรมชลประทาน',
        timestamp: Date.now() - 10800000, // 3 hours ago
        area: 'อุตรดิตถ์',
        validUntil: Date.now() + 86400000
      },
      {
        id: 5,
        title: 'คำแนะนำการเตรียมความพร้อม',
        content: 'กรมป้องกันและบรรเทาสาธารณภัยแนะนำให้ประชาชนในพื้นที่เสี่ยง เตรียมของใช้จำเป็น เช่น ไฟฉาย แบตเตอรี่ น้ำดื่ม อาหารแห้ง และยาประจำตัว ไว้อย่างน้อย 3 วัน',
        type: 'info',
        priority: 'medium',
        source: 'กรมป้องกันและบรรเทาสาธารณภัย',
        timestamp: Date.now() - 14400000, // 4 hours ago
        area: 'ทั่วประเทศ',
        validUntil: Date.now() + 86400000 * 7
      }
    ];

    setAnnouncements(mockAnnouncements);

    // Simulate real-time updates
    const interval = setInterval(() => {
      const randomUpdate = Math.random();
      if (randomUpdate < 0.1) { // 10% chance to add new announcement
        const newAnnouncement = {
          id: Date.now(),
          title: 'ข่าวสารอัพเดต',
          content: 'ระบบได้รับข้อมูลใหม่เกี่ยวกับสถานการณ์น้ำท่วม กรุณาติดตามข่าวสารอย่างต่อเนื่อง',
          type: 'info',
          priority: 'low',
          source: 'ระบบ FloodX',
          timestamp: Date.now(),
          area: 'เชียงใหม่',
          validUntil: Date.now() + 86400000
        };
        setAnnouncements(prev => [newAnnouncement, ...prev.slice(0, 9)]);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getAnnouncementIcon = (type, priority) => {
    if (type === 'warning') {
      return <FaExclamationTriangle style={{ color: '#ef4444' }} />;
    }
    return <FaInfoCircle style={{ color: '#3b82f6' }} />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'ด่วนมาก';
      case 'medium': return 'ปานกลาง';
      case 'low': return 'ทั่วไป';
      default: return 'ไม่ระบุ';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return new Date(timestamp).toLocaleDateString('th-TH');
  };

  const isExpired = (validUntil) => {
    return Date.now() > validUntil;
  };

  const activeAnnouncements = announcements.filter(ann => !isExpired(ann.validUntil));
  const expiredAnnouncements = announcements.filter(ann => isExpired(ann.validUntil));

  return (
    <div className="official-announcements">
      <div className="announcements-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FaBullhorn style={{ color: '#f59e0b', marginRight: '8px' }} />
          ประกาศราชการ
        </h3>
        <div className="announcements-badge">
          {activeAnnouncements.length}
        </div>
      </div>

      {isExpanded && (
        <div className="announcements-content">
          <div className="announcements-stats">
            <div className="stat-item">
              <span className="stat-label">ประกาศใหม่</span>
              <span className="stat-value">{activeAnnouncements.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ด่วนมาก</span>
              <span className="stat-value urgent">
                {activeAnnouncements.filter(a => a.priority === 'high').length}
              </span>
            </div>
          </div>

          <div className="announcements-list">
            {activeAnnouncements.length === 0 ? (
              <div className="empty-announcements">
                <FaBullhorn className="empty-icon" />
                <p>ไม่มีประกาศราชการในขณะนี้</p>
              </div>
            ) : (
              activeAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`announcement-card ${announcement.priority}`}
                >
                  <div className="announcement-header">
                    <div className="announcement-icon">
                      {getAnnouncementIcon(announcement.type, announcement.priority)}
                    </div>
                    <div className="announcement-meta">
                      <div className="announcement-source">{announcement.source}</div>
                      <div className="announcement-time">
                        <FaClock style={{ marginRight: '4px', fontSize: '10px' }} />
                        {getTimeAgo(announcement.timestamp)}
                      </div>
                    </div>
                    <div
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                    >
                      {getPriorityText(announcement.priority)}
                    </div>
                  </div>

                  <div className="announcement-title">
                    {announcement.title}
                  </div>

                  <div className="announcement-content">
                    {announcement.content}
                  </div>

                  <div className="announcement-footer">
                    <div className="announcement-area">
                      <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                      {announcement.area}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {expiredAnnouncements.length > 0 && (
            <div className="expired-section">
              <h4>ประกาศที่หมดอายุ</h4>
              <div className="expired-list">
                {expiredAnnouncements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="expired-announcement">
                    <div className="expired-title">{announcement.title}</div>
                    <div className="expired-source">{announcement.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .official-announcements {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid #f59e0b;
          border-radius: 10px;
          padding: 15px;
          margin-top: 15px;
        }

        .announcements-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: ${isExpanded ? '15px' : '0'};
        }

        .announcements-header h3 {
          color: #f59e0b;
          margin: 0;
          font-size: 16px;
          display: flex;
          align-items: center;
        }

        .announcements-badge {
          background: #f59e0b;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .announcements-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .stat-item {
          text-align: center;
          flex: 1;
        }

        .stat-label {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .stat-value {
          color: #f1f5f9;
          font-size: 16px;
          font-weight: bold;
        }

        .stat-value.urgent {
          color: #ef4444;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        .empty-announcements {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 32px;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .announcement-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          border-left: 4px solid #6b7280;
          transition: all 0.3s;
        }

        .announcement-card.high {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .announcement-card.medium {
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .announcement-card.low {
          border-left-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .announcement-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.15);
        }

        .announcement-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .announcement-icon {
          font-size: 16px;
          margin-top: 2px;
        }

        .announcement-meta {
          flex: 1;
        }

        .announcement-source {
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 500;
        }

        .announcement-time {
          color: #94a3b8;
          font-size: 11px;
          display: flex;
          align-items: center;
          margin-top: 2px;
        }

        .priority-badge {
          color: white;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .announcement-title {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .announcement-content {
          color: #e2e8f0;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .announcement-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .announcement-area {
          color: #64748b;
          font-size: 11px;
          display: flex;
          align-items: center;
        }

        .expired-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #334155;
        }

        .expired-section h4 {
          color: #94a3b8;
          font-size: 13px;
          margin: 0 0 10px 0;
        }

        .expired-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .expired-announcement {
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          border-radius: 6px;
          opacity: 0.6;
        }

        .expired-title {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
        }

        .expired-source {
          color: #64748b;
          font-size: 10px;
        }

        /* Custom scrollbar */
        .announcements-list::-webkit-scrollbar {
          width: 4px;
        }

        .announcements-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .announcements-list::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.5);
          border-radius: 2px;
        }

        .announcements-list::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.7);
        }

        @media (max-width: 768px) {
          .official-announcements {
            padding: 12px;
          }

          .announcements-stats {
            flex-direction: column;
            gap: 8px;
          }

          .announcement-header {
            flex-direction: column;
            gap: 8px;
          }

          .priority-badge {
            align-self: flex-start;
          }

          .announcements-list {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default OfficialAnnouncements;