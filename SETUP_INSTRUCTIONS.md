# SkillSwap React - Setup Instructions

## Quick Start Guide

### 1. Backend Setup (Flask API)

```bash
# Navigate to backend directory
cd skillswap-react/backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py
```

The backend API will be running at `http://localhost:5000`

### 2. Frontend Setup (React)

```bash
# Navigate to frontend directory
cd skillswap-react/frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

The frontend will be running at `http://localhost:3000`

## Default Admin Account

- **Email**: admin@skillswap.com
- **Password**: admin123

## Project Structure Overview

```
skillswap-react/
├── backend/                 # Flask API
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   └── uploads/           # File uploads
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── App.js         # Main app component
│   │   └── App.css        # Global styles
│   ├── public/            # Static assets
│   └── package.json       # Node dependencies
└── README.md              # Full documentation
```

## Key Features Implemented

### ✅ Completed Features
- **Authentication System**: JWT-based login/register
- **User Management**: Profile creation and editing
- **Skill Management**: Add, edit, delete skills
- **Skill Search**: Search and filter skills
- **Responsive Design**: Mobile-first Bootstrap 5 UI
- **State Management**: React Context API
- **Routing**: React Router with protected routes
- **Notifications**: Toast notification system
- **Chat Interface**: Basic chat UI structure
- **Admin Panel**: Basic admin dashboard structure

### 🚧 Features to Complete
- **Swap Requests**: Full swap request functionality
- **Rating System**: User rating and review system
- **Real-time Chat**: WebSocket integration
- **File Uploads**: Profile photo uploads
- **Email Notifications**: Email integration
- **Advanced Admin**: Complete admin functionality
- **Testing**: Unit and integration tests

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user profile

### Skills
- `GET /api/skills` - Get user's skills
- `POST /api/skills` - Add new skill
- `DELETE /api/skills/:id` - Delete skill
- `GET /api/skills/search` - Search skills

## Development Notes

### Backend (Flask)
- Uses SQLite database (skill_swap.db)
- JWT authentication with Flask-JWT-Extended
- CORS enabled for React frontend
- File upload support for profile photos

### Frontend (React)
- Modern React with hooks and functional components
- Bootstrap 5 for responsive design
- Axios for API communication
- Context API for state management
- React Router for navigation

### Styling
- Custom CSS variables for consistent theming
- Bootstrap 5 components with custom styling
- Font Awesome icons
- Inter font family

## Next Steps

1. **Test the Basic Setup**: Ensure both backend and frontend start correctly
2. **Complete API Endpoints**: Implement remaining backend functionality
3. **Add Real-time Features**: WebSocket integration for chat
4. **Implement File Uploads**: Profile photo upload functionality
5. **Add Testing**: Unit tests for components and API endpoints
6. **Deploy**: Production deployment setup

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Flask-CORS is installed and configured
2. **Database Issues**: Delete skill_swap.db to reset database
3. **Port Conflicts**: Change ports in app.py (backend) or package.json (frontend)
4. **Dependency Issues**: Delete node_modules and reinstall

### Environment Variables

Create a `.env` file in the backend directory for production:

```
FLASK_ENV=production
JWT_SECRET_KEY=your-secret-key-here
DATABASE_URL=your-database-url
```

## Support

For issues or questions:
1. Check the main README.md for detailed documentation
2. Review the code comments for implementation details
3. Test with the default admin account first
