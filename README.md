# 🚀 SkillSwap - Connect, Learn and Grow

A modern web application that enables users to exchange skills and knowledge with each other. Built with Flask and featuring a beautiful, responsive UI with real-time notifications and comprehensive admin tools.

![SkillSwap](https://img.shields.io/badge/SkillSwap-Platform-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![Flask](https://img.shields.io/badge/Flask-2.0+-red)
![SQLite](https://img.shields.io/badge/SQLite-Database-yellow)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Usage](#-usage)
- [Admin Features](#-admin-features)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 User Management
- **User Registration & Authentication**: Secure signup/login with password hashing
- **Profile Management**: Customizable profiles with photos, bio, and location
- **Availability Status**: Set availability for skill swaps with status indicators
- **Public/Private Profiles**: Control profile visibility

### 🛠️ Skill Management
- **Skill Categories**: Offer skills you can teach and request skills you want to learn
- **Skill Descriptions**: Detailed descriptions for each skill
- **Skill Approval System**: Admin approval for skill submissions
- **Skill Search**: Find users by specific skills

### 🤝 Skill Swapping
- **Swap Requests**: Send and receive skill swap requests
- **Request Management**: Accept, reject, or cancel swap requests
- **Rating System**: Rate and review completed swaps
- **Feedback System**: Provide detailed feedback after swaps

### 📊 Admin Dashboard
- **User Management**: View, ban, and unban users
- **Skill Moderation**: Approve or reject skill submissions
- **System Messages**: Send announcements to all users
- **Analytics Reports**: Download comprehensive reports
  - User activity reports
  - Feedback logs
  - Swap statistics

### 🔔 Notifications
- **Real-time Notifications**: Get notified of new requests, messages, and updates
- **Email-style Interface**: Mark notifications as read/unread
- **Notification Types**: Info, warning, error, and success notifications

### 📱 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Beautiful gradients and animations
- **Glass Morphism**: Contemporary design elements
- **Interactive Elements**: Hover effects and smooth transitions

## 🖼️ Screenshots

### Home Page
- Public user profiles with availability status
- Skill filtering and search functionality
- Beautiful card-based layout

### Dashboard
- Personal skill management
- Incoming/outgoing swap requests
- Quick actions and statistics

### Admin Panel
- Comprehensive user and skill management
- Report generation and download
- System-wide messaging

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/skillswap.git
cd skillswap
```

### Step 2: Create Virtual Environment
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Initialize Database
```bash
python skill_swap_app.py
```

The application will automatically create the SQLite database and default admin user.

### Step 5: Run the Application
```bash
python skill_swap_app.py
```

The application will be available at `http://127.0.0.1:5000`

## 📖 Usage

### Default Admin Account
- **Email**: `admin@skillswap.com`
- **Password**: `admin123`

### Getting Started

1. **Register an Account**
   - Visit the home page and click "Get Started"
   - Fill in your details and create an account

2. **Complete Your Profile**
   - Add a profile photo and bio
   - Set your location and availability
   - Make your profile public or private

3. **Add Your Skills**
   - Go to your dashboard
   - Add skills you can offer to others
   - Add skills you want to learn

4. **Find Skill Partners**
   - Browse the home page for available users
   - Use the search and filter options
   - View detailed user profiles

5. **Request Skill Swaps**
   - Click "Request" on a user's profile
   - Select the skill you want to learn
   - Choose a skill you can offer in return
   - Send a personalized message

6. **Manage Requests**
   - Accept or reject incoming requests
   - Track your outgoing requests
   - Rate and review completed swaps

## 🔧 Admin Features

### Admin Dashboard
Access the admin panel at `/admin` (requires admin privileges)

#### User Management
- View all registered users
- Ban/unban users
- Monitor user activity

#### Skill Moderation
- Review pending skill submissions
- Approve or reject skills
- Send notifications to users about rejected skills

#### System Messages
- Send announcements to all users
- Toggle message visibility
- Manage active announcements

#### Report Generation
Download comprehensive CSV reports:
- **User Activity Report**: User statistics, skills, swaps, and ratings
- **Feedback Logs Report**: Detailed rating and feedback data
- **Swap Statistics Report**: Complete swap information with outcomes

## 🔌 API Endpoints

### Authentication
- `GET /` - Home page
- `GET /register` - Registration page
- `POST /register` - User registration
- `GET /login` - Login page
- `POST /login` - User login
- `GET /logout` - User logout

### User Management
- `GET /dashboard` - User dashboard
- `GET /profile` - Profile page
- `POST /update_profile` - Update profile
- `GET /view_profile/<user_id>` - View other user's profile

### Skill Management
- `POST /add_skill` - Add new skill
- `GET /search` - Search for skills/users

### Swap Management
- `GET /request_swap/<skill_id>` - Request swap page
- `POST /send_swap_request` - Send swap request
- `GET /respond_swap/<request_id>/<action>` - Respond to request
- `GET /cancel_swap/<request_id>` - Cancel swap request

### Rating System
- `GET /rate_swap/<request_id>` - Rate swap page
- `POST /submit_rating` - Submit rating and feedback

### Admin Routes
- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management
- `GET /admin/skills` - Skill management
- `GET /admin/messages` - Message management
- `GET /admin/download/user_activity` - Download user activity report
- `GET /admin/download/feedback_logs` - Download feedback report
- `GET /admin/download/swap_stats` - Download swap statistics report

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    profile_photo TEXT,
    availability TEXT,
    bio TEXT,
    is_public INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Skills Table
```sql
CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    skill_name TEXT NOT NULL,
    skill_type TEXT NOT NULL, -- 'offered' or 'wanted'
    description TEXT,
    is_approved INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Swap Requests Table
```sql
CREATE TABLE swap_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER,
    provider_id INTEGER,
    offered_skill_id INTEGER,
    wanted_skill_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users (id),
    FOREIGN KEY (provider_id) REFERENCES users (id),
    FOREIGN KEY (offered_skill_id) REFERENCES skills (id),
    FOREIGN KEY (wanted_skill_id) REFERENCES skills (id)
);
```

### Ratings Table
```sql
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    swap_request_id INTEGER,
    rater_id INTEGER,
    rated_id INTEGER,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (swap_request_id) REFERENCES swap_requests (id),
    FOREIGN KEY (rater_id) REFERENCES users (id),
    FOREIGN KEY (rated_id) REFERENCES users (id)
);
```

## 🛠️ Technical Stack

- **Backend**: Flask (Python web framework)
- **Database**: SQLite (with SQLAlchemy ORM)
- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: Bootstrap 5 + Custom CSS
- **Icons**: Font Awesome
- **File Upload**: Werkzeug
- **Security**: Password hashing with Werkzeug

## 📁 Project Structure

```
skillswap/
├── skill_swap_app.py          # Main Flask application
├── requirements.txt           # Python dependencies
├── skill_swap.db             # SQLite database
├── static/                   # Static files
│   ├── css/
│   │   └── style.css         # Custom styles
│   ├── js/
│   │   └── main.js           # JavaScript functions
│   ├── images/
│   │   └── default-avatar.png # Default user avatar
│   └── uploads/              # User uploaded files
└── templates/                # HTML templates
    ├── base.html             # Base template
    ├── index.html            # Home page
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── dashboard.html        # User dashboard
    ├── profile.html          # Profile management
    ├── view_profile.html     # View other profiles
    ├── search.html           # Search functionality
    ├── admin_dashboard.html  # Admin dashboard
    ├── admin_users.html      # User management
    ├── admin_skills.html     # Skill management
    ├── admin_messages.html   # Message management
    └── ...                   # Other templates
```

## 🔒 Security Features

- **Password Hashing**: Secure password storage using Werkzeug
- **Session Management**: Flask session-based authentication
- **Input Validation**: Form validation and sanitization
- **File Upload Security**: Secure file handling for profile photos
- **Admin Access Control**: Role-based access control
- **SQL Injection Prevention**: Parameterized queries

## 🚀 Deployment

### Development
```bash
python skill_swap_app.py
```

### Production
For production deployment, consider:
- Using a production WSGI server (Gunicorn, uWSGI)
- Setting up a proper database (PostgreSQL, MySQL)
- Configuring environment variables
- Setting up HTTPS
- Using a reverse proxy (Nginx)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Flask community for the excellent web framework
- Bootstrap team for the responsive CSS framework
- Font Awesome for the beautiful icons
- All contributors and users of SkillSwap

## 📞 Support

If you have any questions or need support:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Made with ❤️ for the skill-sharing community** 
