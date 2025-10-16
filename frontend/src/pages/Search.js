import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError } from '../utils/photoUtils';
import axios from 'axios';

const Search = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchSkills();
  }, [searchQuery]);

  const fetchSkills = async (page = 1) => {
    try {
      const params = {
        page,
        per_page: 12,
        ...(searchQuery && { q: searchQuery })
      };

      const response = await axios.get('/api/skills/search', { params });
      setSkills(response.data.skills);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSkills();
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
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Search Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-3">
            <i className="fas fa-search me-2"></i>
            Search Skills
          </h1>
          <p className="text-muted">
            Find skills you want to learn and connect with people who can teach them.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSearch}>
                <div className="row g-3">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search for skills (e.g., JavaScript, Guitar, Cooking)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <button type="submit" className="btn btn-primary w-100">
                      <i className="fas fa-search me-1"></i>Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="row g-4">
        {skills.map(skill => (
          <div key={skill.id} className="col-lg-4 col-md-6">
            <SkillCard skill={skill} onRequestSwap={handleRequestSwap} />
          </div>
        ))}
      </div>

      {skills.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h4 className="text-muted">No skills found</h4>
          <p className="text-muted">
            {searchQuery ? 'Try different search terms' : 'Start searching for skills you want to learn'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="row mt-5">
          <div className="col-12">
            <nav>
              <ul className="pagination justify-content-center">
                <li className={`page-item ${!pagination.has_prev ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => fetchSkills(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                  >
                    Previous
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i;
                  if (pageNum > pagination.pages) return null;
                  
                  return (
                    <li key={pageNum} className={`page-item ${pageNum === pagination.page ? 'active' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => fetchSkills(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => fetchSkills(pagination.page + 1)}
                    disabled={!pagination.has_next}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

    </div>
  );
};

const SkillCard = ({ skill, onRequestSwap }) => {
  return (
    <div className="card h-100" style={{borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0,0,0,0.1)'}}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h5 className="card-title">{skill.skill_name}</h5>
          {skill.is_under_supervision && (
            <span className="badge bg-warning">
              <i className="fas fa-user-shield"></i>
            </span>
          )}
        </div>
        
        <div className="d-flex align-items-center mb-3">
          <img 
            src={getProfilePhotoUrl(skill.profile_photo)} 
            alt={skill.user_name}
            className="rounded-circle me-2" 
            style={{width: '30px', height: '30px', objectFit: 'cover'}}
            onError={handleImageError}
          />
          <div>
            <p className="text-muted mb-0">
              <strong>{skill.user_name}</strong>
            </p>
            {skill.location && (
              <small className="text-muted">
                <i className="fas fa-map-marker-alt me-1"></i>
                {skill.location}
              </small>
            )}
          </div>
        </div>
        
        {skill.description && (
          <p className="card-text mb-3">{skill.description}</p>
        )}
        
        <div className="d-grid gap-2">
          <Link 
            to={`/user/${skill.user_id}`} 
            className="btn btn-outline-primary"
            style={{borderRadius: 'var(--radius-md)'}}
          >
            <i className="fas fa-eye me-1"></i>
            View Profile
          </Link>
          <button 
            className="btn btn-primary"
            onClick={() => onRequestSwap(skill)}
            style={{borderRadius: 'var(--radius-md)'}}
          >
            <i className="fas fa-handshake me-1"></i>
            Request Swap
          </button>
        </div>
      </div>
      <div className="card-footer text-muted" style={{borderTop: '1px solid rgba(0,0,0,0.1)'}}>
        <small>
          <i className="fas fa-clock me-1"></i>
          Added {new Date(skill.created_at).toLocaleDateString()}
        </small>
      </div>
    </div>
  );
};

export default Search;
