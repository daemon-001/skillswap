import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <img src="/logo.svg" alt="SkillSwap" className="navbar-logo me-2" />
          SkillSwap
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/') ? 'active' : ''}`} 
                to="/"
              >
                <i className="fas fa-home me-1"></i>Home
              </Link>
            </li>
            
            {user && !user.is_admin && (
              <>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} 
                    to="/dashboard"
                  >
                    <i className="fas fa-tachometer-alt me-1"></i>Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${isActive('/search') ? 'active' : ''}`} 
                    to="/search"
                  >
                    <i className="fas fa-search me-1"></i>Search Skills
                  </Link>
                </li>
              </>
            )}
            
            {user && user.is_admin && (
              <li className="nav-item">
                <Link 
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`} 
                  to="/admin"
                >
                  <i className="fas fa-cogs me-1"></i>Admin Dashboard
                </Link>
              </li>
            )}
            
            {user && !user.is_admin && (
              <li className="nav-item dropdown">
                <a 
                  className={`nav-link dropdown-toggle ${isActive('/profile') ? 'active' : ''}`} 
                  href="#" 
                  id="navbarDropdown" 
                  role="button" 
                  data-bs-toggle="dropdown"
                >
                  <i className="fas fa-user me-1"></i>Account
                </a>
                <ul className="dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to="/profile">
                      <i className="fas fa-user-edit me-2"></i>Profile
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/notifications">
                      <i className="fas fa-bell me-2"></i>Notifications
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/swap-requests">
                      <i className="fas fa-exchange-alt me-2"></i>Swap Requests
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </li>
            )}
            
            {user && user.is_admin && (
              <li className="nav-item dropdown">
                <a 
                  className="nav-link dropdown-toggle" 
                  href="#" 
                  id="adminDropdown" 
                  role="button" 
                  data-bs-toggle="dropdown"
                >
                  <i className="fas fa-user-shield me-1"></i>Admin
                </a>
                <ul className="dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to="/admin">
                      <i className="fas fa-cogs me-2"></i>Admin Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/admin/users">
                      <i className="fas fa-users me-2"></i>Manage Users
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/admin/skills">
                      <i className="fas fa-tools me-2"></i>Manage Skills
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/admin/messages">
                      <i className="fas fa-bullhorn me-2"></i>Manage Messages
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </li>
            )}
            
            {!user && (
              <>
                <li className="nav-item">
                  <Link 
                    className={`nav-link ${isActive('/login') ? 'active' : ''}`} 
                    to="/login"
                  >
                    <i className="fas fa-sign-in-alt me-1"></i>Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    className={`btn btn-primary ${isActive('/register') ? 'active' : ''}`} 
                    to="/register"
                  >
                    <i className="fas fa-user-plus me-1"></i>Get Started
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
