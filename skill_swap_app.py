from flask import Flask, render_template, request, redirect, url_for, flash, session, send_file, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import os
from datetime import datetime
import csv
import io
import json

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Helper function to convert SQLite timestamp string to datetime object
def parse_datetime(timestamp_str):
    if timestamp_str is None:
        return None
    try:
        # Handle different SQLite timestamp formats
        if 'T' in timestamp_str:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            return datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
    except:
        return None

# Helper function to convert row objects to have datetime objects
def convert_row_datetimes(row):
    if row is None:
        return None
    
    # Convert to dict if it's a Row object
    if hasattr(row, 'keys'):
        row_dict = dict(row)
    else:
        row_dict = row
    
    # Convert timestamp fields to datetime objects
    timestamp_fields = ['created_at', 'updated_at', 'rejected_at']
    for field in timestamp_fields:
        if field in row_dict and row_dict[field]:
            row_dict[field] = parse_datetime(row_dict[field])
    
    return row_dict

def convert_rows_datetimes(rows):
    """Convert multiple rows to have datetime objects"""
    if not rows:
        return []
    return [convert_row_datetimes(row) for row in rows]

# Database setup
def init_db():
    conn = sqlite3.connect('skill_swap.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
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
        )
    ''')
    
    # Add bio column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN bio TEXT')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    # Add is_under_supervision column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN is_under_supervision INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    # Add rejection tracking columns to skills table
    try:
        cursor.execute('ALTER TABLE skills ADD COLUMN is_rejected INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    try:
        cursor.execute('ALTER TABLE skills ADD COLUMN rejection_reason TEXT')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    try:
        cursor.execute('ALTER TABLE skills ADD COLUMN rejected_at TIMESTAMP')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    # Skills table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            skill_name TEXT NOT NULL,
            skill_type TEXT NOT NULL, -- 'offered' or 'wanted'
            description TEXT,
            is_approved INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Update existing skills table default for new skills (for existing databases)
    try:
        cursor.execute('ALTER TABLE skills ALTER COLUMN is_approved SET DEFAULT 0')
    except sqlite3.OperationalError:
        # Not all SQLite versions support ALTER COLUMN, so we'll handle this in the insert statement
        pass
    
    # Swap requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS swap_requests (
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
        )
    ''')
    
    # Ratings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
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
        )
    ''')
    
    # Messages table (for admin announcements)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Notifications table (for user notifications)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Chat conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users (id),
            FOREIGN KEY (user2_id) REFERENCES users (id),
            UNIQUE(user1_id, user2_id)
        )
    ''')
    
    # Chat messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'system'
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id),
            FOREIGN KEY (sender_id) REFERENCES users (id)
        )
    ''')
    
    # Create default admin user
    cursor.execute("SELECT * FROM users WHERE email = 'admin@skillswap.com'")
    if not cursor.fetchone():
        admin_hash = generate_password_hash('admin123')
        cursor.execute('''
            INSERT INTO users (email, password_hash, name, is_admin) 
            VALUES ('admin@skillswap.com', ?, 'Admin User', 1)
        ''', (admin_hash,))
    
    conn.commit()
    conn.close()

# Helper functions
def get_db():
    conn = sqlite3.connect('skill_swap.db')
    conn.row_factory = sqlite3.Row
    return conn

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('login'))
        
        conn = get_db()
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        conn.close()
        
        if not user or not user['is_admin']:
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

# Context processor to make unread notifications count available in all templates
@app.context_processor
def inject_unread_notifications():
    if 'user_id' in session:
        conn = get_db()
        unread_count = conn.execute('''
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = 0
        ''', (session['user_id'],)).fetchone()['count']
        conn.close()
        return {'unread_notifications': unread_count}
    return {'unread_notifications': 0}

# Helper function to get user by ID
def get_user_by_id(user_id):
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if user:
        return convert_row_datetimes(user)
    return None

# Context processor to make get_user_by_id available in templates
@app.context_processor
def inject_helpers():
    return {'get_user_by_id': get_user_by_id}

# Routes
@app.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    per_page = 6
    availability = request.args.get('availability', '')
    q = request.args.get('q', '')
    conn = get_db()
    # Get latest and older active announcements
    latest_announcement = conn.execute('''
        SELECT * FROM messages WHERE is_active = 1
        ORDER BY created_at DESC LIMIT 1
    ''').fetchone()
    old_announcements = conn.execute('''
        SELECT * FROM messages WHERE is_active = 1
        ORDER BY created_at DESC LIMIT 10 OFFSET 1
    ''').fetchall()

    # Build user query with filters
    user_query = '''SELECT * FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0'''
    params = []
    if availability == 'available':
        user_query += ' AND availability IS NOT NULL AND availability != ""'
    elif availability == 'unavailable':
        user_query += ' AND (availability IS NULL OR availability = "")'
    if q:
        user_query += ' AND (name LIKE ? OR id IN (SELECT user_id FROM skills WHERE skill_name LIKE ? AND is_rejected = 0))'
        params.append(f'%{q}%')
        params.append(f'%{q}%')
    # Exclude current user if logged in
    if 'user_id' in session:
        user_query += ' AND id != ?'
        params.append(session['user_id'])
    user_query += ' ORDER BY is_under_supervision ASC, created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    users = conn.execute(user_query, params).fetchall()

    # Get total count for pagination
    count_query = '''SELECT COUNT(*) as count FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0'''
    count_params = []
    if availability == 'available':
        count_query += ' AND availability IS NOT NULL AND availability != ""'
    elif availability == 'unavailable':
        count_query += ' AND (availability IS NULL OR availability = "")'
    if q:
        count_query += ' AND (name LIKE ? OR id IN (SELECT user_id FROM skills WHERE skill_name LIKE ? AND is_rejected = 0))'
        count_params.append(f'%{q}%')
        count_params.append(f'%{q}%')
    # Exclude current user if logged in
    if 'user_id' in session:
        count_query += ' AND id != ?'
        count_params.append(session['user_id'])
    total = conn.execute(count_query, count_params).fetchone()['count']
    total_pages = (total + per_page - 1) // per_page

    # For each user, get their offered and wanted skills, and average rating
    user_profiles = []
    for user in users:
        user_id = user['id']
        offered_skills = conn.execute('''SELECT skill_name FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1 AND is_rejected = 0''', (user_id,)).fetchall()
        wanted_skills = conn.execute('''SELECT skill_name FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_approved = 1 AND is_rejected = 0''', (user_id,)).fetchall()
        rating_data = conn.execute('''SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_id = ?''', (user_id,)).fetchone()
        avg_rating = rating_data['avg_rating']
        total_ratings = rating_data['total_ratings']
        
        # Determine rating display
        if total_ratings > 0:
            rating_display = f"{round(avg_rating, 1)}/5"
            has_rating = True
        else:
            rating_display = "Unrated"
            has_rating = False
            
        user_profiles.append({
            'id': user['id'],
            'name': user['name'],
            'profile_photo': user['profile_photo'],
            'offered_skills': [s['skill_name'] for s in offered_skills],
            'wanted_skills': [s['skill_name'] for s in wanted_skills],
            'rating': rating_display,
            'has_rating': has_rating,
            'avg_rating': avg_rating,
            'total_ratings': total_ratings,
            'availability': user['availability'],
            'bio': user['bio'],
            'is_under_supervision': user['is_under_supervision']
        })
    # Define availability options for dropdown
    availabilities = ['available', 'unavailable']
    conn.close()

    # Convert datetime strings to datetime objects
    latest_announcement = convert_row_datetimes(latest_announcement)
    old_announcements = convert_rows_datetimes(old_announcements)

    pagination = {
        'page': page,
        'pages': total_pages,
        'per_page': per_page,
        'total': total,
        'has_prev': page > 1,
        'has_next': page < total_pages,
        'prev_num': page - 1,
        'next_num': page + 1,
        'iter_pages': lambda: range(max(1, page - 2), min(total_pages + 1, page + 3))
    }

    return render_template('index.html', latest_announcement=latest_announcement, old_announcements=old_announcements, user_profiles=user_profiles, pagination=pagination, availabilities=availabilities, selected_availability=availability, search_query=q)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            email = request.form.get('email', '')
            password = request.form.get('password', '')
            name = request.form.get('name', '')
            location = request.form.get('location', '')
            
            if not email or not password or not name:
                flash('Please fill in all required fields.', 'error')
                return render_template('register.html')
            
            conn = get_db()
            
            # Check if user already exists
            existing_user = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
            if existing_user:
                flash('Email already registered. Please log in.', 'error')
                conn.close()
                return render_template('register.html')
            
            # Create new user
            password_hash = generate_password_hash(password)
            conn.execute('''
                INSERT INTO users (email, password_hash, name, location) 
                VALUES (?, ?, ?, ?)
            ''', (email, password_hash, name, location))
            conn.commit()
            conn.close()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
            
        except Exception as e:
            flash(f'Registration error: {str(e)}', 'error')
            return render_template('register.html')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            if user['is_banned']:
                flash('Your account has been banned. Please contact support.', 'error')
                return render_template('login.html')
            
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['is_admin'] = user['is_admin']
            
            if user['is_admin']:
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password.', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    conn = get_db()
    
    # Get user data
    user = conn.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    
    if not user:
        # If user not found, clear session and redirect to login
        session.clear()
        flash('User session invalid. Please log in again.', 'error')
        return redirect(url_for('login'))
    
    # Get user's skills (exclude rejected)
    offered_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    wanted_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    # Get rejected skills
    rejected_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND is_rejected = 1 ORDER BY rejected_at DESC
    ''', (session['user_id'],)).fetchall()
    
    # Get swap requests
    sent_requests = conn.execute('''
        SELECT sr.*, u.name as provider_name, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name
        FROM swap_requests sr
        JOIN users u ON sr.provider_id = u.id
        JOIN skills s1 ON sr.offered_skill_id = s1.id
        JOIN skills s2 ON sr.wanted_skill_id = s2.id
        WHERE sr.requester_id = ?
        ORDER BY sr.created_at DESC
    ''', (session['user_id'],)).fetchall()
    
    received_requests = conn.execute('''
        SELECT sr.*, u.name as requester_name, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name
        FROM swap_requests sr
        JOIN users u ON sr.requester_id = u.id
        JOIN skills s1 ON sr.offered_skill_id = s1.id
        JOIN skills s2 ON sr.wanted_skill_id = s2.id
        WHERE sr.provider_id = ?
        ORDER BY sr.created_at DESC
    ''', (session['user_id'],)).fetchall()
    
    # Get unread notification count
    unread_notifications = conn.execute('''
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = ? AND is_read = 0
    ''', (session['user_id'],)).fetchone()['count']
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    user = convert_row_datetimes(user)
    offered_skills = convert_rows_datetimes(offered_skills)
    wanted_skills = convert_rows_datetimes(wanted_skills)
    sent_requests = convert_rows_datetimes(sent_requests)
    received_requests = convert_rows_datetimes(received_requests)
    
    # Combine all swap requests for display
    all_requests = sent_requests + received_requests
    # all_requests.sort(key=lambda x: x['created_at'] if x['created_at'] else datetime.min, reverse=True)
    all_requests.sort(key=lambda x: x.get('created_at', datetime.min) if x else datetime.min, reverse=True)
    
    # Calculate stats
    stats = {
        'offered_skills': len(offered_skills),
        'wanted_skills': len(wanted_skills),
        'pending_requests': len([r for r in all_requests if r and r.get('status') == 'pending']),
        'completed_swaps': len([r for r in all_requests if r and r.get('status') == 'accepted'])
    }
    
    # Convert datetime strings to datetime objects
    offered_skills = convert_rows_datetimes(offered_skills)
    wanted_skills = convert_rows_datetimes(wanted_skills)
    rejected_skills = convert_rows_datetimes(rejected_skills)
    
    return render_template('dashboard.html', 
                         user=user,
                         offered_skills=offered_skills, 
                         wanted_skills=wanted_skills,
                         rejected_skills=rejected_skills,
                         swap_requests=all_requests,
                         stats=stats,
                         unread_notifications=unread_notifications)

