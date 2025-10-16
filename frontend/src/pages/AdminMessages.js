import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const AdminMessages = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickMessageModal, setShowQuickMessageModal] = useState(false);
  const [quickMessage, setQuickMessage] = useState({
    title: '',
    content: '',
    type: 'info'
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [messagesResponse, usersResponse] = await Promise.all([
        axios.get('/api/admin/messages'),
        axios.get('/api/admin/users')
      ]);
      setMessages(messagesResponse.data.messages);
      setUsers(usersResponse.data.users);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!quickMessage.title.trim() || !quickMessage.content.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      await axios.post('/api/admin/send_message', {
        title: quickMessage.title,
        content: quickMessage.content
      });
      showSuccess('Message sent successfully');
      setQuickMessage({ title: '', content: '', type: 'info' });
      fetchData(); // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleQuickMessage = async (e) => {
    e.preventDefault();
    if (!quickMessage.title.trim() || !quickMessage.content.trim() || selectedUsers.length === 0) {
      showError('Please fill in all required fields and select recipients');
      return;
    }

    try {
      setSending(true);
      await axios.post('/api/admin/quick_message', {
        quick_title: quickMessage.title,
        quick_content: quickMessage.content,
        quick_type: quickMessage.type,
        recipients: selectedUsers
      });
      showSuccess('Quick message sent successfully');
      setQuickMessage({ title: '', content: '', type: 'info' });
      setSelectedUsers([]);
      setShowQuickMessageModal(false);
    } catch (error) {
      console.error('Error sending quick message:', error);
      showError('Failed to send quick message');
    } finally {
      setSending(false);
    }
  };

  const handleToggleMessage = async (messageId) => {
    try {
      await axios.post(`/api/admin/toggle_message/${messageId}`);
      showSuccess('Message status updated successfully');
      fetchData(); // Refresh messages
    } catch (error) {
      console.error('Error toggling message:', error);
      showError('Failed to update message status');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/delete_message/${messageId}`);
      showSuccess('Message deleted successfully');
      fetchData(); // Refresh messages
    } catch (error) {
      console.error('Error deleting message:', error);
      showError('Failed to delete message');
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  if (!user || !user.is_admin) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-shield-alt fa-3x text-danger mb-3"></i>
                <h4>Access Denied</h4>
                <p className="text-muted">You don't have permission to access this page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading messages...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Admin Hero Section */}
      <section className="dashboard-hero mb-5">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <div className="hero-content">
              <h1 className="hero-title">
                <i className="fas fa-bullhorn me-3"></i>Manage Messages
              </h1>
              <p className="hero-subtitle">
                Send announcements and manage platform messages to keep your community informed.
              </p>
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <div className="hero-avatar">
              <div className="avatar-img d-flex align-items-center justify-content-center" 
                   style={{background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.1))', 
                           width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto'}}>
                <i className="fas fa-megaphone" style={{fontSize: '3rem', color: 'var(--warning)'}}></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Send New Message */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-paper-plane me-2"></i>Send New Message (Global Announcement)
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSendMessage}>
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label htmlFor="title" className="form-label fw-bold">Message Title</label>
                    <input 
                      type="text" 
                      className="form-control modern-form-input" 
                      id="title" 
                      value={quickMessage.title}
                      onChange={(e) => setQuickMessage({...quickMessage, title: e.target.value})}
                      required 
                      style={{borderRadius: 'var(--radius-lg)', border: '2px solid rgba(0,0,0,0.1)', padding: '0.75rem 1rem', transition: 'all 0.3s ease'}}
                    />
                  </div>
                  <div className="col-md-6 mb-4">
                    <label htmlFor="content" className="form-label fw-bold">Message Content</label>
                    <textarea 
                      className="form-control modern-form-input" 
                      id="content" 
                      rows="3" 
                      value={quickMessage.content}
                      onChange={(e) => setQuickMessage({...quickMessage, content: e.target.value})}
                      required 
                      style={{borderRadius: 'var(--radius-lg)', border: '2px solid rgba(0,0,0,0.1)', padding: '0.75rem 1rem', transition: 'all 0.3s ease', resize: 'vertical'}}
                    />
                  </div>
                </div>
                <div className="d-grid">
                  <button 
                    type="submit" 
                    className="btn btn-warning modern-search-btn" 
                    style={{height: '50px', fontSize: '1.1rem', fontWeight: '600'}}
                    disabled={sending}
                  >
                    {sending ? (
                      <i className="fas fa-spinner fa-spin me-2"></i>
                    ) : (
                      <i className="fas fa-paper-plane me-2"></i>
                    )}
                    Send Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header d-flex justify-content-between align-items-center" 
                 style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>All Messages
              </h5>
              <button 
                className="btn btn-sm btn-light" 
                onClick={() => setShowQuickMessageModal(true)}
                style={{borderRadius: 'var(--radius-md)', fontWeight: '600'}}
              >
                <i className="fas fa-bolt me-1"></i>Quick Message
              </button>
            </div>
            <div className="card-body">
              {messages.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover" style={{borderRadius: 'var(--radius-lg)', overflow: 'hidden'}}>
                    <thead style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.05))'}}>
                      <tr>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Title</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Content</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Status</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Created</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map(message => (
                        <tr key={message.id} style={{borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <strong>{message.title}</strong>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">
                              {message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content}
                            </small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            {message.is_active ? (
                              <span className="badge bg-success" style={{borderRadius: 'var(--radius-md)'}}>Active</span>
                            ) : (
                              <span className="badge bg-secondary" style={{borderRadius: 'var(--radius-md)'}}>Inactive</span>
                            )}
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">
                              {message.created_at ? 
                                new Date(message.created_at).toLocaleDateString('en-US', { 
                                  month: 'long', day: 'numeric', year: 'numeric' 
                                }) : 'Unknown'}
                            </small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <div className="btn-group btn-group-sm" role="group">
                              {message.is_active ? (
                                <button 
                                  className="btn btn-outline-warning admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                  onClick={() => handleToggleMessage(message.id)}
                                >
                                  <i className="fas fa-eye-slash me-1"></i>Deactivate
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-outline-success admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                  onClick={() => handleToggleMessage(message.id)}
                                >
                                  <i className="fas fa-eye me-1"></i>Activate
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-danger admin-action-btn" 
                                style={{borderRadius: 'var(--radius-md)'}}
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <i className="fas fa-trash me-1"></i>Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-bullhorn fa-3x mb-3 opacity-50"></i>
                  <p>No messages found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-3">
                  <a href="/admin" className="btn btn-primary w-100 modern-search-btn" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
                  </a>
                </div>
                <div className="col-md-3">
                  <a href="/admin/users" className="btn btn-info w-100" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', border: 'none', 
                            borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', transition: 'all 0.3s ease'}}>
                    <i className="fas fa-users me-2"></i>Manage Users
                  </a>
                </div>
                <div className="col-md-3">
                  <a href="/admin/skills" className="btn btn-success w-100" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', border: 'none', 
                            borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s ease'}}>
                    <i className="fas fa-tools me-2"></i>Manage Skills
                  </a>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-warning w-100" 
                          style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                 background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', border: 'none', 
                                 borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                                 boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s ease'}} 
                          onClick={() => setShowQuickMessageModal(true)}>
                    <i className="fas fa-bolt me-2"></i>Quick Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Message Modal */}
      {showQuickMessageModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-bolt me-2"></i>Send Quick Message
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowQuickMessageModal(false)}></button>
              </div>
              <form onSubmit={handleQuickMessage}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="quick_title" className="form-label">Title</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="quick_title" 
                        value={quickMessage.title}
                        onChange={(e) => setQuickMessage({...quickMessage, title: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="quick_type" className="form-label">Type</label>
                      <select 
                        id="quick_type" 
                        className="form-select"
                        value={quickMessage.type}
                        onChange={(e) => setQuickMessage({...quickMessage, type: e.target.value})}
                      >
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="quick_content" className="form-label">Message</label>
                      <textarea 
                        className="form-control" 
                        id="quick_content" 
                        rows="3" 
                        value={quickMessage.content}
                        onChange={(e) => setQuickMessage({...quickMessage, content: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <hr/>
                  <div className="row g-3">
                    <div className="col-12 d-flex align-items-center justify-content-between">
                      <h6 className="mb-0"><i className="fas fa-users me-2"></i>Select Recipients</h6>
                      <div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAllUsers}>Select All</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary ms-2" onClick={clearAllUsers}>Clear</button>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="row row-cols-1 row-cols-md-2 g-2" style={{maxHeight: '300px', overflow: 'auto'}}>
                        {users.map(userItem => (
                          <div key={userItem.id} className="col">
                            <div className="form-check">
                              <input 
                                className="form-check-input recipient-checkbox" 
                                type="checkbox" 
                                value={userItem.id} 
                                id={`user_${userItem.id}`}
                                checked={selectedUsers.includes(userItem.id)}
                                onChange={() => handleUserSelection(userItem.id)}
                              />
                              <label className="form-check-label" htmlFor={`user_${userItem.id}`}>
                                {userItem.name} <small className="text-muted">({userItem.email})</small>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowQuickMessageModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? (
                      <i className="fas fa-spinner fa-spin me-2"></i>
                    ) : (
                      <i className="fas fa-paper-plane me-2"></i>
                    )}
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
