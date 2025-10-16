/**
 * Utility functions for handling profile photos
 */

const BACKEND_URL = 'http://localhost:5000';

/**
 * Get the full URL for a profile photo
 * @param {string} profilePhoto - The profile photo filename
 * @returns {string} - The full URL to the profile photo or default avatar
 */
export const getProfilePhotoUrl = (profilePhoto) => {
  if (profilePhoto) {
    return `${BACKEND_URL}/api/uploads/${profilePhoto}`;
  }
  return '/default-avatar.png';
};

/**
 * Handle image load error by setting fallback
 * @param {Event} e - The error event
 */
export const handleImageError = (e) => {
  console.error('Profile photo failed to load:', e.target.src);
  e.target.src = '/default-avatar.png';
};

/**
 * Handle successful image load
 * @param {string} userName - The name of the user (for logging)
 */
export const handleImageLoad = (userName = '') => {
  // Profile photo loaded successfully
};
