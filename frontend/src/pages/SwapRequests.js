import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError } from '../utils/photoUtils';
import axios from 'axios';

const SwapRequests = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('sent');
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);

  const fetchSwapRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/swap/all-requests');
      setSentRequests(response.data.sent_requests);
      setReceivedRequests(response.data.received_requests);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      showError('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedSkill || !requestMessage.trim()) {
      showError('Please provide a message for your request');
      return;
    }

    try {
      await axios.post('/api/swap/send_request', {
        skill_id: selectedSkill.id,
        message: requestMessage.trim()
      });
      showSuccess('Swap request sent successfully');
      setShowRequestModal(false);
      setSelectedSkill(null);
      setRequestMessage('');
      fetchSwapRequests();
    } catch (error) {
      console.error('Error sending swap request:', error);
      showError(error.response?.data?.error || 'Failed to send swap request');
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    try {
      await axios.post(`/api/swap/respond/${requestId}/${action}`);
      showSuccess(`Swap request ${action}ed successfully`);
      fetchSwapRequests();
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error);
      showError(`Failed to ${action} swap request`);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this swap request?')) {
      return;
    }

    try {
      await axios.post(`/api/swap/cancel/${requestId}`);
      showSuccess('Swap request cancelled successfully');
      fetchSwapRequests();
    } catch (error) {
      console.error('Error cancelling swap request:', error);
      showError('Failed to cancel swap request');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'bg-warning', text: 'Pending' },
      accepted: { class: 'bg-success', text: 'Accepted' },
      rejected: { class: 'bg-danger', text: 'Rejected' },
      cancelled: { class: 'bg-secondary', text: 'Cancelled' },
      completed: { class: 'bg-primary', text: 'Completed' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const RequestCard = ({ request, type }) => (
    <div className="card mb-3" style={{borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0,0,0,0.1)'}}>
      <div className="card-body">
        <div className="row align-items-center">
          <div className="col-md-2 text-center">
            <img 
              src={getProfilePhotoUrl(request.profile_photo)} 
              alt={type === 'sent' ? request.provider_name : request.requester_name}
              className="rounded-circle" 
              style={{width: '50px', height: '50px', objectFit: 'cover'}}
              onError={handleImageError}
            />
          </div>
          <div className="col-md-6">
            <h6 className="mb-1">
              <strong>{request.skill_name}</strong>
            </h6>
            <p className="mb-1 text-muted">
              {type === 'sent' ? `Provider: ${request.provider_name}` : `Requester: ${request.requester_name}`}
            </p>
            {request.message && (
              <p className="mb-0 text-muted small">
                <em>"{request.message}"</em>
              </p>
            )}
          </div>
          <div className="col-md-2 text-center">
            {getStatusBadge(request.status)}
          </div>
          <div className="col-md-2">
            {type === 'sent' ? (
              request.status === 'pending' && (
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleCancelRequest(request.id)}
                >
                  Cancel
                </button>
              )
            ) : (
              request.status === 'pending' && (
                <div className="btn-group btn-group-sm">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleRespondRequest(request.id, 'accept')}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleRespondRequest(request.id, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                <p>Loading swap requests...</p>
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
            <div className="card-header" style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white', border: 'none'}}>
              <h4 className="mb-0">
                <i className="fas fa-exchange-alt me-2"></i>Skill Swap Requests
              </h4>
            </div>
            <div className="card-body">
              <ul className="nav nav-tabs" id="swapTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                    style={{borderRadius: 'var(--radius-md)'}}
                  >
                    <i className="fas fa-paper-plane me-1"></i>Sent Requests ({sentRequests.length})
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'received' ? 'active' : ''}`}
                    onClick={() => setActiveTab('received')}
                    style={{borderRadius: 'var(--radius-md)'}}
                  >
                    <i className="fas fa-inbox me-1"></i>Received Requests ({receivedRequests.length})
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="row">
        <div className="col-12">
          <div className="card modern-search-card">
            <div className="card-body">
              {activeTab === 'sent' ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Your Sent Requests</h5>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowRequestModal(true)}
                    >
                      <i className="fas fa-plus me-1"></i>New Request
                    </button>
                  </div>
                  {sentRequests.length > 0 ? (
                    sentRequests.map(request => (
                      <RequestCard key={request.id} request={request} type="sent" />
                    ))
                  ) : (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-paper-plane fa-3x mb-3 opacity-50"></i>
                      <p>No sent requests yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h5 className="mb-3">Received Requests</h5>
                  {receivedRequests.length > 0 ? (
                    receivedRequests.map(request => (
                      <RequestCard key={request.id} request={request} type="received" />
                    ))
                  ) : (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                      <p>No received requests yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exchange-alt me-2"></i>Send Swap Request
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRequestModal(false)}></button>
              </div>
              <form onSubmit={handleSendRequest}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Message to Provider</label>
                    <textarea 
                      className="form-control" 
                      rows="4" 
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Tell the provider why you want to learn this skill and what you can offer in return..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-paper-plane me-1"></i>Send Request
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

export default SwapRequests;
