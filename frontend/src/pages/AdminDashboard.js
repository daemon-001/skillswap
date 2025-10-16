import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [stats, setStats] = useState({
    total_users: 0,
    total_skills: 0,
    pending_swaps: 0,
    completed_swaps: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentSwaps, setRecentSwaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await axios.get('/api/admin/stats');
      setStats(statsResponse.data.stats);
      
      // Fetch recent users
      const usersResponse = await axios.get('/api/admin/recent_users');
      setRecentUsers(usersResponse.data.users);
      
      // Fetch recent swaps
      const swapsResponse = await axios.get('/api/admin/recent_swaps');
      setRecentSwaps(swapsResponse.data.swaps);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportType) => {
    try {
      const response = await axios.get(`/api/admin/download/${reportType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      showError('Failed to download report');
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
                <p>Loading dashboard...</p>
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
                <i className="fas fa-shield-alt me-3"></i>Admin Dashboard
              </h1>
              <p className="hero-subtitle">
                Manage the SkillSwap community and monitor platform activity with powerful administrative tools.
              </p>
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <div className="hero-avatar">
              <div className="avatar-img d-flex align-items-center justify-content-center" 
                   style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))', 
                           width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto'}}>
                <i className="fas fa-crown" style={{fontSize: '3rem', color: '#ffd700'}}></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Cards */}
      <div className="row mb-5">
        <div className="col-md-3 mb-4">
          <div className="stats-card text-center">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <i className="fas fa-users" style={{fontSize: '2rem', color: 'var(--primary)'}}></i>
            </div>
            <h3 className="display-6 fw-bold text-primary">{stats.total_users}</h3>
            <p className="mb-0 text-muted">Total Users</p>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="stats-card text-center">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <i className="fas fa-tools" style={{fontSize: '2rem', color: 'var(--success)'}}></i>
            </div>
            <h3 className="display-6 fw-bold text-success">{stats.total_skills}</h3>
            <p className="mb-0 text-muted">Total Skills</p>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="stats-card text-center">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <i className="fas fa-clock" style={{fontSize: '2rem', color: 'var(--warning)'}}></i>
            </div>
            <h3 className="display-6 fw-bold text-warning">{stats.pending_swaps}</h3>
            <p className="mb-0 text-muted">Pending Swaps</p>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="stats-card text-center">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <i className="fas fa-check-circle" style={{fontSize: '2rem', color: 'var(--info)'}}></i>
            </div>
            <h3 className="display-6 fw-bold text-info">{stats.completed_swaps}</h3>
            <p className="mb-0 text-muted">Completed Swaps</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-3">
                  <a href="/admin/users" className="btn btn-primary w-100 modern-search-btn" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
                  <a href="/admin/messages" className="btn btn-info w-100" 
                     style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', border: 'none', 
                            borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', transition: 'all 0.3s ease'}}>
                    <i className="fas fa-bullhorn me-2"></i>Send Announcement
                  </a>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-warning w-100" 
                          style={{height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                 background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', border: 'none', 
                                 borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                                 boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s ease'}} 
                          data-bs-toggle="modal" data-bs-target="#quickMessageModal">
                    <i className="fas fa-paper-plane me-2"></i>Quick Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-chart-bar me-2"></i>Download Reports
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="report-card text-center p-4" 
                       style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1))', 
                               border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-lg)', 
                               transition: 'all 0.3s ease'}}>
                    <div className="mb-3">
                      <i className="fas fa-users fa-3x text-primary"></i>
                    </div>
                    <h6 className="mb-3 fw-bold">User Activity Report</h6>
                    <p className="text-muted small mb-4">Download comprehensive user activity data including registration dates, skills, swaps, and ratings.</p>
                    <button className="btn btn-primary btn-sm modern-search-btn" 
                            onClick={() => downloadReport('user_activity')}>
                      <i className="fas fa-download me-2"></i>Download CSV
                    </button>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="report-card text-center p-4" 
                       style={{background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1))', 
                               border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-lg)', 
                               transition: 'all 0.3s ease'}}>
                    <div className="mb-3">
                      <i className="fas fa-star fa-3x text-warning"></i>
                    </div>
                    <h6 className="mb-3 fw-bold">Feedback Logs Report</h6>
                    <p className="text-muted small mb-4">Download all user feedback and ratings with detailed information about each rating.</p>
                    <button className="btn btn-warning btn-sm" 
                            style={{background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', border: 'none', 
                                   borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                                   boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)', transition: 'all 0.3s ease'}}
                            onClick={() => downloadReport('feedback_logs')}>
                      <i className="fas fa-download me-2"></i>Download CSV
                    </button>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="report-card text-center p-4" 
                       style={{background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1))', 
                               border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-lg)', 
                               transition: 'all 0.3s ease'}}>
                    <div className="mb-3">
                      <i className="fas fa-exchange-alt fa-3x text-success"></i>
                    </div>
                    <h6 className="mb-3 fw-bold">Swap Statistics Report</h6>
                    <p className="text-muted small mb-4">Download detailed swap statistics including status, participants, skills, and feedback.</p>
                    <button className="btn btn-success btn-sm" 
                            style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', border: 'none', 
                                   borderRadius: 'var(--radius-lg)', fontWeight: '600', 
                                   boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s ease'}}
                            onClick={() => downloadReport('swap_stats')}>
                      <i className="fas fa-download me-2"></i>Download CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card modern-search-card h-100">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-user-plus me-2"></i>Recent Users
              </h5>
            </div>
            <div className="card-body">
              {recentUsers.length > 0 ? (
                <>
                  <div className="list-group list-group-flush">
                    {recentUsers.map(user => (
                      <div key={user.id} className="list-group-item d-flex justify-content-between align-items-center" 
                           style={{border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '1rem 0'}}>
                        <div>
                          <h6 className="mb-1 fw-bold">{user.name}</h6>
                          <small className="text-muted">{user.email}</small>
                        </div>
                        <div className="text-end">
                          <small className="text-muted d-block">
                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </small>
                          {user.is_banned && (
                            <span className="badge bg-danger ms-2">Banned</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    <a href="/admin/users" className="btn btn-info btn-sm modern-search-btn">
                      View All Users
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-users fa-3x mb-3 opacity-50"></i>
                  <p>No recent user activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card modern-search-card h-100">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-exchange-alt me-2"></i>Recent Swaps
              </h5>
            </div>
            <div className="card-body">
              {recentSwaps.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentSwaps.map(swap => (
                    <div key={swap.id} className="list-group-item" 
                         style={{border: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '1rem 0'}}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1 fw-bold">{swap.requester_name} ↔ {swap.provider_name}</h6>
                          <small className="text-muted">
                            {new Date(swap.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </small>
                        </div>
                        <span className={`badge bg-${swap.status === 'accepted' ? 'success' : swap.status === 'pending' ? 'warning' : 'danger'}`} 
                              style={{borderRadius: 'var(--radius-md)'}}>
                          {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-exchange-alt fa-3x mb-3 opacity-50"></i>
                  <p>No recent swap activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