@app.route('/profile')
@login_required
def profile():
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    
    # Get user's skills (exclude rejected)
    offered_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    wanted_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    # Get user stats
    completed_swaps = conn.execute('''
        SELECT COUNT(*) as count FROM swap_requests 
        WHERE (requester_id = ? OR provider_id = ?) AND status = 'accepted'
    ''', (session['user_id'], session['user_id'])).fetchone()['count']
    
    # Get average rating
    avg_rating = conn.execute('''
        SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
        FROM ratings WHERE rated_id = ?
    ''', (session['user_id'],)).fetchone()
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    user = convert_row_datetimes(user)
    offered_skills = convert_rows_datetimes(offered_skills)
    wanted_skills = convert_rows_datetimes(wanted_skills)
    
    # Calculate stats
    stats = {
        'offered_skills': len(offered_skills),
        'wanted_skills': len(wanted_skills),
        'completed_swaps': completed_swaps,
        'avg_rating': avg_rating['avg_rating'] or 0,
        'total_ratings': avg_rating['total_ratings'] or 0,
        'has_rating': avg_rating['total_ratings'] > 0
    }
    
    return render_template('profile.html', user=user, offered_skills=offered_skills, 
                         wanted_skills=wanted_skills, stats=stats)

@app.route('/view_profile/<int:user_id>')
def view_profile(user_id):
    conn = get_db()
    
    # Get the user profile
    user = conn.execute('SELECT * FROM users WHERE id = ? AND is_public = 1 AND is_banned = 0', (user_id,)).fetchone()
    
    if not user:
        flash('Profile not found or not available.', 'error')
        return redirect(url_for('index'))
    
    # Get user's approved skills
    offered_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1
    ''', (user_id,)).fetchall()
    
    wanted_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_approved = 1
    ''', (user_id,)).fetchall()
    
    # Get user stats
    completed_swaps = conn.execute('''
        SELECT COUNT(*) as count FROM swap_requests 
        WHERE (requester_id = ? OR provider_id = ?) AND status = 'accepted'
    ''', (user_id, user_id)).fetchone()['count']
    
    # Get average rating
    avg_rating = conn.execute('''
        SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
        FROM ratings WHERE rated_id = ?
    ''', (user_id,)).fetchone()
    
    # Get recent reviews (last 5)
    recent_reviews = conn.execute('''
        SELECT r.*, u.name as reviewer_name
        FROM ratings r
        JOIN users u ON r.rater_id = u.id
        WHERE r.rated_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
    ''', (user_id,)).fetchall()
    
    # Check if current user can request from this user
    can_request = False
    if 'user_id' in session and session['user_id'] != user_id:
        # Check if user has any approved offered skills
        user_offered_skills = conn.execute('''
            SELECT COUNT(*) as count FROM skills 
            WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1
        ''', (session['user_id'],)).fetchone()['count']
        can_request = user_offered_skills > 0
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    user = convert_row_datetimes(user)
    offered_skills = convert_rows_datetimes(offered_skills)
    wanted_skills = convert_rows_datetimes(wanted_skills)
    recent_reviews = convert_rows_datetimes(recent_reviews)
    
    # Calculate stats
    stats = {
        'offered_skills': len(offered_skills),
        'wanted_skills': len(wanted_skills),
        'completed_swaps': completed_swaps,
        'avg_rating': avg_rating['avg_rating'] or 0,
        'total_ratings': avg_rating['total_ratings'] or 0,
        'has_rating': avg_rating['total_ratings'] > 0
    }
    
    return render_template('view_profile.html', 
                         user=user, 
                         offered_skills=offered_skills, 
                         wanted_skills=wanted_skills, 
                         stats=stats,
                         recent_reviews=recent_reviews,
                         can_request=can_request)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        name = request.form.get('name', '')
        location = request.form.get('location', '')
        bio = request.form.get('bio', '')
        is_public = 1 if request.form.get('is_public') == 'on' else 0
        
        # Handle availability from day selection and single time range
        selected_days = request.form.getlist('days[]')
        start_time = request.form.get('start_time', '')
        end_time = request.form.get('end_time', '')
        availability = ""
        
        if selected_days:
            # Smart day formatting - check if days are in sequence
            day_order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            selected_days_sorted = sorted(selected_days, key=lambda x: day_order.index(x))
            
            # Check if selected days form a continuous sequence
            def is_continuous_sequence(days):
                if len(days) < 2:
                    return False
                
                # Find the starting index in the day order
                start_idx = day_order.index(days[0])
                
                # Check if all selected days are consecutive in the order
                for i, day in enumerate(days):
                    if day_order[start_idx + i] != day:
                        return False
                return True
            
            # Format days display
            if is_continuous_sequence(selected_days_sorted):
                # Days are in sequence, show as "Monday to Friday"
                first_day = selected_days_sorted[0].title()
                last_day = selected_days_sorted[-1].title()
                day_display = f"{first_day} to {last_day}"
            else:
                # Days are not in sequence, show as "Monday, Wednesday, Sunday"
                day_display = ', '.join([day.title() for day in selected_days_sorted])
            
            if start_time and end_time:
                # Format time for display (e.g., "4:30 AM to 7:00 PM")
                start_formatted = datetime.strptime(start_time, '%H:%M').strftime('%I:%M %p')
                end_formatted = datetime.strptime(end_time, '%H:%M').strftime('%I:%M %p')
                availability = f"{day_display} {start_formatted} to {end_formatted}"
            elif start_time:
                # Only start time provided
                start_formatted = datetime.strptime(start_time, '%H:%M').strftime('%I:%M %p')
                availability = f"{day_display} from {start_formatted}"
            elif end_time:
                # Only end time provided
                end_formatted = datetime.strptime(end_time, '%H:%M').strftime('%I:%M %p')
                availability = f"{day_display} until {end_formatted}"
            else:
                # No time specified
                availability = f"{day_display} (anytime)"
        
        if not name:
            flash('Name is required.', 'error')
            return redirect(url_for('profile'))
        
        conn = get_db()
        
        # Handle profile photo upload
        profile_photo = None
        if 'profile_photo' in request.files:
            file = request.files['profile_photo']
            if file and file.filename:
                # Check if file is an image
                if file.content_type and file.content_type.startswith('image/'):
                    # Generate secure filename
                    filename = secure_filename(file.filename)
                    # Add timestamp to make filename unique
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"{timestamp}_{filename}"
                    
                    # Save file
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    profile_photo = filename
                else:
                    flash('Please upload a valid image file.', 'error')
                    return redirect(url_for('profile'))
        
        # Update user profile
        if profile_photo:
            conn.execute('''
                UPDATE users SET name = ?, location = ?, availability = ?, bio = ?, is_public = ?, profile_photo = ?
                WHERE id = ?
            ''', (name, location, availability, bio, is_public, profile_photo, session['user_id']))
        else:
            conn.execute('''
                UPDATE users SET name = ?, location = ?, availability = ?, bio = ?, is_public = ?
                WHERE id = ?
            ''', (name, location, availability, bio, is_public, session['user_id']))
        
        conn.commit()
        conn.close()
        
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('profile'))
        
    except Exception as e:
        flash(f'Profile update error: {str(e)}', 'error')
        return redirect(url_for('profile'))

