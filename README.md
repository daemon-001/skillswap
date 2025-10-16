# SkillSwap React Application

A modern React-based skill-sharing platform that connects people through knowledge exchange.

## Project Structure

```
skillswap-react/
├── backend/                    # Flask API backend
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   └── uploads/              # File uploads directory
├── frontend/                  # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   ├── Navbar.js
│   │   │   ├── Footer.js
│   │   │   └── Chat.js
│   │   ├── contexts/         # React contexts
│   │   │   ├── AuthContext.js
│   │   │   └── NotificationContext.js
│   │   ├── pages/           # Page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Profile.js
│   │   │   ├── Search.js
│   │   │   ├── ViewProfile.js
│   │   │   ├── Notifications.js
│   │   │   └── AdminDashboard.js
│   │   ├── App.js           # Main App component
│   │   ├── App.css          # Global styles
│   │   └── index.js         # Entry point
│   ├── package.json         # Node.js dependencies
│   └── package-lock.json
└── README.md               # This file
```

## Features

### Core Functionality
- **User Authentication**: Secure login/register with JWT tokens
- **Skill Management**: Add, edit, and manage offered/wanted skills
- **Skill Search**: Find and filter skills by various criteria
- **Swap Requests**: Request skill exchanges with other users
- **User Profiles**: Comprehensive user profiles with ratings
- **Real-time Chat**: Communication between users
- **Notifications**: System notifications and alerts
- **Admin Panel**: Administrative controls and moderation

### Technical Features
- **Modern React**: Built with React 18+ and functional components
- **Responsive Design**: Mobile-first responsive UI with Bootstrap 5
- **State Management**: Context API for global state management
- **Routing**: React Router for client-side navigation
- **HTTP Client**: Axios for API communication
- **Authentication**: JWT-based authentication with automatic token refresh
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Proper loading indicators throughout the app

## Technology Stack

### Frontend
- **React 18+**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **Bootstrap 5**: Responsive UI framework
- **Font Awesome**: Icon library
- **Axios**: HTTP client for API requests
- **Context API**: State management

### Backend
- **Flask**: Python web framework
- **Flask-JWT-Extended**: JWT authentication
- **Flask-CORS**: Cross-origin resource sharing
- **SQLite**: Database
- **Werkzeug**: Password hashing and file handling

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Quick Start (Recommended)

**Windows Users:**
```bash
# Double-click start.bat or run in terminal:
start.bat
```

**Mac/Linux Users:**
```bash
chmod +x start.sh
./start.sh
```

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask development server:
   ```bash
   python app.py
   ```

The backend API will be available at `http://localhost:5000`

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

### Testing the Setup

Run the backend test script:
```bash
python test_backend.py
```

If you encounter issues, see `TROUBLESHOOTING.md` for detailed solutions.

### Default Admin Account
- **Email**: admin@skillswap.com
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (with pagination and filters)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Skills
- `GET /api/skills` - Get user's skills
- `POST /api/skills` - Add new skill
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill
- `GET /api/skills/search` - Search skills

### Swap Requests
- `GET /api/swap-requests` - Get user's swap requests
- `POST /api/swap-requests` - Create swap request
- `PUT /api/swap-requests/:id` - Update swap request status

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## Development

### Code Structure
- **Components**: Reusable UI components in `/src/components/`
- **Pages**: Full page components in `/src/pages/`
- **Contexts**: React contexts for global state in `/src/contexts/`
- **Styles**: Global CSS in `App.css`, component-specific styles inline

### State Management
- **AuthContext**: Manages user authentication state
- **NotificationContext**: Manages toast notifications and alerts

### Styling
- **Bootstrap 5**: Primary UI framework
- **Custom CSS**: Additional styling in `App.css`
- **CSS Variables**: Consistent color scheme and spacing

## Deployment

### Frontend Deployment
1. Build the production version:
   ```bash
   npm run build
   ```

2. Deploy the `build/` directory to your web server

### Backend Deployment
1. Set up a production WSGI server (e.g., Gunicorn)
2. Configure environment variables for production
3. Set up a production database (PostgreSQL recommended)
4. Configure reverse proxy (Nginx recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on the GitHub repository.
