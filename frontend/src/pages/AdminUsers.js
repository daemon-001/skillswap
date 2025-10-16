import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const AdminUsers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action, userId) => {
    try {
      let endpoint = '';
      let successMessage = '';
      
      switch (action) {
        case 'ban':
          endpoint = `/api/admin/ban_user/${userId}`;
          successMessage = 'User banned successfully';
          break;
        case 'unban':
          endpoint = `/api/admin/unban_user/${userId}`;
          successMessage = 'User unbanned successfully';
          break;
        case 'supervise':
          endpoint = `/api/admin/supervise_user/${userId}`;
          successMessage = 'User placed under supervision';
          break;
        case 'unsupervise':
          endpoint = `/api/admin/unsupervise_user/${userId}`;
          successMessage = 'User removed from supervision';
          break;
        default:
          return;
      }

      await axios.post(endpoint);
      showSuccess(successMessage);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      showError(`Failed to ${action} user`);
    }
  };

  const downloadUsers = async () => {
    try {
      const response = await axios.get('/api/admin/download/users', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading users:', error);
      showError('Failed to download users data');
    }
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
                <p>Loading users...</p>
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
                <i className="fas fa-users me-3"></i>Manage Users
              </h1>
              <p className="hero-subtitle">
                Monitor and manage user accounts with comprehensive administrative controls.
              </p>
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <div className="hero-avatar">
              <div className="avatar-img d-flex align-items-center justify-content-center" 
                   style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 197, 253, 0.1))', 
                           width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto'}}>
                <i className="fas fa-user-shield" style={{fontSize: '3rem', color: 'var(--primary)'}}></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Users Table */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>All Users
              </h5>
            </div>
            <div className="card-body">
              {users.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover" style={{borderRadius: 'var(--radius-lg)', overflow: 'hidden'}}>
                    <thead style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.05))'}}>
                      <tr>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Name</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Email</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Location</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Joined</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Status</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(userItem => (
                        <tr key={userItem.id} style={{borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <strong>{userItem.name}</strong>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">{userItem.email}</small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">
                              {userItem.location || 'Not specified'}
                            </small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">
                              {userItem.created_at ? 
                                new Date(userItem.created_at).toLocaleDateString('en-US', { 
                                  month: 'long', day: 'numeric', year: 'numeric' 
                                }) : 'Unknown'}
                            </small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            {userItem.is_banned ? (
                              <span className="badge bg-danger" style={{borderRadius: 'var(--radius-md)'}}>Banned</span>
                            ) : (
                              <span className="badge bg-success" style={{borderRadius: 'var(--radius-md)'}}>Active</span>
                            )}
                            {userItem.is_under_supervision && (
                              <span className="badge bg-warning text-dark ms-1" style={{borderRadius: 'var(--radius-md)'}}>Under Supervision</span>
                            )}
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <div className="btn-group btn-group-sm" role="group">
                              {userItem.is_banned ? (
                                <button 
                                  className="btn btn-outline-success admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to unban this user?')) {
                                      handleUserAction('unban', userItem.id);
                                    }
                                  }}
                                >
                                  <i className="fas fa-user-check me-1"></i>Unban
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-outline-danger admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to ban this user?')) {
                                      handleUserAction('ban', userItem.id);
                                    }
                                  }}
                                >
                                  <i className="fas fa-user-times me-1"></i>Ban
                                </button>
                              )}

                              {userItem.is_under_supervision ? (
                                <button 
                                  className="btn btn-outline-primary admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)'}}
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to remove supervision from this user?')) {
                                      handleUserAction('unsupervise', userItem.id);
                                    }
                                  }}
                                >
                                  <i className="fas fa-user-shield me-1"></i>Remove Supervision
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-outline-warning admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)'}}
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to place this user under supervision?')) {
                                      handleUserAction('supervise', userItem.id);
                                    }
                                  }}
                                >
                                  <i className="fas fa-user-shield me-1"></i>Under Supervision
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-users fa-3x mb-3 opacity-50"></i>
                  <p>No users found</p>
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
                  <a href="/admin/skills" className="btn btn-info w-100" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', border: 'none', 
                            borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', transition: 'all 0.3s ease'}}>
                    <i className="fas fa-tools me-2"></i>Manage Skills
                  </a>
                </div>
                <div className="col-md-3">
                  <a href="/admin/messages" className="btn btn-success w-100" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', border: 'none', 
                            borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s ease'}}>
                    <i className="fas fa-bullhorn me-2"></i>Send Announcement
                  </a>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-warning w-100" 
                          style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                 background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', border: 'none', 
                                 borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                                 boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s ease'}} 
                          onClick={downloadUsers}>
                    <i className="fas fa-download me-2"></i>Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