@app.route('/add_skill', methods=['POST'])
@login_required
def add_skill():
    try:
        # Check if user is under supervision
        conn = get_db()
        user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if user and user['is_under_supervision']:
            flash('You are currently under supervision and cannot add new skills. Please contact an administrator.', 'warning')
            return redirect(url_for('dashboard'))
        
        skill_name = request.form.get('skill_name', '')
        skill_type = request.form.get('skill_type', '')
        description = request.form.get('description', '')
        
        if not skill_name or skill_type not in ['offered', 'wanted']:
            flash('Invalid skill data.', 'error')
            return redirect(url_for('dashboard'))
        
        conn.execute('''
            INSERT INTO skills (user_id, skill_name, skill_type, description, is_approved)
            VALUES (?, ?, ?, ?, 0)
        ''', (session['user_id'], skill_name, skill_type, description))
        conn.commit()
        conn.close()
        
        flash('Skill submitted for review! It will be visible after admin approval.', 'info')
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'Error adding skill: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/resubmit_skill/<int:skill_id>', methods=['POST'])
@login_required
def resubmit_skill(skill_id):
    try:
        conn = get_db()
        
        # Check if the skill belongs to the current user and is rejected
        skill = conn.execute('''
            SELECT user_id, is_rejected FROM skills WHERE id = ?
        ''', (skill_id,)).fetchone()
        
        if not skill or skill['user_id'] != session['user_id']:
            flash('You can only edit your own skills.', 'error')
            return redirect(url_for('dashboard'))
        
        if not skill['is_rejected']:
            flash('This skill is not rejected and cannot be resubmitted.', 'error')
            return redirect(url_for('dashboard'))
        
        # Check if user is under supervision
        user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if user and user['is_under_supervision']:
            flash('You are currently under supervision and cannot resubmit skills. Please contact an administrator.', 'warning')
            return redirect(url_for('dashboard'))
        
        skill_name = request.form.get('skill_name', '').strip()
        skill_type = request.form.get('skill_type', '')
        description = request.form.get('description', '').strip()
        
        if not skill_name or skill_type not in ['offered', 'wanted']:
            flash('Invalid skill data.', 'error')
            return redirect(url_for('dashboard'))
        
        # Update the skill and reset rejection status (but require approval again)
        conn.execute('''
            UPDATE skills 
            SET skill_name = ?, 
                skill_type = ?, 
                description = ?, 
                is_rejected = 0, 
                is_approved = 0, 
                rejection_reason = NULL, 
                rejected_at = NULL,
                created_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (skill_name, skill_type, description, skill_id))
        
        conn.commit()
        conn.close()
        
        flash('Skill resubmitted for review! It will be visible after admin approval.', 'info')
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'Error resubmitting skill: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/delete_skill/<int:skill_id>')
@login_required
def delete_skill(skill_id):
    try:
        conn = get_db()
        
        # Verify the skill belongs to the current user
        skill = conn.execute('SELECT * FROM skills WHERE id = ? AND user_id = ?', (skill_id, session['user_id'])).fetchone()
        if not skill:
            flash('Skill not found or you do not have permission to delete it.', 'error')
            return redirect(url_for('dashboard'))
        
        # Check if user is under supervision (only for non-rejected skills)
        if not skill['is_rejected']:
            user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (session['user_id'],)).fetchone()
            if user and user['is_under_supervision']:
                flash('You are currently under supervision and cannot delete skills. Please contact an administrator.', 'warning')
                return redirect(url_for('dashboard'))
        
        conn.execute('DELETE FROM skills WHERE id = ?', (skill_id,))
        conn.commit()
        conn.close()
        
        flash('Skill deleted successfully!', 'success')
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'Error deleting skill: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/search')
@login_required
def search():
    query = request.args.get('q', '')
    skill_type = request.args.get('skill_type', '')
    page = request.args.get('page', 1, type=int)
    per_page = 12
    
    conn = get_db()
    
    # Build the query
    base_query = '''
        SELECT s.*, u.name as user_name, u.location, u.is_under_supervision
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE s.skill_type = 'offered' 
        AND u.is_public = 1 AND u.is_banned = 0 AND u.id != ?
        AND s.is_approved = 1 AND s.is_rejected = 0
    '''
    
    params = [session['user_id']]
    
    if query:
        base_query += ' AND s.skill_name LIKE ?'
        params.append(f'%{query}%')
    
    if skill_type:
        base_query += ' AND s.skill_type = ?'
        params.append(skill_type)
    
    # Get total count
    count_query = f'SELECT COUNT(*) as count FROM ({base_query})'
    total = conn.execute(count_query, params).fetchone()['count']
    
    # Add pagination
    base_query += ' ORDER BY u.is_under_supervision ASC, s.created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    
    results = conn.execute(base_query, params).fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    results = convert_rows_datetimes(results)
    
    # Create pagination object
    total_pages = (total + per_page - 1) // per_page
    pagination = {
        'page': page,
        'pages': total_pages,
        'per_page': per_page,
        'total': total,
        'has_prev': page > 1,
        'has_next': page < total_pages,
        'prev_num': page - 1,
        'next_num': page + 1,
        'iter_pages': lambda: range(max(1, page - 2), min(total_pages + 1, page + 3))
    }
    
    return render_template('search.html', skills=results, query=query, 
                         skill_type=skill_type, pagination=pagination)

@app.route('/request_swap/<int:skill_id>')
@login_required
def request_swap(skill_id):
    conn = get_db()
    
    # Get the skill details
    skill = conn.execute('''
        SELECT s.*, u.name as user_name, u.is_under_supervision
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
    ''', (skill_id,)).fetchone()
    
    if not skill:
        flash('Skill not found.', 'error')
        return redirect(url_for('search'))
    
    # Check if the skill provider is under supervision
    if skill['is_under_supervision']:
        flash('This user is currently under supervision and cannot receive swap requests.', 'warning')
        return redirect(url_for('search'))
    
    # Get user's offered skills (exclude rejected)
    user_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    skill = convert_row_datetimes(skill)
    user_skills = convert_rows_datetimes(user_skills)
    
    return render_template('request_swap.html', skill=skill, user_skills=user_skills)

@app.route('/send_swap_request', methods=['POST'])
@login_required
def send_swap_request():
    try:
        # Check if user is under supervision
        conn = get_db()
        user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if user and user['is_under_supervision']:
            flash('You are currently under supervision and cannot make swap requests. Please contact an administrator.', 'warning')
            return redirect(url_for('search'))
        
        offered_skill_id = request.form.get('offered_skill_id', '')
        wanted_skill_id = request.form.get('wanted_skill_id', '')
        message = request.form.get('message', '')
        
        if not offered_skill_id or not wanted_skill_id:
            flash('Please select both skills for the swap.', 'error')
            return redirect(url_for('search'))
        
        # Get provider ID from the wanted skill
        wanted_skill = conn.execute('SELECT user_id FROM skills WHERE id = ?', (wanted_skill_id,)).fetchone()
        if not wanted_skill:
            flash('Invalid skill selected.', 'error')
            return redirect(url_for('search'))
        
        # Check if request already exists
        existing_request = conn.execute('''
            SELECT id FROM swap_requests 
            WHERE requester_id = ? AND provider_id = ? AND offered_skill_id = ? AND wanted_skill_id = ?
            AND status = 'pending'
        ''', (session['user_id'], wanted_skill['user_id'], offered_skill_id, wanted_skill_id)).fetchone()
        
        if existing_request:
            flash('You already have a pending request for this swap.', 'warning')
            return redirect(url_for('dashboard'))
        
        # Create swap request
        conn.execute('''
            INSERT INTO swap_requests (requester_id, provider_id, offered_skill_id, wanted_skill_id, message)
            VALUES (?, ?, ?, ?, ?)
        ''', (session['user_id'], wanted_skill['user_id'], offered_skill_id, wanted_skill_id, message))
        conn.commit()
        conn.close()
        
        flash('Swap request sent successfully!', 'success')
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'Error sending swap request: {str(e)}', 'error')
        return redirect(url_for('search'))

@app.route('/respond_swap/<int:request_id>/<action>')
@login_required
def respond_swap(request_id, action):
    if action not in ['accept', 'reject']:
        flash('Invalid action.', 'error')
        return redirect(url_for('dashboard'))
    
    conn = get_db()
    
    # Verify the request belongs to the current user
    swap_request = conn.execute('''
        SELECT * FROM swap_requests WHERE id = ? AND provider_id = ?
    ''', (request_id, session['user_id'])).fetchone()
    
    if not swap_request:
        flash('Request not found.', 'error')
        return redirect(url_for('dashboard'))
    
    status = 'accepted' if action == 'accept' else 'rejected'
    conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', (status, request_id))
    conn.commit()
    conn.close()
    
    flash(f'Swap request {status}!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/cancel_swap/<int:request_id>')
@login_required
def cancel_swap(request_id):
    conn = get_db()
    
    # Verify the request belongs to the current user
    swap_request = conn.execute('''
        SELECT * FROM swap_requests WHERE id = ? AND requester_id = ? AND status = 'pending'
    ''', (request_id, session['user_id'])).fetchone()
    
    if not swap_request:
        flash('Request not found or cannot be cancelled.', 'error')
        return redirect(url_for('dashboard'))
    
    conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', ('cancelled', request_id))
    conn.commit()
    conn.close()
    
    flash('Swap request cancelled!', 'info')
    return redirect(url_for('dashboard'))

@app.route('/rate_swap/<int:request_id>')
@login_required
def rate_swap(request_id):
    conn = get_db()
    
    # Get swap request details
    swap_request = conn.execute('''
        SELECT sr.*, u1.name as requester_name, u2.name as provider_name
        FROM swap_requests sr
        JOIN users u1 ON sr.requester_id = u1.id
        JOIN users u2 ON sr.provider_id = u2.id
        WHERE sr.id = ? AND sr.status = 'accepted'
        AND (sr.requester_id = ? OR sr.provider_id = ?)
    ''', (request_id, session['user_id'], session['user_id'])).fetchone()
    
    if not swap_request:
        flash('Swap request not found.', 'error')
        return redirect(url_for('dashboard'))
    
    # Check if user already rated this swap
    existing_rating = conn.execute('''
        SELECT id FROM ratings WHERE swap_request_id = ? AND rater_id = ?
    ''', (request_id, session['user_id'])).fetchone()
    
    if existing_rating:
        flash('You have already rated this swap.', 'warning')
        return redirect(url_for('dashboard'))
    
    # Get the skills involved in this swap
    offered_skill = conn.execute('''
        SELECT * FROM skills WHERE id = ?
    ''', (swap_request['offered_skill_id'],)).fetchone()
    
    wanted_skill = conn.execute('''
        SELECT * FROM skills WHERE id = ?
    ''', (swap_request['wanted_skill_id'],)).fetchone()
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    swap_request = convert_row_datetimes(swap_request)
    offered_skill = convert_row_datetimes(offered_skill)
    wanted_skill = convert_row_datetimes(wanted_skill)
    
    return render_template('rate_swap.html', 
                         swap_request=swap_request,
                         offered_skill=offered_skill,
                         wanted_skill=wanted_skill)

@app.route('/submit_rating', methods=['POST'])
@login_required
def submit_rating():
    request_id = request.form['request_id']
    rating = request.form['rating']
    feedback = request.form.get('feedback', '')
    
    conn = get_db()
    
    # Get swap request to determine who to rate
    swap_request = conn.execute('''
        SELECT * FROM swap_requests WHERE id = ? AND status = 'accepted'
        AND (requester_id = ? OR provider_id = ?)
    ''', (request_id, session['user_id'], session['user_id'])).fetchone()
    
    if not swap_request:
        flash('Invalid swap request.', 'error')
        return redirect(url_for('dashboard'))
    
    # Determine who is being rated
    if swap_request['requester_id'] == session['user_id']:
        rated_id = swap_request['provider_id']
    else:
        rated_id = swap_request['requester_id']
    
    # Save rating
    conn.execute('''
        INSERT INTO ratings (swap_request_id, rater_id, rated_id, rating, feedback)
        VALUES (?, ?, ?, ?, ?)
    ''', (request_id, session['user_id'], rated_id, rating, feedback))
    conn.commit()
    conn.close()
    
    flash('Rating submitted successfully!', 'success')
    return redirect(url_for('dashboard'))

# Admin routes
@app.route('/admin')
@admin_required
def admin_dashboard():
    conn = get_db()
    
    # Get statistics
    stats = {}
    stats['total_users'] = conn.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').fetchone()['count']
    stats['total_skills'] = conn.execute('SELECT COUNT(*) as count FROM skills WHERE is_rejected = 0').fetchone()['count']
    stats['pending_swaps'] = conn.execute('SELECT COUNT(*) as count FROM swap_requests WHERE status = "pending"').fetchone()['count']
    stats['completed_swaps'] = conn.execute('SELECT COUNT(*) as count FROM swap_requests WHERE status = "accepted"').fetchone()['count']
    
    # Get recent activity
    recent_users = conn.execute('SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC LIMIT 5').fetchall()
    recent_swaps = conn.execute('''
        SELECT sr.*, u1.name as requester_name, u2.name as provider_name
        FROM swap_requests sr
        JOIN users u1 ON sr.requester_id = u1.id
        JOIN users u2 ON sr.provider_id = u2.id
        ORDER BY sr.created_at DESC LIMIT 5
    ''').fetchall()
    
    # Users for Quick Message (non-admin, not banned)
    users = conn.execute('''
        SELECT id, name, email FROM users 
        WHERE is_admin = 0 AND is_banned = 0
        ORDER BY name ASC
    ''').fetchall()
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    recent_users = convert_rows_datetimes(recent_users)
    recent_swaps = convert_rows_datetimes(recent_swaps)
    
    return render_template('admin_dashboard.html', stats=stats, recent_users=recent_users, recent_swaps=recent_swaps, users=users)

@app.route('/admin/users')
@admin_required
def admin_users():
    conn = get_db()
    users = conn.execute('SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC').fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    users = convert_rows_datetimes(users)
    
    return render_template('admin_users.html', users=users)

@app.route('/admin/skills')
@admin_required
def admin_skills():
    conn = get_db()
    skills = conn.execute('''
        SELECT s.*, u.name as user_name, u.email
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE s.is_rejected = 0
        ORDER BY s.is_approved ASC, s.id DESC
    ''').fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    skills = convert_rows_datetimes(skills)
    
    return render_template('admin_skills.html', skills=skills)

@app.route('/admin/ban_user/<int:user_id>')
@admin_required
def ban_user(user_id):
    conn = get_db()
    conn.execute('UPDATE users SET is_banned = 1 WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    flash('User banned successfully.', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/unban_user/<int:user_id>')
@admin_required
def unban_user(user_id):
    conn = get_db()
    conn.execute('UPDATE users SET is_banned = 0 WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    flash('User unbanned successfully.', 'success')
    return redirect(url_for('admin_users'))

@app.route('/admin/approve_skill/<int:skill_id>')
@admin_required
def approve_skill(skill_id):
    conn = get_db()
    conn.execute('UPDATE skills SET is_approved = 1 WHERE id = ?', (skill_id,))
    conn.commit()
    conn.close()
    flash('Skill approved.', 'success')
    return redirect(url_for('admin_skills'))

@app.route('/admin/reject_skill/<int:skill_id>')
@admin_required
def reject_skill(skill_id):
    conn = get_db()
    
    # Get skill details before marking as rejected
    skill = conn.execute('''
        SELECT s.*, u.name as user_name, u.email 
        FROM skills s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.id = ?
    ''', (skill_id,)).fetchone()
    
    if not skill:
        flash('Skill not found.', 'error')
        return redirect(url_for('admin_skills'))
    
    # Mark skill as rejected instead of deleting
    default_reason = "This skill did not meet our community guidelines. Please review the guidelines and consider resubmitting with improvements."
    conn.execute('''
        UPDATE skills 
        SET is_rejected = 1, 
            is_approved = 0, 
            rejection_reason = ?, 
            rejected_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    ''', (default_reason, skill_id))
    
    # Create notification for the user
    notification_title = "Skill Rejected"
    notification_message = f"Your skill '{skill['skill_name']}' has been rejected by an administrator.\n\nReason: {default_reason}\n\nYou can view your rejected skills in your dashboard and edit them for resubmission."
    
    conn.execute('''
        INSERT INTO notifications (user_id, title, message, type) 
        VALUES (?, ?, ?, ?)
    ''', (skill['user_id'], notification_title, notification_message, 'warning'))
    
    conn.commit()
    conn.close()
    
    flash(f'Skill "{skill["skill_name"]}" rejected and user notified.', 'warning')
    return redirect(url_for('admin_skills'))

@app.route('/admin/reject_skill_with_reason', methods=['POST'])
@admin_required
def reject_skill_with_reason():
    try:
        skill_id = request.form.get('skill_id')
        rejection_reason = request.form.get('rejection_reason', '').strip()
        
        if not skill_id or not rejection_reason:
            flash('Skill ID and rejection reason are required.', 'error')
            return redirect(url_for('admin_skills'))
        
        conn = get_db()
        
        # Get skill details before marking as rejected
        skill = conn.execute('''
            SELECT s.*, u.name as user_name, u.email 
            FROM skills s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = ?
        ''', (skill_id,)).fetchone()
        
        if not skill:
            flash('Skill not found.', 'error')
            return redirect(url_for('admin_skills'))
        
        # Mark skill as rejected instead of deleting
        conn.execute('''
            UPDATE skills 
            SET is_rejected = 1, 
                is_approved = 0, 
                rejection_reason = ?, 
                rejected_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (rejection_reason, skill_id))
        
        # Create notification for the user with custom reason
        notification_title = "Skill Rejected"
        notification_message = f"Your skill '{skill['skill_name']}' has been rejected by an administrator.\n\nReason: {rejection_reason}\n\nYou can view your rejected skills in your dashboard and edit them for resubmission. Please review our community guidelines before resubmitting."
        
        conn.execute('''
            INSERT INTO notifications (user_id, title, message, type) 
            VALUES (?, ?, ?, ?)
        ''', (skill['user_id'], notification_title, notification_message, 'warning'))
        
        conn.commit()
        conn.close()
        
        flash(f'Skill "{skill["skill_name"]}" rejected with custom reason and user notified.', 'warning')
        return redirect(url_for('admin_skills'))
        
    except Exception as e:
        flash(f'Error rejecting skill: {str(e)}', 'error')
        return redirect(url_for('admin_skills'))

