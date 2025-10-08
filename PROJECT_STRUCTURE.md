# SkillSwap Project Structure

## Directory Structure
```
skillswap/
├── skill_swap_app.py          # Main Flask application
├── skill_swap.db              # SQLite database
├── requirements.txt           # Python dependencies
├── README.md                  # Project documentation
├── static/                    # Static assets
│   ├── css/
│   │   └── style.css         # Main stylesheet (cleaned)
│   ├── js/
│   │   └── main.js           # Main JavaScript (cleaned)
│   ├── images/
│   │   ├── default-avatar.png
│   │   ├── skillswap-icon.svg
│   │   └── skillswap-logo.svg
│   └── uploads/              # User uploaded files
└── templates/                # HTML templates
    ├── base.html             # Base template
    ├── index.html            # Home page
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── dashboard.html        # User dashboard
    ├── profile.html          # User profile
    ├── search.html           # Search skills
    ├── view_profile.html     # View other profiles
    ├── request_swap.html     # Request skill swap
    ├── request_from_user.html
    ├── rate_swap.html        # Rate completed swaps
    ├── notifications.html    # User notifications
    └── admin_*.html          # Admin pages
```

## Key Features
- User authentication and profiles
- Skill posting and searching
- Skill swap requests and management
- Rating and review system
- Admin dashboard and moderation
- Real-time chat system
- Responsive modern UI design

## Technology Stack
- **Backend**: Flask (Python)
- **Database**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **Styling**: Custom CSS with modern design principles

## File Organization Status
✅ CSS file cleaned and organized (removed comments)
✅ JavaScript file cleaned and organized (removed comments)
✅ Project structure documented
✅ Modern UI implemented across all pages
✅ Logo and favicon integrated
