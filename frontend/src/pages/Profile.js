import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    location: user?.location || '',
    bio: user?.bio || '',
    availability: user?.availability || '',
    is_public: user?.is_public || true,
    availability_days: user?.availability_days || [],
    start_time: user?.availability_start_time || '',
    end_time: user?.availability_end_time || ''
  });
  
  const [stats, setStats] = useState({
    offered_skills: 0,
    wanted_skills: 0,
    completed_swaps: 0,
    avg_rating: 0,
    total_ratings: 0,
    has_rating: false
  });
  
  const [skills, setSkills] = useState({
    offered_skills: [],
    wanted_skills: []
  });
  
  const [loading, setLoading] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    skill_type: 'offered',
    description: ''
  });

  useEffect(() => {
    fetchProfileStats();
    // Force refresh user data when component mounts
  }, []);

  useEffect(() => {
    // Update form data when user changes
    if (user) {
      setFormData({
        name: user.name || '',
        location: user.location || '',
        bio: user.bio || '',
        availability: user.availability || '',
        is_public: user.is_public !== undefined ? user.is_public : true,
        availability_days: user.availability_days || [],
        start_time: user.availability_start_time || '',
        end_time: user.availability_end_time || ''
      });
    }
  }, [user]);

  const fetchProfileStats = async () => {
    try {
      const response = await axios.get('/api/profile/stats');
      setStats(response.data.stats);
      setSkills({
        offered_skills: response.data.offered_skills,
        wanted_skills: response.data.wanted_skills
      });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDayChange = (day) => {
    setFormData(prev => ({
      ...prev,
      availability_days: prev.availability_days.includes(day)
        ? prev.availability_days.filter(d => d !== day)
        : [...prev.availability_days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put('/api/profile', formData);
      updateUser(response.data.user);
      showSuccess('Profile updated successfully!');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profile_photo', file);

    try {
      const response = await axios.post('/api/profile/photo', formData);
      updateUser(response.data.user);
      showSuccess('Profile photo updated successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      showError(error.response?.data?.error || 'Failed to upload photo');
    }
  };

  const handlePhotoRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    try {
      const response = await axios.delete('/api/profile/photo');
      updateUser(response.data.user);
      showSuccess('Profile photo removed successfully!');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to remove photo');
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
      fetchProfileStats();
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
      fetchProfileStats();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete skill');
    }
  };

  const handleResubmitSkill = async (skill) => {
    if (!window.confirm('Are you sure you want to resubmit this skill for review?')) {
      return;
    }

    try {
      await axios.post(`/api/skills/resubmit/${skill.id}`, {
        skill_name: skill.skill_name,
        skill_type: skill.skill_type,
        description: skill.description
      });
      showSuccess('Skill resubmitted successfully for review');
      fetchProfileStats();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to resubmit skill');
    }
  };

  const getCurrentUserPhotoUrl = () => {
    return getProfilePhotoUrl(user?.profile_photo);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fas fa-star ${i <= rating ? 'text-warning' : 'text-muted'}`}
        ></i>
      );
    }
    return stars;
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="container py-4">
      {/* Profile Hero Section */}
      <section className="profile-hero bg-primary text-white rounded mb-4 p-4">
        <div className="row align-items-center">
          <div className="col-md-4 text-center">
            <div className="profile-hero-avatar position-relative d-inline-block">
              <img
                src={getCurrentUserPhotoUrl()}
                alt="Profile"
                className="rounded-circle"
                style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                onError={handleImageError}
                onLoad={() => handleImageLoad('Profile page')}
              />
              {user?.is_under_supervision && (
                <div className="position-absolute top-0 end-0 bg-warning rounded-circle p-2">
                  <i className="fas fa-user-shield text-dark"></i>
                </div>
              )}
            </div>
            <div className="mt-3">
              <button
                className="btn btn-outline-light btn-sm me-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fas fa-camera me-2"></i>Change Photo
              </button>
              {user?.profile_photo && (
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handlePhotoRemove}
                >
                  <i className="fas fa-trash me-2"></i>Remove
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <div className="col-md-8">
            <h1 className="mb-3">{user?.name}</h1>
            <div className="mb-3">
              <div className="mb-2">
                <i className="fas fa-envelope me-2"></i>
                <span>{user?.email}</span>
              </div>
              <div className="mb-2">
                <i className="fas fa-map-marker-alt me-2"></i>
                <span>{user?.location || 'Location not specified'}</span>
              </div>
              <div className="mb-2">
                <i className="fas fa-calendar me-2"></i>
                <span>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</span>
              </div>
            </div>
            <div className="d-flex gap-2 mb-3">
              <span className={`badge ${formData.availability ? 'bg-success' : 'bg-secondary'}`}>
                <i className="fas fa-clock me-1"></i>
                {formData.availability ? 'Available' : 'Not Available'}
              </span>
              <span className={`badge ${formData.is_public ? 'bg-info' : 'bg-dark'}`}>
                <i className={`fas fa-${formData.is_public ? 'eye' : 'eye-slash'} me-1`}></i>
                {formData.is_public ? 'Public Profile' : 'Private Profile'}
              </span>
            </div>
            {user?.bio && (
              <div className="profile-bio">
                <p className="mb-0">{user.bio}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Supervision Alert */}
      {user?.is_under_supervision && (
        <div className="alert alert-warning mb-4" role="alert">
          <div className="d-flex align-items-center">
            <i className="fas fa-user-shield me-3 fs-4"></i>
            <div>
              <strong>Account Under Supervision:</strong> Your account is currently under administrative supervision. 
              You cannot add new skills, delete existing skills, or make swap requests. Please contact an administrator if you have questions.
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Profile Form */}
        <div className="col-md-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-user-edit me-2"></i>Edit Profile
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="form-label">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="location" className="form-label">
                      Location
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="bio" className="form-label">Bio</label>
                  <textarea
                    className="form-control"
                    id="bio"
                    name="bio"
                    rows="4"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell others about yourself, your interests, and what you're passionate about..."
                  ></textarea>
                </div>

                {/* Advanced Availability Scheduling */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Availability Details</label>
                  <div className="mb-3">
                    <label className="form-label">Select Available Days:</label>
                    <div className="row g-2">
                      {days.map(day => (
                        <div key={day} className="col-md-3 col-6">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={day}
                              checked={formData.availability_days.includes(day)}
                              onChange={() => handleDayChange(day)}
                            />
                            <label className="form-check-label" htmlFor={day}>
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.availability_days.length > 0 && (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Start Time</label>
                        <input
                          type="time"
                          className="form-control"
                          name="start_time"
                          value={formData.start_time}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Time</label>
                        <input
                          type="time"
                          className="form-control"
                          name="end_time"
                          value={formData.end_time}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is_public"
                      name="is_public"
                      checked={formData.is_public}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="is_public">
                      <i className="fas fa-eye me-1"></i>Make my profile public
                    </label>
                    <div className="form-text">
                      When enabled, other users can see your profile and skills in the public directory.
                    </div>
                  </div>
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Profile Stats */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-chart-bar me-2"></i>Profile Stats
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <div className="stats-card">
                    <h4 className="mb-1">{stats.offered_skills}</h4>
                    <small>Skills Offered</small>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="stats-card">
                    <h4 className="mb-1">{stats.wanted_skills}</h4>
                    <small>Skills Wanted</small>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="stats-card">
                    <h4 className="mb-1">{stats.completed_swaps}</h4>
                    <small>Completed Swaps</small>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <div className="stats-card">
                    {stats.has_rating ? (
                      <>
                        <h4 className="mb-1">{stats.avg_rating.toFixed(1)}</h4>
                        <small>Avg Rating</small>
                      </>
                    ) : (
                      <>
                        <h4 className="mb-1 text-muted">Unrated</h4>
                        <small>No ratings yet</small>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {stats.has_rating ? (
                <div className="text-center mt-3">
                  <div className="rating-stars">
                    {renderStars(Math.round(stats.avg_rating))}
                  </div>
                  <small className="text-muted">({stats.total_ratings} ratings)</small>
                </div>
              ) : (
                <div className="text-center mt-3">
                  <div className="rating-stars">
                    {renderStars(0)}
                  </div>
                  <small className="text-muted">No ratings yet</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Management */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-tools me-2"></i>Manage Skills
              </h5>
              {!user?.is_under_supervision ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddSkillModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>Add Skill
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" disabled title="Cannot add skills while under supervision">
                  <i className="fas fa-plus me-2"></i>Add Skill (Disabled)
                </button>
              )}
            </div>
            <div className="card-body">
              <ul className="nav nav-tabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link active"
                    id="offered-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#offered"
                    type="button"
                  >
                    <i className="fas fa-gift me-2"></i>Skills Offered ({skills.offered_skills.length})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className="nav-link"
                    id="wanted-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#wanted"
                    type="button"
                  >
                    <i className="fas fa-search me-2"></i>Skills Wanted ({skills.wanted_skills.length})
                  </button>
                </li>
              </ul>

              <div className="tab-content mt-3">
                <div className="tab-pane fade show active" id="offered" role="tabpanel">
                  {skills.offered_skills.length > 0 ? (
                    <div className="row">
                      {skills.offered_skills.map(skill => (
                        <div key={skill.id} className="col-md-6 mb-3">
                          <SkillCard
                            skill={skill}
                            onDelete={handleDeleteSkill}
                            onResubmit={handleResubmitSkill}
                            canDelete={!user?.is_under_supervision}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      <i className="fas fa-gift fa-3x mb-3"></i>
                      <p>You haven't added any skills to offer yet.</p>
                      {!user?.is_under_supervision && (
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowAddSkillModal(true)}
                        >
                          <i className="fas fa-plus me-2"></i>Add Your First Skill
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="tab-pane fade" id="wanted" role="tabpanel">
                  {skills.wanted_skills.length > 0 ? (
                    <div className="row">
                      {skills.wanted_skills.map(skill => (
                        <div key={skill.id} className="col-md-6 mb-3">
                          <SkillCard
                            skill={skill}
                            onDelete={handleDeleteSkill}
                            onResubmit={handleResubmitSkill}
                            canDelete={!user?.is_under_supervision}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      <i className="fas fa-search fa-3x mb-3"></i>
                      <p>You haven't added any skills you want to learn yet.</p>
                      {!user?.is_under_supervision && (
                        <button
                          className="btn btn-warning"
                          onClick={() => {
                            setNewSkill(prev => ({ ...prev, skill_type: 'wanted' }));
                            setShowAddSkillModal(true);
                          }}
                        >
                          <i className="fas fa-plus me-2"></i>Add Skills You Want
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddSkillModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-plus me-2"></i>Add New Skill
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddSkillModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddSkill}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="skill_name" className="form-label">Skill Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="skill_name"
                      value={newSkill.skill_name}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, skill_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="skill_type" className="form-label">Skill Type</label>
                    <select
                      className="form-select"
                      id="skill_type"
                      value={newSkill.skill_type}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, skill_type: e.target.value }))}
                      required
                    >
                      <option value="offered">I can offer this skill</option>
                      <option value="wanted">I want to learn this skill</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="description"
                      rows="3"
                      value={newSkill.description}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your skill level, experience, or what you're looking for..."
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
                    <i className="fas fa-plus me-2"></i>Add Skill
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

const SkillCard = ({ skill, onDelete, canDelete, onResubmit }) => {
  const getStatusBadge = () => {
    if (skill.is_rejected) {
      return <span className="badge bg-danger">Rejected</span>;
    }
    if (skill.is_approved) {
      return <span className="badge bg-success">Approved</span>;
    }
    return <span className="badge bg-warning">Pending Review</span>;
  };

  return (
    <div className={`card h-100 ${skill.is_rejected ? 'border-danger' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="card-title mb-0">{skill.skill_name}</h6>
          <div className="d-flex gap-1">
            {getStatusBadge()}
            {canDelete && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => onDelete(skill.id)}
                title="Delete skill"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
            {skill.is_rejected && onResubmit && (
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => onResubmit(skill)}
                title="Resubmit skill"
              >
                <i className="fas fa-redo"></i>
              </button>
            )}
          </div>
        </div>
        {skill.description && (
          <p className="card-text text-muted mb-2">{skill.description}</p>
        )}
        {skill.is_rejected && skill.rejection_reason && (
          <div className="alert alert-danger alert-sm">
            <strong>Reason:</strong> {skill.rejection_reason}
          </div>
        )}
        <small className="text-muted">
          {skill.skill_type === 'offered' ? 'Teaching' : 'Learning'} • 
          Added {new Date(skill.created_at).toLocaleDateString()}
        </small>
      </div>
    </div>
  );
};

export default Profile;