@app.route('/admin/messages')
@admin_required
def admin_messages():
    conn = get_db()
    messages = conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()
    # Fetch non-admin, non-banned users for quick message
    users = conn.execute('''
        SELECT id, name, email FROM users 
        WHERE is_admin = 0 AND is_banned = 0
        ORDER BY name ASC
    ''').fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    messages = convert_rows_datetimes(messages)
    
    return render_template('admin_messages.html', messages=messages, users=users)

@app.route('/admin/send_message', methods=['POST'])
@admin_required
def send_message():
    title = request.form['title']
    content = request.form['content']
    
    conn = get_db()
    conn.execute('INSERT INTO messages (title, content) VALUES (?, ?)', (title, content))
    conn.commit()
    conn.close()
    
    flash('Message sent successfully!', 'success')
    return redirect(url_for('admin_messages'))

@app.route('/admin/toggle_message/<int:message_id>')
@admin_required
def toggle_message(message_id):
    conn = get_db()
    message = conn.execute('SELECT is_active FROM messages WHERE id = ?', (message_id,)).fetchone()
    new_status = 0 if message['is_active'] else 1
    conn.execute('UPDATE messages SET is_active = ? WHERE id = ?', (new_status, message_id))
    conn.commit()
    conn.close()
    
    status = 'activated' if new_status else 'deactivated'
    flash(f'Message {status} successfully!', 'success')
    return redirect(url_for('admin_messages'))

