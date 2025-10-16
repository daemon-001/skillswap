import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <div className="footer-brand">
              <span className="footer-brand-text">SkillSwap</span>
            </div>
            <p className="footer-description">
              Connect with amazing people, share your expertise, and learn new skills through our community-driven platform.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" title="Follow us on Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link" title="Follow us on LinkedIn">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="social-link" title="Follow us on GitHub">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Platform</h6>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to={user ? "/search" : "/login"}>Search Skills</Link></li>
              <li><Link to={user ? "/dashboard" : "/login"}>Dashboard</Link></li>
              <li><Link to={user ? "/profile" : "/login"}>Profile</Link></li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Support</h6>
            <ul className="footer-links">
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Community Guidelines</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Company</h6>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Get Started</h6>
            <ul className="footer-links">
              {!user ? (
                <>
                  <li><Link to="/register">Create Account</Link></li>
                  <li><Link to="/login">Sign In</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/profile">Update Profile</Link></li>
                  <li><a href="#" onClick={() => {}}>Sign Out</a></li>
                </>
              )}
            </ul>
          </div>
        </div>
        
        <hr className="footer-divider" />
        
        <div className="footer-bottom">
          <div className="row align-items-center">
            <div className="col-md-6">
              <p className="footer-copyright">
                &copy; 2025 SkillSwap. All rights reserved. Connecting people through knowledge exchange.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="footer-version">
                <i className="fas fa-code me-1"></i>
                Built with <i className="fas fa-heart text-danger"></i> for the community
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
