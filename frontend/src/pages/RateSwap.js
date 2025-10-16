import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const RateSwap = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [swapRequest, setSwapRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && requestId) {
      fetchSwapRequest();
    }
  }, [user, requestId]);

  const fetchSwapRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/swap/rate/${requestId}`);
      setSwapRequest(response.data.swap_request);
    } catch (error) {
      console.error('Error fetching swap request:', error);
      showError(error.response?.data?.error || 'Failed to load swap request');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      showError('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('/api/swap/submit_rating', {
        request_id: requestId,
        rating: rating,
        feedback: feedback.trim()
      });
      showSuccess('Rating submitted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting rating:', error);
      showError(error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRatingChange, disabled = false }) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`btn btn-link p-0 me-1 ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onRatingChange(star)}
            style={{border: 'none', background: 'none'}}
          >
            <i 
              className={`fas fa-star ${star <= rating ? 'text-warning' : 'text-muted'}`}
              style={{fontSize: '1.5rem'}}
            ></i>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading swap details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!swapRequest) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Swap Request Not Found</h4>
                <p className="text-muted">The swap request you're looking for doesn't exist or you don't have permission to rate it.</p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
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
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)', color: 'white', border: 'none'}}>
              <h4 className="mb-0">
                <i className="fas fa-star me-2"></i>Rate Your Skill Swap
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Details */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-info-circle me-2"></i>Swap Details
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6><strong>Skill:</strong> {swapRequest.skill_name}</h6>
                  <h6><strong>Provider:</strong> {swapRequest.provider_name}</h6>
                </div>
                <div className="col-md-6">
                  <h6><strong>Status:</strong> <span className="badge bg-success">Completed</span></h6>
                  <h6><strong>Request Date:</strong> {new Date(swapRequest.created_at).toLocaleDateString()}</h6>
                </div>
              </div>
              {swapRequest.message && (
                <div className="mt-3">
                  <h6><strong>Your Message:</strong></h6>
                  <p className="text-muted">{swapRequest.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Form */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--warning) 0%, #f59e0b 100%)', color: 'white', border: 'none'}}>
              <h5 className="mb-0">
                <i className="fas fa-star me-2"></i>Rate Your Experience
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmitRating}>
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <i className="fas fa-star me-1"></i>Rating <span className="text-danger">*</span>
                  </label>
                  <div className="mb-2">
                    <StarRating 
                      rating={rating} 
                      onRatingChange={setRating}
                    />
                  </div>
                  <div className="text-muted">
                    {rating === 0 && 'Please select a rating'}
                    {rating === 1 && 'Poor - Very dissatisfied'}
                    {rating === 2 && 'Fair - Somewhat dissatisfied'}
                    {rating === 3 && 'Good - Satisfied'}
                    {rating === 4 && 'Very Good - Very satisfied'}
                    {rating === 5 && 'Excellent - Extremely satisfied'}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="feedback" className="form-label fw-bold">
                    <i className="fas fa-comment me-1"></i>Feedback (Optional)
                  </label>
                  <textarea 
                    className="form-control" 
                    id="feedback"
                    rows="4" 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your experience with this skill swap. What went well? What could be improved?"
                    style={{borderRadius: 'var(--radius-lg)', border: '2px solid rgba(0,0,0,0.1)', padding: '0.75rem 1rem', transition: 'all 0.3s ease'}}
                  />
                  <div className="form-text">
                    Your feedback helps improve the platform for everyone.
                  </div>
                </div>

                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => navigate('/dashboard')}
                  >
                    <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success" 
                    disabled={rating === 0 || submitting}
                  >
                    {submitting ? (
                      <i className="fas fa-spinner fa-spin me-1"></i>
                    ) : (
                      <i className="fas fa-star me-1"></i>
                    )}
                    Submit Rating
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Guidelines */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--info) 0%, #60a5fa 100%)', color: 'white', border: 'none'}}>
              <h6 className="mb-0">
                <i className="fas fa-lightbulb me-2"></i>Rating Guidelines
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6><i className="fas fa-star text-warning me-1"></i>5 Stars - Excellent</h6>
                  <p className="text-muted small">Outstanding experience, exceeded expectations</p>
                  
                  <h6><i className="fas fa-star text-warning me-1"></i>4 Stars - Very Good</h6>
                  <p className="text-muted small">Great experience, met expectations</p>
                  
                  <h6><i className="fas fa-star text-warning me-1"></i>3 Stars - Good</h6>
                  <p className="text-muted small">Satisfactory experience, met basic expectations</p>
                </div>
                <div className="col-md-6">
                  <h6><i className="fas fa-star text-warning me-1"></i>2 Stars - Fair</h6>
                  <p className="text-muted small">Below expectations, some issues</p>
                  
                  <h6><i className="fas fa-star text-warning me-1"></i>1 Star - Poor</h6>
                  <p className="text-muted small">Very poor experience, major issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateSwap;