@app.route('/admin/delete_message/<int:message_id>')
@admin_required
def delete_message(message_id):
    conn = get_db()
    conn.execute('DELETE FROM messages WHERE id = ?', (message_id,))
    conn.commit()
    conn.close()
    flash('Message deleted successfully!', 'success')
    return redirect(url_for('admin_messages'))

@app.route('/admin/quick_message', methods=['POST'])
@admin_required
def quick_message():
    try:
        title = request.form.get('quick_title', '').strip()
        message = request.form.get('quick_content', '').strip()
        notif_type = request.form.get('quick_type', 'info').strip() or 'info'
        recipient_ids = request.form.getlist('recipients')
        
        if not title or not message:
            flash('Title and message are required for quick message.', 'error')
            return redirect(url_for('admin_messages'))
        if not recipient_ids:
            flash('Please select at least one recipient.', 'warning')
            return redirect(url_for('admin_messages'))
        
        # Insert notifications for each recipient
        conn = get_db()
        for rid in recipient_ids:
            try:
                uid = int(rid)
                conn.execute('''
                    INSERT INTO notifications (user_id, title, message, type)
                    VALUES (?, ?, ?, ?)
                ''', (uid, title, message, notif_type))
            except ValueError:
                continue
        conn.commit()
        conn.close()
        
        flash(f'Quick message sent to {len(recipient_ids)} user(s).', 'success')
        return redirect(url_for('admin_messages'))
    except Exception as e:
        flash(f'Error sending quick message: {str(e)}', 'error')
        return redirect(url_for('admin_messages'))

