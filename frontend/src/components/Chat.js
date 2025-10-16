import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfilePhotoUrl, handleImageError, handleImageLoad } from '../utils/photoUtils';
import axios from 'axios';

const Chat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/chat/unread_count');
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation]);

  // Fetch unread count on component mount and periodically
  useEffect(() => {
    // Fetch immediately
    fetchUnreadCount();

    // Poll for unread count every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Don't render chat if user is not logged in
  if (!user) return null;

  const toggleChat = async () => {
    setIsOpen(!isOpen);
    
    // If opening chat, refresh unread count
    if (!isOpen) {
      fetchUnreadCount();
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setSelectedConversation(null);
  };

  const minimizeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="floating-chat-btn" onClick={toggleChat}>
        <div className="chat-btn-icon">
          <i className="fas fa-comments"></i>
        </div>
        {unreadCount > 0 && (
          <span className="chat-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Chat Interface */}
      {isOpen && (
        <div className="chat-interface">
          <div className="chat-header">
            <div className="chat-header-content">
              <div className="chat-tabs">
                <button 
                  className={`chat-tab ${activeTab === 'conversations' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('conversations');
                    setSelectedConversation(null);
                  }}
                >
                  <i className="fas fa-comments"></i> Conversations
                </button>
                <button 
                  className={`chat-tab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('users');
                    setSelectedConversation(null);
                  }}
                >
                  <i className="fas fa-users"></i> Users
                </button>
                <button 
                  className={`chat-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('notifications');
                    setSelectedConversation(null);
                  }}
                >
                  <i className="fas fa-bell"></i> Notifications
                </button>
                {user.is_admin && (
                  <button 
                    className={`chat-tab ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('admin');
                      setSelectedConversation(null);
                    }}
                  >
                    <i className="fas fa-user-shield"></i> Admin
                  </button>
                )}
              </div>
              <div className="chat-controls">
                <button className="chat-btn" onClick={minimizeChat}>
                  <i className="fas fa-minus"></i>
                </button>
                <button className="chat-btn" onClick={closeChat}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div className="chat-body">
            {activeTab === 'conversations' && (
              <ConversationsTab 
                selectedConversation={selectedConversation}
                setSelectedConversation={setSelectedConversation}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                messagesEndRef={messagesEndRef}
                setUnreadCount={setUnreadCount}
                unreadCount={unreadCount}
                fetchUnreadCount={fetchUnreadCount}
              />
            )}
            {activeTab === 'users' && (
              <UsersTab 
                setSelectedConversation={setSelectedConversation}
                setActiveTab={setActiveTab}
                fetchUnreadCount={fetchUnreadCount}
              />
            )}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'admin' && user.is_admin && <AdminTab />}
          </div>
        </div>
      )}
    </>
  );
};

