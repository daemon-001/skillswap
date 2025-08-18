// SkillSwap Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Auto-hide alerts after 5 seconds (skip persistent ones)
    const alerts = document.querySelectorAll('.alert:not([data-no-autoclose])');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // Skill type toggle
    const skillTypeToggles = document.querySelectorAll('.skill-type-toggle');
    skillTypeToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const skillCard = this.closest('.skill-card');
            if (this.checked) {
                skillCard.classList.add('offered');
                skillCard.classList.remove('wanted');
            } else {
                skillCard.classList.add('wanted');
                skillCard.classList.remove('offered');
            }
        });
    });

    // Rating system
    const ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const rating = index + 1;
            const ratingContainer = this.closest('.rating-container');
            const hiddenInput = ratingContainer.querySelector('input[type="hidden"]');
            
            // Update hidden input
            if (hiddenInput) {
                hiddenInput.value = rating;
            }
            
            // Update star display
            ratingStars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
        });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(this.value);
            }, 300);
        });
    }

    // Modal form handling
    const modalForms = document.querySelectorAll('.modal form');
    modalForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
            }
        });
    });

    // Profile image upload preview
    const profileImageInput = document.getElementById('profile-image');
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.querySelector('.profile-avatar');
                    if (preview) {
                        preview.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Skill search filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterSkills(filter);
        });
    });

    // Swap request confirmation
    const swapRequestForms = document.querySelectorAll('.swap-request-form');
    swapRequestForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm('Are you sure you want to send this swap request?')) {
                e.preventDefault();
            }
        });
    });

    // Admin actions confirmation
    const adminActionButtons = document.querySelectorAll('.admin-action-btn');
    adminActionButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const action = this.dataset.action;
            const target = this.dataset.target;
            if (!confirm(`Are you sure you want to ${action} ${target}?`)) {
                e.preventDefault();
            }
        });
    });

    // Enhanced dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        if (toggle && menu) {
            // Add click outside to close
            document.addEventListener('click', function(e) {
                if (!dropdown.contains(e.target)) {
                    menu.classList.remove('show');
                }
            });
            
            // Add keyboard support
            toggle.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    menu.classList.toggle('show');
                }
            });
            
            // Add smooth animations
            menu.addEventListener('show.bs.dropdown', function() {
                this.style.opacity = '0';
                this.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    this.style.opacity = '1';
                    this.style.transform = 'translateY(0)';
                }, 10);
            });
        }
    });

    // Enhanced form checkboxes and switches
    const formChecks = document.querySelectorAll('.form-check-input');
    formChecks.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Add visual feedback
            if (this.checked) {
                this.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            }
        });
        
        // Add focus styles
        checkbox.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        checkbox.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    // Enhanced form selects
    const formSelects = document.querySelectorAll('.form-select');
    formSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Add visual feedback
            this.style.transform = 'scale(1.02)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
        
        // Add focus styles
        select.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        select.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
});

// Search function
function performSearch(query) {
    if (query.length < 2) return;
    
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            updateSearchResults(data.results);
        })
        .catch(error => {
            console.error('Search error:', error);
        });
}

// Update search results
function updateSearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center text-muted">No results found</div>';
        return;
    }
    
    results.forEach(result => {
        const resultElement = createSearchResultElement(result);
        resultsContainer.appendChild(resultElement);
    });
}

// Create search result element
function createSearchResultElement(result) {
    const div = document.createElement('div');
    div.className = 'search-result fade-in-up';
    div.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-8">
                <h5 class="mb-1">${result.skill_name}</h5>
                <p class="text-muted mb-2">${result.description}</p>
                <small class="text-muted">
                    <i class="fas fa-user me-1"></i>${result.user_name}
                    <i class="fas fa-map-marker-alt ms-3 me-1"></i>${result.location || 'Not specified'}
                </small>
            </div>
            <div class="col-md-4 text-end">
                <span class="badge bg-${result.skill_type === 'offered' ? 'success' : 'warning'} mb-2">
                    ${result.skill_type.charAt(0).toUpperCase() + result.skill_type.slice(1)}
                </span>
                <br>
                <a href="/request_swap/${result.id}" class="btn btn-primary btn-sm">
                    <i class="fas fa-exchange-alt me-1"></i>Request Swap
                </a>
            </div>
        </div>
    `;
    return div;
}

// Filter skills
function filterSkills(filter) {
    const skillCards = document.querySelectorAll('.skill-card');
    skillCards.forEach(card => {
        const skillType = card.dataset.type;
        if (filter === 'all' || skillType === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Show loading state
function showLoading(element) {
    if (element) {
        element.disabled = true;
        element.innerHTML = '<span class="loading-spinner"></span> Loading...';
    }
}

// Hide loading state
function hideLoading(element, originalText) {
    if (element) {
        element.disabled = false;
        element.innerHTML = originalText;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format rating stars
function formatRating(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars.push('<i class="fas fa-star"></i>');
        } else {
            stars.push('<i class="far fa-star"></i>');
        }
    }
    return stars.join('');
}

// Utility function to get CSRF token
function getCSRFToken() {
    const tokenElement = document.querySelector('meta[name="csrf-token"]');
    return tokenElement ? tokenElement.getAttribute('content') : '';
}

// Export functions for use in other scripts
window.SkillSwap = {
    showNotification,
    formatDate,
    formatRating,
    showLoading,
    hideLoading,
    getCSRFToken
}; 