# Report generation functions
def generate_user_activity_report():
    """Generate CSV report of user activity"""
    conn = get_db()
    
    # Get user activity data
    users = conn.execute('''
        SELECT 
            u.id,
            u.name,
            u.email,
            u.location,
            u.created_at,
            u.is_banned,
            COUNT(DISTINCT s.id) as total_skills,
            COUNT(DISTINCT sr.id) as total_swap_requests,
            COUNT(DISTINCT CASE WHEN sr.status = 'accepted' THEN sr.id END) as completed_swaps,
            COUNT(DISTINCT r.id) as total_ratings_received,
            AVG(r.rating) as avg_rating
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        LEFT JOIN swap_requests sr ON (u.id = sr.requester_id OR u.id = sr.provider_id)
        LEFT JOIN ratings r ON u.id = r.rated_id
        WHERE u.is_admin = 0
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ''').fetchall()
    
    conn.close()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'User ID', 'Name', 'Email', 'Location', 'Registration Date', 
        'Status', 'Total Skills', 'Total Swap Requests', 'Completed Swaps',
        'Total Ratings Received', 'Average Rating'
    ])
    
    # Write data
    for user in users:
        status = 'Banned' if user['is_banned'] else 'Active'
        avg_rating = round(user['avg_rating'], 2) if user['avg_rating'] else 'N/A'
        
        writer.writerow([
            user['id'],
            user['name'],
            user['email'],
            user['location'] or 'N/A',
            user['created_at'],
            status,
            user['total_skills'],
            user['total_swap_requests'],
            user['completed_swaps'],
            user['total_ratings_received'],
            avg_rating
        ])
    
    output.seek(0)
    return output

def generate_feedback_logs_report():
    """Generate CSV report of feedback and ratings"""
    conn = get_db()
    
    # Get feedback data
    feedback = conn.execute('''
        SELECT 
            r.id,
            r.rating,
            r.feedback,
            r.created_at,
            rater.name as rater_name,
            rater.email as rater_email,
            rated.name as rated_name,
            rated.email as rated_email,
            sr.id as swap_request_id,
            s1.skill_name as offered_skill,
            s2.skill_name as wanted_skill
        FROM ratings r
        JOIN users rater ON r.rater_id = rater.id
        JOIN users rated ON r.rated_id = rated.id
        JOIN swap_requests sr ON r.swap_request_id = sr.id
        JOIN skills s1 ON sr.offered_skill_id = s1.id
        JOIN skills s2 ON sr.wanted_skill_id = s2.id
        ORDER BY r.created_at DESC
    ''').fetchall()
    
    conn.close()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Rating ID', 'Rating', 'Feedback', 'Date', 'Rater Name', 'Rater Email',
        'Rated User', 'Rated Email', 'Swap Request ID', 'Offered Skill', 'Wanted Skill'
    ])
    
    # Write data
    for row in feedback:
        writer.writerow([
            row['id'],
            row['rating'],
            row['feedback'] or 'No feedback provided',
            row['created_at'],
            row['rater_name'],
            row['rater_email'],
            row['rated_name'],
            row['rated_email'],
            row['swap_request_id'],
            row['offered_skill'],
            row['wanted_skill']
        ])
    
    output.seek(0)
    return output

def generate_swap_stats_report():
    """Generate CSV report of swap statistics"""
    conn = get_db()
    
    # Get swap statistics
    swaps = conn.execute('''
        SELECT 
            sr.id,
            sr.status,
            sr.created_at,
            sr.message,
            requester.name as requester_name,
            requester.email as requester_email,
            provider.name as provider_name,
            provider.email as provider_email,
            s1.skill_name as offered_skill,
            s1.description as offered_description,
            s2.skill_name as wanted_skill,
            s2.description as wanted_description,
            r1.rating as requester_rating,
            r1.feedback as requester_feedback,
            r2.rating as provider_rating,
            r2.feedback as provider_feedback
        FROM swap_requests sr
        JOIN users requester ON sr.requester_id = requester.id
        JOIN users provider ON sr.provider_id = provider.id
        JOIN skills s1 ON sr.offered_skill_id = s1.id
        JOIN skills s2 ON sr.wanted_skill_id = s2.id
        LEFT JOIN ratings r1 ON (sr.id = r1.swap_request_id AND sr.requester_id = r1.rater_id)
        LEFT JOIN ratings r2 ON (sr.id = r2.swap_request_id AND sr.provider_id = r2.rater_id)
        ORDER BY sr.created_at DESC
    ''').fetchall()
    
    conn.close()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Swap ID', 'Status', 'Date', 'Message', 'Requester Name', 'Requester Email',
        'Provider Name', 'Provider Email', 'Offered Skill', 'Offered Description',
        'Wanted Skill', 'Wanted Description', 'Requester Rating', 'Requester Feedback',
        'Provider Rating', 'Provider Feedback'
    ])
    
    # Write data
    for swap in swaps:
        writer.writerow([
            swap['id'],
            swap['status'].title(),
            swap['created_at'],
            swap['message'] or 'No message',
            swap['requester_name'],
            swap['requester_email'],
            swap['provider_name'],
            swap['provider_email'],
            swap['offered_skill'],
            swap['offered_description'] or 'No description',
            swap['wanted_skill'],
            swap['wanted_description'] or 'No description',
            swap['requester_rating'] or 'Not rated',
            swap['requester_feedback'] or 'No feedback',
            swap['provider_rating'] or 'Not rated',
            swap['provider_feedback'] or 'No feedback'
        ])
    
    output.seek(0)
    return output

# Report download routes
@app.route('/admin/download/user_activity')
@admin_required
def download_user_activity():
    """Download user activity report as CSV"""
    try:
        output = generate_user_activity_report()
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'user_activity_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        flash(f'Error generating user activity report: {str(e)}', 'error')
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/download/feedback_logs')
@admin_required
def download_feedback_logs():
    """Download feedback logs report as CSV"""
    try:
        output = generate_feedback_logs_report()
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'feedback_logs_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        flash(f'Error generating feedback logs report: {str(e)}', 'error')
        return redirect(url_for('admin_dashboard'))

@app.route('/admin/download/swap_stats')
@admin_required
def download_swap_stats():
    """Download swap statistics report as CSV"""
    try:
        output = generate_swap_stats_report()
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'swap_stats_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        flash(f'Error generating swap stats report: {str(e)}', 'error')
        return redirect(url_for('admin_dashboard'))

