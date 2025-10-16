import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const RequestSwap = () => {
  const { skillId } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  
  const [skill, setSkill] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    offered_skill_id: '',
    message: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [skillId, user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch skill details
      const skillResponse = await axios.get(`/api/swap/request/${skillId}`);
      setSkill(skillResponse.data.skill);
      
      // Fetch user's offered skills
      const skillsResponse = await axios.get('/api/skills');
      const offeredSkills = skillsResponse.data.offered_skills || [];
      setUserSkills(offeredSkills);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showError(error.response?.data?.error || 'Failed to load skill details');
      navigate('/search');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.offered_skill_id) {
      showError('Please select a skill to offer');
      return;
    }
    
    if (formData.message.trim().length < 10) {
      showError('Please write a more detailed message (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    
    try {
      await axios.post('/api/swap/send_request', {
        skill_id: skillId,
        offered_skill_id: formData.offered_skill_id,
        message: formData.message.trim()
      });
      
      showSuccess('Swap request sent successfully!');
      navigate('/swap-requests');
    } catch (error) {
      console.error('Error sending swap request:', error);
      showError(error.response?.data?.error || 'Failed to send swap request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading skill details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Skill Not Found</h4>
                <p className="text-muted">The skill you're looking for doesn't exist or is no longer available.</p>
                <Link to="/search" className="btn btn-primary">
                  <i className="fas fa-search me-2"></i>Back to Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Main Request Card */}
          <div className="card border-0 shadow-lg">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h3 className="mb-0">
                <i className="fas fa-exchange-alt me-2"></i>Request Skill Swap
              </h3>
            </div>
            <div className="card-body">
              {/* Skill Information */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card border-0 bg-light">
                    <div className="card-body">
                      <h5 className="card-title">
                        <i className="fas fa-gift me-2"></i>Skill You Want
                      </h5>
                      <h6 className="text-primary">{skill.skill_name}</h6>
                      <p className="text-muted">{skill.description || 'No description provided'}</p>
                      <div className="d-flex align-items-center mb-2">
                        <img
                          src={getProfilePhotoUrl(skill.user_photo)}
                          alt={skill.user_name}
                          className="rounded-circle me-2"
                          style={{width: '30px', height: '30px', objectFit: 'cover'}}
                          onError={handleImageError}
                          onLoad={() => handleImageLoad(skill.user_name)}
                        />
                        <small className="text-muted">
                          <i className="fas fa-user me-1"></i>{skill.user_name}
                        </small>
                      </div>
                      {skill.user_location && (
                        <small className="text-muted">
                          <i className="fas fa-map-marker-alt me-1"></i>{skill.user_location}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="card border-0 bg-light">
                    <div className="card-body">
                      <h5 className="card-title">
                        <i className="fas fa-user me-2"></i>Your Profile
                      </h5>
                      <div className="d-flex align-items-center mb-2">
                        <img
                          src={getProfilePhotoUrl(user.profile_photo)}
                          alt={user.name}
                          className="rounded-circle me-2"
                          style={{width: '30px', height: '30px', objectFit: 'cover'}}
                          onError={handleImageError}
                          onLoad={() => handleImageLoad(user.name)}
                        />
                        <small className="text-muted">{user.name}</small>
                      </div>
                      <p className="text-muted small">
                        You have {userSkills.length} skill{userSkills.length !== 1 ? 's' : ''} to offer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Swap Request Form */}
              {userSkills.length > 0 ? (
                <form onSubmit={handleSubmit} className="swap-request-form">
                  <div className="mb-3">
                    <label htmlFor="offered_skill_id" className="form-label">Your Offered Skill</label>
                    <select 
                      className="form-select" 
                      id="offered_skill_id" 
                      value={formData.offered_skill_id}
                      onChange={(e) => setFormData({...formData, offered_skill_id: e.target.value})}
                      required
                    >
                      <option value="">Choose a skill to offer...</option>
                      {userSkills.map(skillOption => (
                        <option key={skillOption.id} value={skillOption.id}>
                          {skillOption.skill_name}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      Select the skill you want to offer in exchange for {skill.skill_name}.
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="message" className="form-label">Message to {skill.user_name}</label>
                    <textarea 
                      className="form-control" 
                      id="message" 
                      rows="4" 
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Introduce yourself and explain why you'd like to swap skills..."
                      required
                    />
                    <div className="form-text">
                      Be friendly and explain what you hope to learn and how you can help.
                    </div>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-2"></i>Sending Request...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>Send Swap Request
                        </>
                      )}
                    </button>
                    <Link to="/search" className="btn btn-outline-secondary">
                      <i className="fas fa-arrow-left me-2"></i>Back to Search
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                  <h4>No Skills to Offer</h4>
                  <p className="text-muted">
                    You need to add skills to your profile before you can request swaps.
                  </p>
                  <Link to="/dashboard" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>Add Your Skills
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Tips Card */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body">
              <h6 className="card-title text-primary">
                <i className="fas fa-lightbulb me-2"></i>Tips for Successful Swaps
              </h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="fas fa-check text-success me-2"></i>
                  <small>Be specific about what you want to learn</small>
                </li>
                <li className="mb-2">
                  <i className="fas fa-check text-success me-2"></i>
                  <small>Explain how you can help in return</small>
                </li>
                <li className="mb-2">
                  <i className="fas fa-check text-success me-2"></i>
                  <small>Suggest a time that works for both parties</small>
                </li>
                <li>
                  <i className="fas fa-check text-success me-2"></i>
                  <small>Be respectful and professional</small>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestSwap;
