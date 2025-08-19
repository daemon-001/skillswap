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

// SkillSwap Chat Application
class SkillSwapChat {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.currentConversation = null;
        this.currentTab = 'conversations';
        this.conversations = [];
        this.users = [];
        this.notifications = [];
        this.announcements = [];
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.position = { x: 20, y: 80 };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startPolling();
    }
    
    bindEvents() {
        // Chat toggle
        const chatToggle = document.getElementById('chatToggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleChat();
            });
        }
        
        // Chat controls
        const chatClose = document.getElementById('chatClose');
        if (chatClose) {
            chatClose.addEventListener('click', () => this.closeChat());
        }
        
        const chatMinimize = document.getElementById('chatMinimize');
        if (chatMinimize) {
            chatMinimize.addEventListener('click', () => this.toggleMinimize());
        }
        
        // Tab switching
        const chatTabs = document.querySelectorAll('.chat-tab');
        chatTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Message sending
        const sendMessage = document.getElementById('sendMessage');
        if (sendMessage) {
            sendMessage.addEventListener('click', () => this.sendMessage());
        }
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
            

        }
        
        // Admin message sending
        const sendAdminMessage = document.getElementById('sendAdminMessage');
        if (sendAdminMessage) {
            sendAdminMessage.addEventListener('click', () => this.sendAdminMessage());
        }
        
        // Back button
        const backBtn = document.getElementById('backToConversations');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showConversationsList());
        }
        
        // Drag functionality
        this.initDragAndDrop();
    }
    
    initDragAndDrop() {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;
        
        chatHeader.addEventListener('mousedown', (e) => {
            if (e.target.closest('.chat-tab') || e.target.closest('.chat-btn')) {
                return;
            }
            
            this.isDragging = true;
            this.dragOffset.x = e.clientX - this.position.x;
            this.dragOffset.y = e.clientY - this.position.y;
            
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.addEventListener('mouseup', this.handleMouseUp.bind(this));
            
            document.body.style.cursor = 'grabbing';
            document.querySelector('.chat-interface').classList.add('dragging');
        });
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        this.position.x = e.clientX - this.dragOffset.x;
        this.position.y = e.clientY - this.dragOffset.y;
        
        // Keep chat within viewport bounds
        const chatInterface = document.querySelector('.chat-interface');
        const rect = chatInterface.getBoundingClientRect();
        
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.y < 0) this.position.y = 0;
        if (this.position.x + rect.width > window.innerWidth) {
            this.position.x = window.innerWidth - rect.width;
        }
        if (this.position.y + rect.height > window.innerHeight) {
            this.position.y = window.innerHeight - rect.height;
        }
        
        chatInterface.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
    }
    
    handleMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
            document.body.style.cursor = '';
            const chatInterface = document.querySelector('.chat-interface');
            chatInterface.classList.remove('dragging');
    }
    
    async loadInitialData() {
        try {
            // Load conversations
            await this.loadConversations();
            
            // Load users
            await this.loadUsers();
            
            // Load notifications
            await this.loadNotifications();
            
            // Update unread count
            await this.updateUnreadCount();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    async loadConversations() {
        try {
            const response = await fetch('/chat/conversations');
            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations || [];
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    async loadUsers() {
        try {
            // Load users from the dedicated API endpoint
            const response = await fetch('/chat/users');
            if (response.ok) {
                const data = await response.json();
                this.users = data.users || [];
                this.renderUsers();
                
                // Also populate admin user select if admin
                if (document.getElementById('adminUserSelect')) {
                    this.populateAdminUserSelect();
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/chat/notifications');
            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications || [];
                this.announcements = data.announcements || [];
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    async updateUnreadCount() {
        try {
            const response = await fetch('/chat/unread_count');
            if (response.ok) {
                const data = await response.json();
                this.updateUnreadBadge(data.unread_count);
            }
        } catch (error) {
            console.error('Error updating unread count:', error);
        }
    }
    
    updateUnreadBadge(count) {
        const badge = document.getElementById('chatUnreadBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    renderConversations() {
        const container = document.getElementById('conversationsList');
        if (!container) return;
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h6>No conversations yet</h6>
                    <p>Start chatting with other users to see conversations here.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item" data-conversation-id="${conv.id}">
                <img src="${conv.other_user_photo || '/static/images/default-avatar.png'}" 
                     alt="${conv.other_user_name}" 
                     class="conversation-avatar"
                     onerror="this.src='/static/images/default-avatar.png'"
                     onload="this.style.display='block'"
                     style="display: none;">
                <div class="conversation-info">
                    <span class="conversation-name">${conv.other_user_name}</span>
                    <span class="conversation-last-message">${conv.last_message}</span>
                </div>
                ${conv.unread_count > 0 ? `<div class="conversation-unread">${conv.unread_count}</div>` : ''}
            </div>
        `).join('');
        
        // Add click events
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openConversation(item.dataset.conversationId);
            });
        });
    }
    
    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) return;
        
        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h6>No users available</h6>
                    <p>There are no other users to chat with at the moment.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.users.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <img src="${user.profile_photo || '/static/images/default-avatar.png'}" 
                     alt="${user.name}" 
                     class="user-avatar"
                     onerror="this.src='/static/images/default-avatar.png'"
                     onload="this.style.display='block'"
                     style="display: none;">
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-status">Available for chat</div>
                </div>
            </div>
        `).join('');
        
        // Add click events
        container.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', () => {
                this.startConversationWithUser(item.dataset.userId);
            });
        });
    }
    
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        const allItems = [...this.notifications, ...this.announcements];
        
        if (allItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <h6>No notifications</h6>
                    <p>You're all caught up! No new notifications.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allItems.map(item => `
            <div class="notification-item ${item.type || 'info'}">
                <div class="notification-title">${item.title || item.content}</div>
                ${item.message ? `<div class="notification-message">${item.message}</div>` : ''}
                <div class="notification-time">${this.formatTime(item.created_at)}</div>
            </div>
        `).join('');
    }
    
    async openConversation(conversationId) {
        try {
            const response = await fetch(`/chat/conversation/${conversationId}`);
            if (response.ok) {
                const data = await response.json();
                this.currentConversation = conversationId;
                this.showConversationView(data.messages, data.conversation);
            }
        } catch (error) {
            console.error('Error opening conversation:', error);
        }
    }
    
    showConversationView(messages, conversation) {
        const conversationsList = document.getElementById('conversationsList');
        const conversationView = document.getElementById('conversationView');
        
        if (conversationsList && conversationView) {
            conversationsList.style.display = 'none';
            conversationView.style.display = 'flex';
            
            // Update profile header
            this.updateProfileHeader(conversation);
            
            this.renderMessages(messages);
            
            // Scroll to bottom to show latest messages
            this.scrollToBottom();
        }
    }
    
    showConversationsList() {
        const conversationsList = document.getElementById('conversationsList');
        const conversationView = document.getElementById('conversationView');
        const profileInfo = document.getElementById('conversationProfileInfo');
        
        if (conversationsList && conversationView) {
            conversationsList.style.display = 'block';
            conversationView.style.display = 'none';
        }
        
        // Hide profile info when going back to conversations list
        if (profileInfo) {
            profileInfo.style.display = 'none';
        }
        
        this.currentConversation = null;
    }
    
    updateProfileHeader(conversation) {
        const profileInfo = document.getElementById('conversationProfileInfo');
        const avatar = document.getElementById('conversationProfileAvatar');
        const name = document.getElementById('conversationProfileName');
        const location = document.getElementById('conversationProfileLocation');
        const bio = document.getElementById('conversationProfileBio');
        
        if (profileInfo && conversation) {
            // Update avatar
            if (avatar) {
                avatar.src = conversation.other_user_photo || '/static/images/default-avatar.png';
                avatar.alt = conversation.other_user_name;
                avatar.onerror = function() {
                    this.src = '/static/images/default-avatar.png';
                };
                avatar.onload = function() {
                    this.style.display = 'block';
                };
                avatar.style.display = 'none';
            }
            
            // Update name
            if (name) {
                name.textContent = conversation.other_user_name;
            }
            
            // Update location
            if (location) {
                location.textContent = conversation.other_user_location || 'Location not specified';
            }
            
            // Update bio
            if (bio) {
                bio.textContent = conversation.other_user_bio || 'No bio available';
            }
            
            // Show the profile info
            profileInfo.style.display = 'flex';
        }
    }
    
    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.is_own ? 'own' : 'other'}">
                <div class="message-content">${msg.message}</div>
                <div class="message-time">${this.formatTime(msg.created_at)}</div>
            </div>
        `).join('');
    }
    
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentConversation) return;
        
        try {
            const response = await fetch('/chat/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: this.currentConversation,
                    message: message
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Add message to UI
                    this.addMessageToUI(data.message);
                    input.value = '';
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.is_own ? 'own' : 'other'}`;
        messageElement.innerHTML = `
            <div class="message-content">${message.message}</div>
            <div class="message-time">${this.formatTime(message.created_at)}</div>
        `;
        
        container.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    async startConversationWithUser(userId) {
        try {
            const response = await fetch('/chat/start_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentConversation = data.conversation_id;
                this.showConversationView([]);
                // Load messages for the new conversation
                this.loadMessagesForConversation(data.conversation_id);
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    }

    // New method to open chat with a specific user from external sources
    async openChatWithUser(userId, userName = '') {
        try {
            // Open the chat if it's not already open
            if (!this.isOpen) {
                this.openChat();
            }
            
            // Switch to users tab
            this.switchTab('users');
            
            // Start conversation with the user
            await this.startConversationWithUser(userId);
            
            // Show success message
            if (userName) {
                this.showSystemMessage(`Chat opened with ${userName}`);
            }
        } catch (error) {
            console.error('Error opening chat with user:', error);
            alert('Error opening chat. Please try again.');
        }
    }

    // Helper method to show system messages
    showSystemMessage(message) {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message system-message';
            messageElement.innerHTML = `
                <div class="message-content">
                    <small class="text-muted">${message}</small>
                </div>
            `;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Method to load messages for a specific conversation
    async loadMessagesForConversation(conversationId) {
        try {
            const response = await fetch(`/chat/conversation/${conversationId}`);
            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages);
                // Update profile header if conversation metadata is available
                if (data.conversation) {
                    this.updateProfileHeader(data.conversation);
                }
                // Scroll to bottom to show latest messages
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    async sendAdminMessage() {
        const userSelect = document.getElementById('adminUserSelect');
        const messageInput = document.getElementById('adminMessageInput');
        
        const userId = userSelect.value;
        const message = messageInput.value.trim();
        
        if (!userId || !message) {
            alert('Please select a user and enter a message.');
            return;
        }
        
        try {
            const response = await fetch('/chat/admin_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    message: message
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    messageInput.value = '';
                    alert('Message sent successfully!');
                }
            }
        } catch (error) {
            console.error('Error sending admin message:', error);
            alert('Error sending message. Please try again.');
        }
    }
    
    populateAdminUserSelect() {
        const userSelect = document.getElementById('adminUserSelect');
        if (!userSelect) return;
        
        // Clear existing options
        userSelect.innerHTML = '<option value="">Select a user...</option>';
        
        // Add user options
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });
    }
    
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.chat-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
        
        this.currentTab = tabName;
        
        // Load data for the tab if needed
        if (tabName === 'notifications') {
            this.loadNotifications();
        }
    }
    
    toggleChat() {
        const chatInterface = document.getElementById('chatInterface');
        if (!chatInterface) return;
        
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        const chatInterface = document.getElementById('chatInterface');
        if (!chatInterface) return;
        
        chatInterface.style.display = 'flex';
        chatInterface.classList.add('show');
        this.isOpen = true;
        
        // Load fresh data
        this.loadInitialData();
    }
    
    closeChat() {
        const chatInterface = document.getElementById('chatInterface');
        if (!chatInterface) return;
        
        chatInterface.classList.add('hide');
        setTimeout(() => {
            chatInterface.style.display = 'none';
            chatInterface.classList.remove('hide');
        }, 300);
        
        this.isOpen = false;
    }
    
    toggleMinimize() {
        const chatInterface = document.querySelector('.chat-interface');
        if (!chatInterface) return;
        
        if (this.isMinimized) {
            chatInterface.classList.remove('minimized');
            this.isMinimized = false;
        } else {
            chatInterface.classList.add('minimized');
            this.isMinimized = true;
        }
    }
    
    startPolling() {
        // Poll for new messages every 5 seconds
        setInterval(() => {
            if (this.isOpen) {
                this.updateUnreadCount();
                if (this.currentConversation) {
                    this.refreshCurrentConversation();
                }
            }
        }, 5000);
    }
    
    async refreshCurrentConversation() {
        if (!this.currentConversation) return;
        
        try {
            const response = await fetch(`/chat/conversation/${this.currentConversation}`);
            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages);
                // Scroll to bottom to show latest messages
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error refreshing conversation:', error);
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is logged in
    if (document.querySelector('#chatToggle')) {
        try {
            window.skillSwapChat = new SkillSwapChat();
        } catch (error) {
            console.error('Error initializing chat:', error);
        }
    }
});

    // Global function to open chat with a specific user (accessible from HTML)
    window.openChatWithUser = function(userId, userName) {
        if (window.skillSwapChat) {
            window.skillSwapChat.openChatWithUser(userId, userName);
        } else {
            // Fallback: redirect to chat page
            window.location.href = '/chat';
        }
    };

    // Handle send message buttons for non-logged-in users
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-success') && e.target.closest('.btn-success').onclick && 
            e.target.closest('.btn-success').onclick.toString().includes('openChatWithUser')) {
            // Check if user is logged in
            if (!document.querySelector('#chatToggle')) {
                e.preventDefault();
                e.stopPropagation();
                // Redirect to login page
                window.location.href = '/login';
                return false;
            }
        }
    });

// Global functions for error handling
window.handleImageError = function(img) {
    img.src = '/static/images/default-avatar.png';
};

// Add error handling for chat interface
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('chat')) {
        console.error('Chat error:', e);
    }
}); 