const ConversationsTab = ({ 
  selectedConversation, 
  setSelectedConversation, 
  newMessage, 
  setNewMessage, 
  messagesEndRef,
  setUnreadCount,
  unreadCount,
  fetchUnreadCount
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { showError } = useNotification();

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get('/api/chat/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchConversations();
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchUnreadCount]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await axios.post('/api/chat/send_message', {
        conversation_id: selectedConversation.id,
        message: newMessage.trim()
      });

      if (response.data.success) {
        // Add the new message to the conversation
        setSelectedConversation(prev => ({
          ...prev,
          messages: [...prev.messages, response.data.message]
        }));
        setNewMessage('');
        // Refresh conversations to update last message
        fetchConversations();
        // Refresh unread count
        fetchUnreadCount();
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    // Handle different timestamp formats
    let date;
    
    if (typeof timestamp === 'string') {
      // Handle ISO string format
      if (timestamp.includes('T') || timestamp.includes('Z')) {
        date = new Date(timestamp);
      } else {
        // Handle SQL timestamp format (YYYY-MM-DD HH:MM:SS)
        date = new Date(timestamp.replace(' ', 'T'));
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Try to parse as number (Unix timestamp) or other formats
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid timestamp:', timestamp);
      return 'Invalid time';
    }
    
    const now = new Date();
    const diff = now - date;
    
    // Handle negative differences (future timestamps)
    if (diff < 0) {
      return 'Just now';
    }
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Less than 30 days
    if (diff < 2592000000) {
      const weeks = Math.floor(diff / 604800000);
      return `${weeks}w ago`;
    }
    
    // For older messages, show the actual date
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isCurrentYear ? undefined : 'numeric'
    });
  };

  if (selectedConversation) {
    return (
      <div className="chat-conversation">
        <div className="conversation-header">
          <button 
            className="back-btn"
            onClick={() => setSelectedConversation(null)}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="conversation-user-info">
            <img
              src={getProfilePhotoUrl(selectedConversation.other_user_photo)}
              alt={selectedConversation.other_user_name}
              className="conversation-avatar"
              onError={handleImageError}
              onLoad={() => handleImageLoad(selectedConversation.other_user_name)}
            />
            <div>
              <h6>{selectedConversation.other_user_name}</h6>
              {selectedConversation.other_user_location && (
                <small className="text-muted">
                  <i className="fas fa-map-marker-alt"></i> {selectedConversation.other_user_location}
                </small>
              )}
            </div>
          </div>
        </div>

        <div className="messages-container">
          {selectedConversation.messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender_id === user.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                <div className="message-text">{message.message}</div>
                <div className="message-time">
                  {formatTime(message.created_at)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-form">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-tab-content">
        <div className="text-center py-4">
          <i className="fas fa-spinner fa-spin fa-2x text-muted"></i>
          <p className="text-muted mt-2">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-tab-content">
      {conversations.length === 0 ? (
        <div className="text-center py-4">
          <i className="fas fa-comments fa-3x text-muted mb-3"></i>
          <p className="text-muted">No conversations yet</p>
          <p className="small text-muted">Start a conversation with other users!</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map(conversation => (
            <div 
              key={conversation.id}
              className={`conversation-item ${conversation.unread_count > 0 ? 'unread' : ''}`}
              onClick={async () => {
                try {
                  const response = await axios.get(`/api/chat/conversation/${conversation.id}`);
                  const conversationData = {
                    ...response.data.conversation,
                    messages: response.data.messages || []
                  };
                  setSelectedConversation(conversationData);
                  // Refresh unread count after selecting conversation (messages are marked as read)
                  fetchUnreadCount();
                } catch (error) {
                  console.error('Error loading conversation:', error);
                  showError('Failed to load conversation');
                }
              }}
            >
              <img
                src={getProfilePhotoUrl(conversation.other_user_photo)}
                alt={conversation.other_user_name}
                className="conversation-avatar"
                onError={handleImageError}
                onLoad={() => handleImageLoad(conversation.other_user_name)}
              />
              <div className="conversation-info">
                <div className="conversation-header">
                  <h6>{conversation.other_user_name}</h6>
                  <span className="conversation-time">
                    {formatTime(conversation.last_message_at)}
                  </span>
                </div>
                <p className="conversation-preview">
                  {conversation.last_message}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <span className="unread-badge">
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UsersTab = ({ setSelectedConversation, setActiveTab, fetchUnreadCount }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const { showSuccess, showError } = useNotification();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/chat/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const startConversation = async (userId) => {
    setStarting(userId);
    try {
      const response = await axios.post('/api/chat/start_conversation', {
        user_id: userId
      });
      
      // Fetch the new conversation
      const convResponse = await axios.get(`/api/chat/conversation/${response.data.conversation_id}`);
      
      // Combine conversation and messages into a single object
      const conversationData = {
        ...convResponse.data.conversation,
        messages: convResponse.data.messages || []
      };
      
      setSelectedConversation(conversationData);
      setActiveTab('conversations');
      showSuccess('Conversation started!');
      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to start conversation');
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <div className="chat-tab-content">
        <div className="text-center py-4">
          <i className="fas fa-spinner fa-spin fa-2x text-muted"></i>
          <p className="text-muted mt-2">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-tab-content">
      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-item">
            <img
              src={getProfilePhotoUrl(user.profile_photo)}
              alt={user.name}
              className="user-avatar"
              onError={handleImageError}
              onLoad={() => handleImageLoad(user.name)}
            />
            <div className="user-info">
              <h6>{user.name}</h6>
              {user.location && (
                <p className="text-muted small">
                  <i className="fas fa-map-marker-alt"></i> {user.location}
                </p>
              )}
              {user.bio && (
                <p className="text-muted small">{user.bio}</p>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => startConversation(user.id)}
              disabled={starting === user.id}
            >
              {starting === user.id ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <>
                  <i className="fas fa-comment"></i> Chat
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotificationsTab = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-tab-content">
        <div className="text-center py-4">
          <i className="fas fa-spinner fa-spin fa-2x text-muted"></i>
          <p className="text-muted mt-2">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-tab-content">
      {notifications.length === 0 ? (
        <div className="text-center py-4">
          <i className="fas fa-bell fa-3x text-muted mb-3"></i>
          <p className="text-muted">No notifications</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-content">
                <h6>{notification.title}</h6>
                <p>{notification.message}</p>
                <small className="text-muted">
                  {new Date(notification.created_at).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminTab = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/chat/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !message.trim() || sending) return;

    setSending(true);
    try {
      await axios.post('/api/chat/admin_message', {
        user_id: parseInt(selectedUser),
        message: message.trim()
      });
      
      showSuccess('Message sent successfully!');
      setMessage('');
      setSelectedUser('');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-tab-content">
      <div className="admin-message-form">
        <h6>Send Message to User</h6>
        <form onSubmit={handleSendMessage}>
          <div className="mb-3">
            <select 
              className="form-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
            >
              <option value="">Select a user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.location && `(${user.location})`}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <textarea 
              className="form-control" 
              placeholder="Type your message..."
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            ></textarea>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!selectedUser || !message.trim() || sending}
          >
            {sending ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i> Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;