@app.route('/remove_profile_photo', methods=['POST'])
@login_required
def remove_profile_photo():
    try:
        conn = get_db()
        # Get current photo filename
        user = conn.execute('SELECT profile_photo FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        if user and user['profile_photo']:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], user['profile_photo'])
            if os.path.exists(file_path):
                os.remove(file_path)
        # Set profile_photo to NULL
        conn.execute('UPDATE users SET profile_photo = NULL WHERE id = ?', (session['user_id'],))
        conn.commit()
        conn.close()
        flash('Profile photo removed.', 'success')
    except Exception as e:
        flash(f'Error removing profile photo: {str(e)}', 'error')
    return redirect(url_for('profile'))

@app.route('/request_from_user/<int:user_id>')
@login_required
def request_from_user(user_id):
    conn = get_db()
    
    # Get the user details
    user = conn.execute('SELECT * FROM users WHERE id = ? AND is_public = 1 AND is_banned = 0', (user_id,)).fetchone()
    
    if not user:
        flash('User not found or not available.', 'error')
        return redirect(url_for('index'))
    
    # Check if the target user is under supervision
    if user['is_under_supervision']:
        flash('This user is currently under supervision and cannot receive swap requests.', 'warning')
        return redirect(url_for('index'))
    
    # Get all offered skills of this user (exclude rejected)
    offered_skills = conn.execute('''
        SELECT * FROM skills 
        WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1 AND is_rejected = 0
    ''', (user_id,)).fetchall()
    
    if not offered_skills:
        flash('This user has no skills available for swapping.', 'warning')
        return redirect(url_for('index'))
    
    # Get current user's offered skills (exclude rejected)
    user_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    user = convert_row_datetimes(user)
    offered_skills = convert_rows_datetimes(offered_skills)
    user_skills = convert_rows_datetimes(user_skills)
    
    return render_template('request_from_user.html', 
                         target_user=user, 
                         offered_skills=offered_skills, 
                         user_skills=user_skills)

@app.route('/notifications')
@login_required
def notifications():
    conn = get_db()
    user_notifications = conn.execute('''
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ''', (session['user_id'],)).fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    user_notifications = convert_rows_datetimes(user_notifications)
    
    return render_template('notifications.html', notifications=user_notifications)

@app.route('/mark_notification_read/<int:notification_id>')
@login_required
def mark_notification_read(notification_id):
    conn = get_db()
    # Verify the notification belongs to the current user
    notification = conn.execute('''
        SELECT id FROM notifications 
        WHERE id = ? AND user_id = ?
    ''', (notification_id, session['user_id'])).fetchone()
    
    if notification:
        conn.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', (notification_id,))
        conn.commit()
    
    conn.close()
    return redirect(url_for('notifications'))

@app.route('/mark_all_notifications_read')
@login_required
def mark_all_notifications_read():
    conn = get_db()
    conn.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (session['user_id'],))
    conn.commit()
    conn.close()
    flash('All notifications marked as read.', 'success')
    return redirect(url_for('notifications'))

@app.route('/delete_notification/<int:notification_id>')
@login_required
def delete_notification(notification_id):
    conn = get_db()
    # Verify the notification belongs to the current user
    notification = conn.execute('''
        SELECT id FROM notifications 
        WHERE id = ? AND user_id = ?
    ''', (notification_id, session['user_id'])).fetchone()
    
    if notification:
        conn.execute('DELETE FROM notifications WHERE id = ?', (notification_id,))
        conn.commit()
        flash('Notification deleted.', 'success')
    else:
        flash('Notification not found.', 'error')
    
    conn.close()
    return redirect(url_for('notifications'))

