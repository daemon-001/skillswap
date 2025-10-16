import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const AdminSkills = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user && user.is_admin) {
      fetchSkills();
    }
  }, [user]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/skills');
      setSkills(response.data.skills);
    } catch (error) {
      console.error('Error fetching skills:', error);
      showError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSkill = async (skillId) => {
    try {
      await axios.post(`/api/admin/approve_skill/${skillId}`);
      showSuccess('Skill approved successfully');
      fetchSkills(); // Refresh the list
    } catch (error) {
      console.error('Error approving skill:', error);
      showError('Failed to approve skill');
    }
  };

  const handleRejectSkill = async () => {
    if (!selectedSkill || !rejectionReason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }

    try {
      await axios.post('/api/admin/reject_skill_with_reason', {
        skill_id: selectedSkill.id,
        rejection_reason: rejectionReason.trim()
      });
      showSuccess('Skill rejected successfully');
      setShowRejectModal(false);
      setSelectedSkill(null);
      setRejectionReason('');
      fetchSkills(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting skill:', error);
      showError('Failed to reject skill');
    }
  };

  const openRejectModal = (skill) => {
    setSelectedSkill(skill);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedSkill(null);
    setRejectionReason('');
  };

  const handlePresetReason = (reason) => {
    setRejectionReason(reason);
  };

  const approveAllPending = async () => {
    if (!window.confirm('Are you sure you want to approve all pending skills? This action cannot be undone.')) {
      return;
    }

    try {
      const pendingSkills = skills.filter(skill => !skill.is_approved);
      for (const skill of pendingSkills) {
        await axios.post(`/api/admin/approve_skill/${skill.id}`);
      }
      showSuccess(`Approved ${pendingSkills.length} skills successfully`);
      fetchSkills(); // Refresh the list
    } catch (error) {
      console.error('Error approving all skills:', error);
      showError('Failed to approve all skills');
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
                <p>Loading skills...</p>
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
                <i className="fas fa-tools me-3"></i>Manage Skills
              </h1>
              <p className="hero-subtitle">
                Review and approve skills submitted by users to maintain platform quality.
              </p>
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <div className="hero-avatar">
              <div className="avatar-img d-flex align-items-center justify-content-center" 
                   style={{background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.1))', 
                           width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto'}}>
                <i className="fas fa-cogs" style={{fontSize: '3rem', color: 'var(--success)'}}></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Table */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>All Skills
              </h5>
            </div>
            <div className="card-body">
              {skills.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover" style={{borderRadius: 'var(--radius-lg)', overflow: 'hidden'}}>
                    <thead style={{background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05))'}}>
                      <tr>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Skill Name</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Type</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>User</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Description</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Status</th>
                        <th style={{border: 'none', padding: '1rem', fontWeight: '600'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skills.map(skill => (
                        <tr key={skill.id} style={{borderBottom: '1px solid rgba(0,0,0,0.1)'}}>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <strong>{skill.skill_name}</strong>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <span className={`badge bg-${skill.skill_type === 'offered' ? 'success' : 'warning'}`} 
                                  style={{borderRadius: 'var(--radius-md)'}}>
                              {skill.skill_type.charAt(0).toUpperCase() + skill.skill_type.slice(1)}
                            </span>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <div>
                              <small className="fw-bold">{skill.user_name}</small><br/>
                              <small className="text-muted">{skill.email}</small>
                            </div>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <small className="text-muted">
                              {skill.description && skill.description.length > 50 
                                ? skill.description.substring(0, 50) + '...' 
                                : skill.description || 'No description'}
                            </small>
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            {skill.is_approved ? (
                              <span className="badge bg-success" style={{borderRadius: 'var(--radius-md)'}}>Approved</span>
                            ) : (
                              <span className="badge bg-warning" style={{borderRadius: 'var(--radius-md)'}}>Pending</span>
                            )}
                          </td>
                          <td style={{padding: '1rem', border: 'none'}}>
                            <div className="btn-group" role="group">
                              {!skill.is_approved ? (
                                <button 
                                  className="btn btn-sm btn-outline-success admin-action-btn" 
                                  style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}}
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to approve this skill?')) {
                                      handleApproveSkill(skill.id);
                                    }
                                  }}
                                >
                                  <i className="fas fa-check me-1"></i>Accept
                                </button>
                              ) : (
                                <button className="btn btn-sm btn-success" 
                                        style={{borderRadius: 'var(--radius-md)', marginRight: '0.25rem'}} 
                                        disabled>
                                  <i className="fas fa-check me-1"></i>Accepted
                                </button>
                              )}
                              
                              <button 
                                className="btn btn-sm btn-outline-danger reject-skill-btn" 
                                style={{borderRadius: 'var(--radius-md)'}}
                                onClick={() => openRejectModal(skill)}
                              >
                                <i className="fas fa-times me-1"></i>Reject
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
                  <i className="fas fa-tools fa-3x mb-3 opacity-50"></i>
                  <p>No skills found</p>
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
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', color: 'white', border: 'none'}}>
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
                          onClick={approveAllPending}>
                    <i className="fas fa-check-double me-2"></i>Approve All Pending
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Skill Modal */}
      {showRejectModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-times-circle me-2 text-danger"></i>Reject Skill
                </h5>
                <button type="button" className="btn-close" onClick={closeRejectModal}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  You are about to reject the skill "<strong>{selectedSkill?.skill_name}</strong>" by <strong>{selectedSkill?.user_name}</strong>.
                </div>
                
                <div className="mb-3">
                  <label htmlFor="rejectionReason" className="form-label">
                    <i className="fas fa-comment me-1"></i>Reason for Rejection <span className="text-danger">*</span>
                  </label>
                  <textarea 
                    className="form-control" 
                    id="rejectionReason" 
                    rows="4" 
                    placeholder="Please provide a clear reason why this skill is being rejected..." 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  ></textarea>
                  <div className="form-text">
                    This message will be sent to the user along with the rejection notification.
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-lightbulb me-1"></i>Common Rejection Reasons
                  </label>
                  <div className="d-grid gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm text-start reason-preset" 
                      onClick={() => handlePresetReason("This skill is too vague or generic. Please be more specific about your expertise level and what you can teach.")}
                    >
                      <i className="fas fa-copy me-1"></i>Too vague/generic
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm text-start reason-preset" 
                      onClick={() => handlePresetReason("This skill doesn't appear to be appropriate for our educational platform. Please review our community guidelines.")}
                    >
                      <i className="fas fa-copy me-1"></i>Inappropriate content
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm text-start reason-preset" 
                      onClick={() => handlePresetReason("This skill appears to be incomplete or missing important details. Please provide more information about what you can offer.")}
                    >
                      <i className="fas fa-copy me-1"></i>Incomplete information
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-sm text-start reason-preset" 
                      onClick={() => handlePresetReason("This skill is a duplicate of one you've already added. Please avoid submitting the same skill multiple times.")}
                    >
                      <i className="fas fa-copy me-1"></i>Duplicate skill
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeRejectModal}>
                  <i className="fas fa-times me-1"></i>Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleRejectSkill}>
                  <i className="fas fa-ban me-1"></i>Reject Skill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSkills;
