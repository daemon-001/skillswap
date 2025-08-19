# SkillSwap - Connect Through Skills

A web application that allows users to exchange skills with each other. Users can offer skills they have and request skills they want to learn, creating a community of knowledge exchange.

## Features

### Core Functionality
- **User Registration & Authentication**: Secure login system with user profiles
- **Skill Management**: Add, edit, and manage offered and wanted skills
- **Skill Matching**: Find users with skills you want to learn
- **Swap Requests**: Request skill exchanges with other users
- **Rating System**: Rate and review completed skill swaps
- **User Profiles**: Detailed profiles with skills, ratings, and availability

### New Chat System (WhatsApp-like)
- **Real-time Messaging**: Direct chat with any registered user
- **Conversation Management**: View and manage all conversations
- **Admin Messaging**: Admins can message any user directly
- **Notifications**: View system notifications and announcements
- **Drag & Drop**: Draggable chat window that can be positioned anywhere
- **Responsive Design**: Works on both desktop and mobile devices
- **Quick Message Access**: Send message buttons on user profiles and homepage listings

### Admin Features
- **User Management**: Ban/unban users, place under supervision
- **Skill Moderation**: Approve or reject user-submitted skills
- **System Messages**: Send announcements to all users
- **Quick Messages**: Send targeted messages to specific users
- **Reports**: Generate CSV reports for user activity, feedback, and swap statistics

## Installation

1. **Clone the repository**
```bash
   git clone <repository-url>
cd skillswap
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the application**
```bash
python skill_swap_app.py
```

4. **Access the application**
   - Open your browser and go to `http://localhost:5000`
   - Default admin credentials: `admin@skillswap.com` / `admin123`

## Database Setup

The application automatically creates the SQLite database with the following tables:
- `users`: User accounts and profiles
- `skills`: Offered and wanted skills
- `swap_requests`: Skill exchange requests
- `ratings`: User ratings and feedback
- `messages`: System announcements
- `notifications`: User notifications
- `chat_conversations`: Chat conversations between users
- `chat_messages`: Individual chat messages

## Chat System Usage

### For Regular Users
1. **Access Chat**: Click the "Chat" button in the navigation bar
2. **Start Conversations**: 
   - Go to the "Users" tab to see all available users
   - Click on a user to start a new conversation
3. **View Conversations**: 
   - Go to the "Conversations" tab to see all your chats
   - Click on a conversation to view messages
4. **Send Messages**: Type your message and press Enter or click the send button

### For Admins
1. **Admin Tab**: Access the "Admin" tab in the chat interface
2. **Send Messages**: 
   - Select a user from the dropdown
   - Type your message
   - Click "Send" to deliver the message
3. **System Messages**: Messages sent as admin appear as system messages

### Chat Features
- **Draggable**: Click and drag the chat header to move the window
- **Minimizable**: Click the minimize button to collapse the chat
- **Responsive**: Automatically adapts to mobile devices
- **Real-time Updates**: Polls for new messages every 5 seconds
- **Unread Counts**: Shows unread message badges in the navigation

### Quick Message Access
- **User Profiles**: Click "Send Message" button on any user's profile to instantly open chat
- **Homepage Listings**: Send message buttons on user cards for quick access
- **Search Results**: Message users directly from skill search results
- **Automatic Chat Opening**: Chat app opens automatically when clicking send message buttons
- **User Selection**: Automatically starts conversation with the selected user

## File Structure

```
skillswap/
├── skill_swap_app.py          # Main Flask application
├── requirements.txt            # Python dependencies
├── skill_swap.db              # SQLite database
├── static/
│   ├── css/
│   │   └── style.css          # Main stylesheet with chat styles
│   ├── js/
│   │   └── main.js            # JavaScript with chat functionality
│   └── uploads/               # User profile photos
└── templates/
    ├── base.html              # Base template with chat interface
    ├── chat.html              # Dedicated chat page
    └── ...                    # Other templates
```

## API Endpoints

### Chat Endpoints
- `GET /chat` - Main chat page
- `GET /chat/conversation/<id>` - Get conversation messages
- `POST /chat/send_message` - Send a new message
- `POST /chat/start_conversation` - Start new conversation
- `POST /chat/admin_message` - Send admin message (admin only)
- `GET /chat/unread_count` - Get unread message count
- `GET /chat/notifications` - Get notifications and announcements

## Security Features

- **Authentication Required**: All chat features require user login
- **Admin Verification**: Admin-only features are properly protected
- **User Validation**: Users can only access conversations they're part of
- **Input Sanitization**: Messages are properly handled and stored

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: Responsive design for mobile devices
- **JavaScript Required**: Chat functionality requires JavaScript enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions about the chat system, please open an issue in the repository. 
