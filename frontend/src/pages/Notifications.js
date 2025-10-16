import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const Notifications = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.post(`/api/notifications/mark_read/${notificationId}`);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      showSuccess('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showError('Failed to mark notification as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await axios.delete(`/api/notifications/delete/${notificationId}`);
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      showSuccess('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showError('Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.post('/api/notifications/mark_all_read');
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      showSuccess('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showError('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      info: 'fas fa-info-circle text-info',
      success: 'fas fa-check-circle text-success',
      warning: 'fas fa-exclamation-triangle text-warning',
      error: 'fas fa-times-circle text-danger'
    };
    return icons[type] || icons.info;
  };

  const getNotificationBadge = (type) => {
    const badges = {
      info: 'bg-info',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-danger'
    };
    return badges[type] || badges.info;
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading notifications...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header d-flex justify-content-between align-items-center" 
                 style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h4 className="mb-0">
                <i className="fas fa-bell me-2"></i>Notifications
              </h4>
              {notifications.length > 0 && (
                <button 
                  className="btn btn-sm btn-light" 
                  onClick={handleMarkAllAsRead}
                  style={{borderRadius: 'var(--radius-md)', fontWeight: '600'}}
                >
                  <i className="fas fa-check-double me-1"></i>Mark All as Read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-body">
              {notifications.length > 0 ? (
                <div className="notifications-list">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                      style={{
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1rem',
                        marginBottom: '1rem',
                        background: notification.is_read ? '#f8f9fa' : 'white',
                        borderLeft: `4px solid ${notification.is_read ? '#6c757d' : 'var(--primary)'}`
                      }}
                    >
                      <div className="row align-items-start">
                        <div className="col-auto">
                          <div className={`notification-icon ${getNotificationBadge(notification.type)}`}
                               style={{
                                 width: '40px',
                                 height: '40px',
                                 borderRadius: '50%',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 color: 'white'
                               }}>
                            <i className={getNotificationIcon(notification.type)}></i>
                          </div>
                        </div>
                        <div className="col">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">
                                <strong>{notification.title}</strong>
                                {!notification.is_read && (
                                  <span className="badge bg-primary ms-2" style={{fontSize: '0.7rem'}}>New</span>
                                )}
                              </h6>
                              <p className="mb-2 text-muted">{notification.message}</p>
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                {new Date(notification.created_at).toLocaleString()}
                              </small>
                            </div>
                            <div className="btn-group btn-group-sm">
                              {!notification.is_read && (
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                >
                                  <i className="fas fa-check me-1"></i>Mark Read
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteNotification(notification.id)}
                                style={{borderRadius: 'var(--radius-md)'}}
                              >
                                <i className="fas fa-trash me-1"></i>Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-bell-slash fa-3x mb-3 opacity-50"></i>
                  <h4>No Notifications</h4>
                  <p>You're all caught up! Check back later for new updates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <button 
                    className="btn btn-primary w-100" 
                    onClick={fetchNotifications}
                    style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                  >
                    <i className="fas fa-sync me-2"></i>Refresh
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-success w-100" 
                    onClick={handleMarkAllAsRead}
                    disabled={notifications.length === 0}
                    style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                  >
                    <i className="fas fa-check-double me-2"></i>Mark All Read
                  </button>
                </div>
                <div className="col-md-3">
                  <a href="/dashboard" className="btn btn-info w-100" 
                     style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-tachometer-alt me-2"></i>Dashboard
                  </a>
                </div>
                <div className="col-md-3">
                  <a href="/search" className="btn btn-warning w-100" 
                     style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-search me-2"></i>Find Skills
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;