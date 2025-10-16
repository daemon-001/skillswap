import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const Home = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchAnnouncements();
  }, [searchQuery, availabilityFilter]);

  const fetchUsers = async (page = 1) => {
    try {
      const params = {
        page,
        per_page: 6,
        ...(searchQuery && { q: searchQuery }),
        ...(availabilityFilter && { availability: availabilityFilter })
      };

      const response = await axios.get('/api/users', { params });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('/api/announcements');
      const announcements = [];
      if (response.data.latest) {
        announcements.push(response.data.latest);
      }
      announcements.push(...response.data.older);
      setAnnouncements(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
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
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content text-center">
            <h1 className="hero-title">
              Connect Through Skills
            </h1>
            <p className="hero-subtitle">
              Share your expertise, learn new skills, and build meaningful connections with people in your community.
            </p>
            {!user && (
              <div className="mt-4">
                <Link to="/register" className="btn btn-primary btn-lg me-3">
                  <i className="fas fa-user-plus me-2"></i>Get Started
                </Link>
                <Link to="/login" className="btn btn-outline-primary btn-lg">
                  <i className="fas fa-sign-in-alt me-2"></i>Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container py-5">
        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="row mb-5">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-bullhorn me-2"></i>Announcements
                  </h5>
                </div>
                <div className="card-body">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className="mb-3">
                      <h6>{announcement.title}</h6>
                      <p className="mb-1">{announcement.content}</p>
                      <small className="text-muted">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSearch}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name or skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={availabilityFilter}
                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                      >
                        <option value="">All Users</option>
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                    <div className="col-md-2">
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

        {/* User Profiles */}
        <div className="row mb-4">
          <div className="col-12">
            <h2 className="mb-4">
              <i className="fas fa-users me-2"></i>Community Members
            </h2>
          </div>
        </div>

        <div className="row g-4">
          {users.map(userProfile => (
            <div key={userProfile.id} className="col-lg-4 col-md-6">
              <UserProfileCard user={userProfile} />
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-5">
            <i className="fas fa-users fa-3x text-muted mb-3"></i>
            <h4 className="text-muted">No users found</h4>
            <p className="text-muted">Try adjusting your search criteria</p>
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
                      onClick={() => fetchUsers(pagination.page - 1)}
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
                          onClick={() => fetchUsers(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => fetchUsers(pagination.page + 1)}
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
    </div>
  );
};

const UserProfileCard = ({ user }) => {
  const { user: currentUser } = useAuth();

  return (
    <div className="card user-profile-card h-100">
      <div className="card-body text-center">
        <div className="mb-3">
          <img
            src={getProfilePhotoUrl(user.profile_photo)}
            alt={user.name}
            className="profile-avatar"
            onError={handleImageError}
            onLoad={() => handleImageLoad(user.name)}
          />
          {user.is_under_supervision && (
            <div className="supervision-badge mt-2">
              <i className="fas fa-user-shield text-warning"></i>
              <small className="text-warning ms-1">Under Supervision</small>
            </div>
          )}
        </div>
        
        <h5 className="card-title">{user.name}</h5>
        
        {user.location && (
          <p className="text-muted mb-2">
            <i className="fas fa-map-marker-alt me-1"></i>{user.location}
          </p>
        )}
        
        {user.bio && (
          <p className="text-muted small mb-3">{user.bio}</p>
        )}
        
        {user.availability && (
          <p className="text-success small mb-3">
            <i className="fas fa-clock me-1"></i>{user.availability}
          </p>
        )}
        
        {/* Skills */}
        <div className="mb-3">
          {user.offered_skills.length > 0 && (
            <div className="mb-2">
              <small className="text-muted d-block mb-1">Offers:</small>
              {user.offered_skills.slice(0, 3).map(skill => (
                <span key={skill} className="skill-badge offered me-1">
                  {skill}
                </span>
              ))}
              {user.offered_skills.length > 3 && (
                <span className="skill-badge">+{user.offered_skills.length - 3} more</span>
              )}
            </div>
          )}
          
          {user.wanted_skills.length > 0 && (
            <div className="mb-2">
              <small className="text-muted d-block mb-1">Wants:</small>
              {user.wanted_skills.slice(0, 3).map(skill => (
                <span key={skill} className="skill-badge wanted me-1">
                  {skill}
                </span>
              ))}
              {user.wanted_skills.length > 3 && (
                <span className="skill-badge">+{user.wanted_skills.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        
        {/* Rating */}
        {user.total_ratings > 0 && (
          <div className="mb-3">
            <div className="rating-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <i
                  key={i}
                  className={`fas fa-star ${i < Math.round(user.rating) ? 'text-warning' : 'text-muted'}`}
                ></i>
              ))}
              <span className="ms-2 small text-muted">
                ({user.total_ratings} review{user.total_ratings !== 1 ? 's' : ''})
              </span>
            </div>
          </div>
        )}
        
        <div className="d-grid gap-2">
          <Link to={`/user/${user.id}`} className="btn btn-outline-primary">
            <i className="fas fa-eye me-1"></i>View Profile
          </Link>
          {currentUser && currentUser.id !== user.id && (
            <Link to={`/request/${user.id}`} className="btn btn-primary">
              <i className="fas fa-handshake me-1"></i>Request Swap
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
