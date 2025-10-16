import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [skills, setSkills] = useState({
    offered_skills: [],
    wanted_skills: [],
    rejected_skills: []
  });
  const [swapRequests, setSwapRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    skill_type: 'offered',
    description: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch skills
      const skillsResponse = await axios.get('/api/skills');
      setSkills(skillsResponse.data);

      // Fetch swap requests (handle if endpoint doesn't exist yet)
      try {
        const swapRequestsResponse = await axios.get('/api/swap-requests');
        setSwapRequests(swapRequestsResponse.data || []);
      } catch (error) {
        setSwapRequests([]);
      }

      // Fetch notifications (handle if endpoint doesn't exist yet)
      try {
        const notificationsResponse = await axios.get('/api/notifications');
        // Handle both array response and object with notifications property
        const notificationsData = Array.isArray(notificationsResponse.data) 
          ? notificationsResponse.data 
          : notificationsResponse.data.notifications || [];
        setNotifications(notificationsData);
      } catch (error) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    
    if (!newSkill.skill_name.trim()) {
      showError('Skill name is required');
      return;
    }

    try {
      await axios.post('/api/skills', newSkill);
      showSuccess('Skill submitted for review!');
      setShowAddSkillModal(false);
      setNewSkill({ skill_name: '', skill_type: 'offered', description: '' });
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!window.confirm('Are you sure you want to delete this skill?')) {
      return;
    }

    try {
      await axios.delete(`/api/skills/${skillId}`);
      showSuccess('Skill deleted successfully');
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete skill');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const stats = {
    offered_skills: skills.offered_skills.length,
    wanted_skills: skills.wanted_skills.length,
    pending_requests: Array.isArray(swapRequests) ? swapRequests.filter(r => r.status === 'pending').length : 0,
    completed_swaps: Array.isArray(swapRequests) ? swapRequests.filter(r => r.status === 'accepted').length : 0
  };

  return (
    <div>
      {/* Dashboard Hero */}
      <section className="dashboard-hero">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="hero-title">Welcome back, {user.name}!</h1>
              <p className="hero-subtitle">
                Ready to continue your skill-sharing journey? Explore new opportunities and connect with amazing people.
              </p>
            </div>
            <div className="col-md-4 text-center">
              <div className="hero-avatar">
                <img
                  src={getProfilePhotoUrl(user.profile_photo)}
                  alt="Profile"
                  className="avatar-img"
                  onError={handleImageError}
                  onLoad={() => handleImageLoad('Dashboard user')}
                />
                {user.is_under_supervision && (
                  <div className="supervision-badge">
                    <i className="fas fa-user-shield"></i>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-4">
        {/* Notifications Alert */}
        {Array.isArray(notifications) && notifications.filter(n => !n.is_read).length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert modern-alert alert-warning alert-dismissible fade show" role="alert">
                <div className="alert-icon">
                  <i className="fas fa-bell"></i>
                </div>
                <div className="alert-content">
                  <strong>{notifications.filter(n => !n.is_read).length}</strong> unread notification{notifications.filter(n => !n.is_read).length !== 1 ? 's' : ''}
                  <Link to="/notifications" className="alert-link ms-2">View notifications</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="row g-4 mb-5">
          <div className="col-lg-3 col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="display-6 text-success mb-2">
                  <i className="fas fa-tools"></i>
                </div>
                <h3 className="card-title">{stats.offered_skills}</h3>
                <p className="card-text text-muted">Skills Offered</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="display-6 text-info mb-2">
                  <i className="fas fa-lightbulb"></i>
                </div>
                <h3 className="card-title">{stats.wanted_skills}</h3>
                <p className="card-text text-muted">Skills Wanted</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="display-6 text-warning mb-2">
                  <i className="fas fa-clock"></i>
                </div>
                <h3 className="card-title">{stats.pending_requests}</h3>
                <p className="card-text text-muted">Pending Requests</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="display-6 text-primary mb-2">
                  <i className="fas fa-handshake"></i>
                </div>
                <h3 className="card-title">{stats.completed_swaps}</h3>
                <p className="card-text text-muted">Completed Swaps</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Skills Section */}
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-tools me-2"></i>My Skills
                </h5>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddSkillModal(true)}
                  disabled={user.is_under_supervision}
                >
                  <i className="fas fa-plus me-1"></i>Add Skill
                </button>
              </div>
              <div className="card-body">
                {/* Offered Skills */}
                <div className="mb-4">
                  <h6 className="text-success mb-3">
                    <i className="fas fa-arrow-up me-1"></i>Skills I Offer
                  </h6>
                  <div className="row g-3">
                    {skills.offered_skills.map(skill => (
                      <div key={skill.id} className="col-md-6">
                        <SkillCard skill={skill} onDelete={handleDeleteSkill} />
                      </div>
                    ))}
                    {skills.offered_skills.length === 0 && (
                      <div className="col-12">
                        <p className="text-muted text-center py-3">
                          No offered skills yet. Add some skills you can teach!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wanted Skills */}
                <div className="mb-4">
                  <h6 className="text-info mb-3">
                    <i className="fas fa-arrow-down me-1"></i>Skills I Want to Learn
                  </h6>
                  <div className="row g-3">
                    {skills.wanted_skills.map(skill => (
                      <div key={skill.id} className="col-md-6">
                        <SkillCard skill={skill} onDelete={handleDeleteSkill} />
                      </div>
                    ))}
                    {skills.wanted_skills.length === 0 && (
                      <div className="col-12">
                        <p className="text-muted text-center py-3">
                          No wanted skills yet. Add some skills you'd like to learn!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejected Skills */}
                {skills.rejected_skills.length > 0 && (
                  <div>
                    <h6 className="text-danger mb-3">
                      <i className="fas fa-times-circle me-1"></i>Rejected Skills
                    </h6>
                    <div className="row g-3">
                      {skills.rejected_skills.map(skill => (
                        <div key={skill.id} className="col-md-6">
                          <SkillCard skill={skill} onDelete={handleDeleteSkill} isRejected />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-bolt me-2"></i>Quick Actions
                </h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to="/search" className="btn btn-outline-primary">
                    <i className="fas fa-search me-2"></i>Search Skills
                  </Link>
                  <Link to="/profile" className="btn btn-outline-secondary">
                    <i className="fas fa-user-edit me-2"></i>Edit Profile
                  </Link>
                  <Link to="/notifications" className="btn btn-outline-info">
                    <i className="fas fa-bell me-2"></i>View Notifications
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card mt-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-history me-2"></i>Recent Activity
                </h5>
              </div>
              <div className="card-body">
                {Array.isArray(swapRequests) && swapRequests.slice(0, 5).map(request => (
                  <div key={request.id} className="d-flex align-items-center mb-3">
                    <div className="flex-shrink-0">
                      <i className={`fas ${getRequestIcon(request.status)} text-${getRequestColor(request.status)}`}></i>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <p className="mb-1 small">
                        <strong>{request.requester_name || request.provider_name}</strong>
                      </p>
                      <p className="mb-0 text-muted small">
                        {request.offered_skill_name} ↔ {request.wanted_skill_name}
                      </p>
                    </div>
                  </div>
                ))}
                {(!Array.isArray(swapRequests) || swapRequests.length === 0) && (
                  <p className="text-muted text-center py-3">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddSkillModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Skill</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddSkillModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddSkill}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Skill Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newSkill.skill_name}
                      onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                      placeholder="e.g., JavaScript Programming"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Skill Type</label>
                    <select
                      className="form-select"
                      value={newSkill.skill_type}
                      onChange={(e) => setNewSkill({ ...newSkill, skill_type: e.target.value })}
                    >
                      <option value="offered">I can teach this</option>
                      <option value="wanted">I want to learn this</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newSkill.description}
                      onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                      placeholder="Describe your experience or what you'd like to learn..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddSkillModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Skill
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

const SkillCard = ({ skill, onDelete, isRejected = false }) => {
  const getStatusBadge = () => {
    if (isRejected) {
      return <span className="badge bg-danger">Rejected</span>;
    }
    if (skill.is_approved) {
      return <span className="badge bg-success">Approved</span>;
    }
    return <span className="badge bg-warning">Pending Review</span>;
  };

  return (
    <div className={`skill-card ${skill.skill_type} ${isRejected ? 'border-danger' : ''}`}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className="mb-0">{skill.skill_name}</h6>
        <div className="d-flex gap-1">
          {getStatusBadge()}
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDelete(skill.id)}
            title="Delete skill"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
      {skill.description && (
        <p className="small text-muted mb-2">{skill.description}</p>
      )}
      {isRejected && skill.rejection_reason && (
        <div className="alert alert-danger alert-sm">
          <strong>Reason:</strong> {skill.rejection_reason}
        </div>
      )}
      <small className="text-muted">
        {skill.skill_type === 'offered' ? 'Teaching' : 'Learning'} • 
        Added {new Date(skill.created_at).toLocaleDateString()}
      </small>
    </div>
  );
};

const getRequestIcon = (status) => {
  switch (status) {
    case 'pending': return 'fa-clock';
    case 'accepted': return 'fa-check-circle';
    case 'rejected': return 'fa-times-circle';
    case 'cancelled': return 'fa-ban';
    default: return 'fa-question-circle';
  }
};

const getRequestColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'danger';
    case 'cancelled': return 'secondary';
    default: return 'muted';
  }
};

export default Dashboard;
