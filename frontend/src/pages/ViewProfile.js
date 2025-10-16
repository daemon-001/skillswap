import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const ViewProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSwap = (skill) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (skill.user_id === user.id) {
      showError('Cannot request your own skill');
      return;
    }
    
    // Navigate to the dedicated request swap page
    navigate(`/request-swap/${skill.id}`);
  };


  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading profile...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-user-slash fa-3x text-muted mb-3"></i>
                <h4>Profile Not Found</h4>
                <p className="text-muted">The user profile you're looking for doesn't exist.</p>
                <Link to="/" className="btn btn-primary">
                  <i className="fas fa-home me-1"></i>Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userProfile = profile.user;
  const offeredSkills = profile.offered_skills || [];
  const wantedSkills = profile.wanted_skills || [];
  const allSkills = [...offeredSkills, ...wantedSkills];

  return (
    <div className="container mt-4">
      {/* Profile Hero Section */}
      <section className="dashboard-hero mb-5">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <div className="hero-content">
              <h1 className="hero-title">
                <i className="fas fa-user me-3"></i>{userProfile.name}
              </h1>
              <p className="hero-subtitle">
                {userProfile.bio || 'Member of the SkillSwap community'}
              </p>
              {userProfile.location && (
                <p className="text-muted">
                  <i className="fas fa-map-marker-alt me-2"></i>{userProfile.location}
                </p>
              )}
              {user && user.id !== userProfile.id && (
                <div className="mt-3">
                  <button 
                    className="btn btn-primary me-2"
                    onClick={() => {
                      // This will open the chat interface
                      const chatButton = document.querySelector('.floating-chat-btn');
                      if (chatButton) {
                        chatButton.click();
                      }
                    }}
                    style={{borderRadius: 'var(--radius-md)'}}
                  >
                    <i className="fas fa-comment me-1"></i>Send Message
                  </button>
                  <Link to="/search" className="btn btn-outline-primary" style={{borderRadius: 'var(--radius-md)'}}>
                    <i className="fas fa-search me-1"></i>Find More Skills
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <div className="hero-avatar">
              <img
                src={getProfilePhotoUrl(userProfile.profile_photo)}
                alt={userProfile.name}
                className="avatar-img"
                style={{width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover'}}
                onError={handleImageError}
                onLoad={() => handleImageLoad(userProfile.name)}
              />
              {userProfile.is_under_supervision && (
                <div className="supervision-badge">
                  <i className="fas fa-user-shield"></i>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-tools me-2"></i>Skills
              </h5>
            </div>
            <div className="card-body">
              {allSkills.length > 0 ? (
                <div className="row g-4">
                  {allSkills.map(skill => (
                    <div key={skill.id} className="col-lg-6">
                      <div className="card h-100" style={{borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0,0,0,0.1)'}}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h6 className="card-title mb-0">
                              <strong>{skill.skill_name}</strong>
                            </h6>
                            <span className={`badge ${skill.skill_type === 'offered' ? 'bg-success' : 'bg-info'}`}>
                              {skill.skill_type === 'offered' ? 'Offering' : 'Wanting'}
                            </span>
                          </div>
                          
                          {skill.description && (
                            <p className="card-text text-muted mb-3">{skill.description}</p>
                          )}
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <i className="fas fa-clock me-1"></i>
                              Added {new Date(skill.created_at).toLocaleDateString()}
                            </small>
                            {skill.skill_type === 'offered' && user && user.id !== userProfile.id && (
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleRequestSwap(skill)}
                                style={{borderRadius: 'var(--radius-md)'}}
                              >
                                <i className="fas fa-handshake me-1"></i>Request Swap
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-tools fa-3x mb-3 opacity-50"></i>
                  <h5>No Skills Yet</h5>
                  <p>This user hasn't added any skills yet.</p>
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
                  <Link to="/search" className="btn btn-primary w-100" 
                         style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-search me-2"></i>Search More Skills
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/dashboard" className="btn btn-info w-100" 
                         style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-tachometer-alt me-2"></i>My Dashboard
                  </Link>
                </div>
                <div className="col-md-3">
                  <Link to="/swap-requests" className="btn btn-warning w-100" 
                         style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <i className="fas fa-exchange-alt me-2"></i>My Requests
                  </Link>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-success w-100" 
                          style={{height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'}} 
                          onClick={() => window.history.back()}>
                    <i className="fas fa-arrow-left me-2"></i>Go Back
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

export default ViewProfile;