@app.route('/admin/supervise_user/<int:user_id>')
@admin_required
def supervise_user(user_id):
    conn = get_db()
    conn.execute('UPDATE users SET is_under_supervision = 1 WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    flash('User placed under supervision.', 'warning')
    return redirect(url_for('admin_users'))

@app.route('/admin/unsupervise_user/<int:user_id>')
@admin_required
def unsupervise_user(user_id):
    conn = get_db()
    conn.execute('UPDATE users SET is_under_supervision = 0 WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    flash('User removed from supervision.', 'success')
    return redirect(url_for('admin_users'))

# Chat Routes
@app.route('/chat')
@login_required
def chat():
    """Main chat page"""
    conn = get_db()
    
    # Get all conversations for the current user
    conversations = conn.execute('''
        SELECT 
            c.*,
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END as other_user_id,
            u.name as other_user_name,
            u.profile_photo as other_user_photo,
            (SELECT COUNT(*) FROM chat_messages 
             WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count
        FROM chat_conversations c
        JOIN users u ON (
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END = u.id
        )
        WHERE c.user1_id = ? OR c.user2_id = ?
        ORDER BY c.last_message_at DESC
    ''', (session['user_id'], session['user_id'], session['user_id'], session['user_id'], session['user_id'])).fetchall()
    
    # Get all users for starting new conversations (excluding self, admins, and banned users)
    users = conn.execute('''
        SELECT id, name, profile_photo, is_admin, is_public, location, bio
        FROM users 
        WHERE id != ? AND is_banned = 0 AND is_public = 1
        ORDER BY name ASC
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    return render_template('chat.html', conversations=conversations, users=users)

@app.route('/chat/conversation/<int:conversation_id>')
@login_required
def get_conversation(conversation_id):
    """Get messages for a specific conversation"""
    conn = get_db()
    
    # Verify user is part of this conversation and get conversation details
    conversation = conn.execute('''
        SELECT 
            c.*,
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END as other_user_id,
            u.name as other_user_name,
            u.profile_photo as other_user_photo,
            u.location as other_user_location,
            u.bio as other_user_bio
        FROM chat_conversations c
        JOIN users u ON (
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END = u.id
        )
        WHERE c.id = ? AND (c.user1_id = ? OR c.user2_id = ?)
    ''', (session['user_id'], session['user_id'], conversation_id, session['user_id'], session['user_id'])).fetchone()
    
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    # Get messages
    messages = conn.execute('''
        SELECT 
            m.*,
            u.name as sender_name,
            u.profile_photo as sender_photo
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
    ''', (conversation_id,)).fetchall()
    
    # Mark messages as read
    conn.execute('''
        UPDATE chat_messages 
        SET is_read = 1 
        WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    ''', (conversation_id, session['user_id']))
    
    conn.commit()
    conn.close()
    
    # Convert to list of dicts
    messages_list = []
    for msg in messages:
        # Convert relative photo path to full URL if it exists
        sender_photo = msg['sender_photo']
        if sender_photo and not sender_photo.startswith('http'):
            if sender_photo.startswith('/'):
                sender_photo = sender_photo
            else:
                sender_photo = f'/static/uploads/{sender_photo}'
        
        messages_list.append({
            'id': msg['id'],
            'sender_id': msg['sender_id'],
            'sender_name': msg['sender_name'],
            'sender_photo': sender_photo,
            'message': msg['message'],
            'message_type': msg['message_type'],
            'created_at': msg['created_at'],
            'is_own': msg['sender_id'] == session['user_id']
        })
    
    # Convert relative photo path to full URL if it exists
    other_user_photo = conversation['other_user_photo']
    if other_user_photo and not other_user_photo.startswith('http'):
        if other_user_photo.startswith('/'):
            other_user_photo = other_user_photo
        else:
            other_user_photo = f'/static/uploads/{other_user_photo}'
    
    # Return both messages and conversation metadata
    return jsonify({
        'messages': messages_list,
        'conversation': {
            'id': conversation['id'],
            'other_user_id': conversation['other_user_id'],
            'other_user_name': conversation['other_user_name'],
            'other_user_photo': other_user_photo,
            'other_user_location': conversation['other_user_location'],
            'other_user_bio': conversation['other_user_bio']
        }
    })

@app.route('/chat/send_message', methods=['POST'])
@login_required
def send_chat_message():
    """Send a new chat message"""
    try:
        data = request.get_json()
        conversation_id = data.get('conversation_id')
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        conn = get_db()
        
        # Verify user is part of this conversation
        conversation = conn.execute('''
            SELECT * FROM chat_conversations 
            WHERE id = ? AND (user1_id = ? OR user2_id = ?)
        ''', (conversation_id, session['user_id'], session['user_id'])).fetchone()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Insert message
        cursor = conn.execute('''
            INSERT INTO chat_messages (conversation_id, sender_id, message)
            VALUES (?, ?, ?)
        ''', (conversation_id, session['user_id'], message))
        
        message_id = cursor.lastrowid
        
        # Update conversation last_message_at
        conn.execute('''
            UPDATE chat_conversations 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (conversation_id,))
        
        # Get message details
        new_message = conn.execute('''
            SELECT 
                m.*,
                u.name as sender_name,
                u.profile_photo as sender_photo
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        ''', (message_id,)).fetchone()
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': {
                'id': new_message['id'],
                'sender_id': new_message['sender_id'],
                'sender_name': new_message['sender_name'],
                'sender_photo': new_message['sender_photo'],
                'message': new_message['message'],
                'message_type': new_message['message_type'],
                'created_at': new_message['created_at'],
                'is_own': True
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat/start_conversation', methods=['POST'])
@login_required
def start_conversation():
    """Start a new conversation with a user"""
    try:
        data = request.get_json()
        other_user_id = data.get('user_id')
        
        if not other_user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        conn = get_db()
        
        # Check if conversation already exists
        existing = conn.execute('''
            SELECT id FROM chat_conversations 
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        ''', (session['user_id'], other_user_id, other_user_id, session['user_id'])).fetchone()
        
        if existing:
            return jsonify({'conversation_id': existing['id']})
        
        # Create new conversation
        cursor = conn.execute('''
            INSERT INTO chat_conversations (user1_id, user2_id)
            VALUES (?, ?)
        ''', (session['user_id'], other_user_id))
        
        conversation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'conversation_id': conversation_id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat/admin_message', methods=['POST'])
@admin_required
def send_admin_message():
    """Send a message to a specific user as admin"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        conn = get_db()
        
        # Check if conversation exists, create if not
        conversation = conn.execute('''
            SELECT id FROM chat_conversations 
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        ''', (session['user_id'], user_id, user_id, session['user_id'])).fetchone()
        
        if conversation:
            conversation_id = conversation['id']
        else:
            # Create new conversation
            cursor = conn.execute('''
                INSERT INTO chat_conversations (user1_id, user2_id)
                VALUES (?, ?)
            ''', (session['user_id'], user_id))
            conversation_id = cursor.lastrowid
        
        # Insert message
        cursor = conn.execute('''
            INSERT INTO chat_messages (conversation_id, sender_id, message, message_type)
            VALUES (?, ?, ?, 'system')
        ''', (conversation_id, session['user_id'], message))
        
        # Update conversation last_message_at
        conn.execute('''
            UPDATE chat_conversations 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (conversation_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'conversation_id': conversation_id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat/unread_count')
@login_required
def get_unread_count():
    """Get total unread message count for the user"""
    conn = get_db()
    unread_count = conn.execute('''
        SELECT COUNT(*) as count FROM chat_messages cm
        JOIN chat_conversations c ON cm.conversation_id = c.id
        WHERE (c.user1_id = ? OR c.user2_id = ?) 
        AND cm.sender_id != ? AND cm.is_read = 0
    ''', (session['user_id'], session['user_id'], session['user_id'])).fetchone()['count']
    conn.close()
    
    return jsonify({'unread_count': unread_count})

@app.route('/chat/users')
@login_required
def get_chat_users():
    """Get all available users for chat"""
    conn = get_db()
    
    # Get all users for starting new conversations (excluding self, admins, and banned users)
    users = conn.execute('''
        SELECT id, name, profile_photo, is_admin, is_public, location, bio
        FROM users 
        WHERE id != ? AND is_banned = 0
        ORDER BY name ASC
    ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    # Convert to list of dicts
    users_list = []
    for user in users:
        # Convert relative photo path to full URL if it exists
        profile_photo = user['profile_photo']
        if profile_photo and not profile_photo.startswith('http'):
            if profile_photo.startswith('/'):
                profile_photo = profile_photo
            else:
                profile_photo = f'/static/uploads/{profile_photo}'
        
        users_list.append({
            'id': user['id'],
            'name': user['name'],
            'profile_photo': profile_photo,
            'location': user['location'],
            'bio': user['bio']
        })
    
    return jsonify({'users': users_list})

@app.route('/chat/conversations')
@login_required
def get_chat_conversations():
    """Get all conversations for the current user that have actual messages"""
    conn = get_db()
    
    # Get conversations with actual messages for the current user
    conversations = conn.execute('''
        SELECT 
            c.*,
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END as other_user_id,
            u.name as other_user_name,
            u.profile_photo as other_user_photo,
            (SELECT COUNT(*) FROM chat_messages 
             WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count,
            (SELECT message FROM chat_messages 
             WHERE conversation_id = c.id 
             ORDER BY created_at DESC 
             LIMIT 1) as last_message
        FROM chat_conversations c
        JOIN users u ON (
            CASE 
                WHEN c.user1_id = ? THEN c.user2_id 
                ELSE c.user1_id 
            END = u.id
        )
        WHERE (c.user1_id = ? OR c.user2_id = ?)
        AND EXISTS (
            SELECT 1 FROM chat_messages 
            WHERE conversation_id = c.id
        )
        ORDER BY c.last_message_at DESC
    ''', (session['user_id'], session['user_id'], session['user_id'], session['user_id'], session['user_id'])).fetchall()
    
    conn.close()
    
    # Convert to list of dicts
    conversations_list = []
    for conv in conversations:
        # Convert relative photo path to full URL if it exists
        other_user_photo = conv['other_user_photo']
        if other_user_photo and not other_user_photo.startswith('http'):
            if other_user_photo.startswith('/'):
                other_user_photo = other_user_photo
            else:
                other_user_photo = f'/static/uploads/{other_user_photo}'
        
        conversations_list.append({
            'id': conv['id'],
            'other_user_id': conv['other_user_id'],
            'other_user_name': conv['other_user_name'],
            'other_user_photo': other_user_photo,
            'unread_count': conv['unread_count'],
            'last_message_at': conv['last_message_at'],
            'last_message': conv['last_message']
        })
    
    return jsonify({'conversations': conversations_list})

@app.route('/chat/notifications')
@login_required
def get_chat_notifications():
    """Get notifications for the chat interface"""
    conn = get_db()
    
    # Get unread notifications
    notifications = conn.execute('''
        SELECT * FROM notifications 
        WHERE user_id = ? AND is_read = 0
        ORDER BY created_at DESC
        LIMIT 10
    ''', (session['user_id'],)).fetchall()
    
    # Get active announcements
    announcements = conn.execute('''
        SELECT * FROM messages 
        WHERE is_active = 1
        ORDER BY created_at DESC
        LIMIT 5
    ''').fetchall()
    
    conn.close()
    
    notifications_list = []
    for notif in notifications:
        notifications_list.append({
            'id': notif['id'],
            'title': notif['title'],
            'message': notif['message'],
            'type': notif['type'],
            'created_at': notif['created_at']
        })
    
    announcements_list = []
    for ann in announcements:
        announcements_list.append({
            'id': ann['id'],
            'title': ann['title'],
            'content': ann['content'],
            'created_at': ann['created_at']
        })
    
    return jsonify({
        'notifications': notifications_list,
        'announcements': announcements_list
    })

@app.route('/debug/rejected_skills')
@login_required
def debug_rejected_skills():
    """Debug route to check rejected skills in database"""
    if not session.get('is_admin'):
        return "Access denied", 403
    
    conn = get_db()
    all_skills = conn.execute('''
        SELECT s.*, u.name as user_name 
        FROM skills s 
        JOIN users u ON s.user_id = u.id 
        ORDER BY s.id DESC
    ''').fetchall()
    conn.close()
    
    html = "<h2>All Skills Debug</h2><table border='1'><tr><th>ID</th><th>Name</th><th>User</th><th>Is Rejected</th><th>Rejection Reason</th><th>Rejected At</th></tr>"
    for skill in all_skills:
        html += f"<tr><td>{skill['id']}</td><td>{skill['skill_name']}</td><td>{skill['user_name']}</td><td>{skill.get('is_rejected', 'N/A')}</td><td>{skill.get('rejection_reason', 'N/A')}</td><td>{skill.get('rejected_at', 'N/A')}</td></tr>"
    html += "</table>"
    return html

if __name__ == '__main__':
    init_db()
    app.run(debug=True)