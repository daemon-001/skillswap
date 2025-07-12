from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import os
from datetime import datetime
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
    timestamp_fields = ['created_at', 'updated_at']
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
            is_public INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            is_banned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Skills table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            skill_name TEXT NOT NULL,
            skill_type TEXT NOT NULL, -- 'offered' or 'wanted'
            description TEXT,
            is_approved INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
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

# Routes
@app.route('/')
def index():
    page = request.args.get('page', 1, type=int)
    per_page = 6
    availability = request.args.get('availability', '')
    q = request.args.get('q', '')
    conn = get_db()
    # Get active announcements
    announcements = conn.execute('''
        SELECT * FROM messages WHERE is_active = 1 
        ORDER BY created_at DESC LIMIT 3
    ''').fetchall()

    # Build user query with filters
    user_query = '''SELECT * FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0'''
    params = []
    if availability:
        user_query += ' AND availability = ?'
        params.append(availability)
    if q:
        user_query += ' AND (name LIKE ? OR id IN (SELECT user_id FROM skills WHERE skill_name LIKE ?))'
        params.append(f'%{q}%')
        params.append(f'%{q}%')
    # Exclude current user if logged in
    if 'user_id' in session:
        user_query += ' AND id != ?'
        params.append(session['user_id'])
    user_query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    users = conn.execute(user_query, params).fetchall()

    # Get total count for pagination
    count_query = '''SELECT COUNT(*) as count FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0'''
    count_params = []
    if availability:
        count_query += ' AND availability = ?'
        count_params.append(availability)
    if q:
        count_query += ' AND (name LIKE ? OR id IN (SELECT user_id FROM skills WHERE skill_name LIKE ?))'
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
        offered_skills = conn.execute('''SELECT skill_name FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1''', (user_id,)).fetchall()
        wanted_skills = conn.execute('''SELECT skill_name FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_approved = 1''', (user_id,)).fetchall()
        avg_rating = conn.execute('''SELECT AVG(rating) as avg_rating FROM ratings WHERE rated_id = ?''', (user_id,)).fetchone()['avg_rating']
        rating = round(avg_rating, 1) if avg_rating else 0
        user_profiles.append({
            'id': user['id'],
            'name': user['name'],
            'profile_photo': user['profile_photo'],
            'offered_skills': [s['skill_name'] for s in offered_skills],
            'wanted_skills': [s['skill_name'] for s in wanted_skills],
            'rating': rating,
            'availability': user['availability']
        })
    # Get all unique availability values for dropdown
    avail_query = 'SELECT DISTINCT availability FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0 AND availability IS NOT NULL AND availability != ""'
    avail_params = []
    if 'user_id' in session:
        avail_query += ' AND id != ?'
        avail_params.append(session['user_id'])
    availabilities = [row['availability'] for row in conn.execute(avail_query, avail_params).fetchall()]
    conn.close()

    # Convert datetime strings to datetime objects
    announcements = convert_rows_datetimes(announcements)

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

    return render_template('index.html', announcements=announcements, user_profiles=user_profiles, pagination=pagination, availabilities=availabilities, selected_availability=availability, search_query=q)

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
    
    # Get user's skills
    offered_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered'
    ''', (session['user_id'],)).fetchall()
    
    wanted_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted'
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
    
    return render_template('dashboard.html', 
                         user=user,
                         offered_skills=offered_skills, 
                         wanted_skills=wanted_skills,
                         swap_requests=all_requests,
                         stats=stats,
                         unread_notifications=unread_notifications)

@app.route('/profile')
@login_required
def profile():
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    
    # Get user's skills
    offered_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered'
    ''', (session['user_id'],)).fetchall()
    
    wanted_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted'
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
        'total_ratings': avg_rating['total_ratings'] or 0
    }
    
    return render_template('profile.html', user=user, offered_skills=offered_skills, 
                         wanted_skills=wanted_skills, stats=stats)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        name = request.form.get('name', '')
        location = request.form.get('location', '')
        availability = request.form.get('availability', '')
        is_public = 1 if request.form.get('is_public') == 'on' else 0
        
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
                UPDATE users SET name = ?, location = ?, availability = ?, is_public = ?, profile_photo = ?
                WHERE id = ?
            ''', (name, location, availability, is_public, profile_photo, session['user_id']))
        else:
            conn.execute('''
                UPDATE users SET name = ?, location = ?, availability = ?, is_public = ?
                WHERE id = ?
            ''', (name, location, availability, is_public, session['user_id']))
        
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
        skill_name = request.form.get('skill_name', '')
        skill_type = request.form.get('skill_type', '')
        description = request.form.get('description', '')
        
        if not skill_name or skill_type not in ['offered', 'wanted']:
            flash('Invalid skill data.', 'error')
            return redirect(url_for('dashboard'))
        
        conn = get_db()
        conn.execute('''
            INSERT INTO skills (user_id, skill_name, skill_type, description)
            VALUES (?, ?, ?, ?)
        ''', (session['user_id'], skill_name, skill_type, description))
        conn.commit()
        conn.close()
        
        flash('Skill added successfully!', 'success')
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'Error adding skill: {str(e)}', 'error')
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
        SELECT s.*, u.name as user_name, u.location
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE s.skill_type = 'offered' 
        AND u.is_public = 1 AND u.is_banned = 0 AND u.id != ?
        AND s.is_approved = 1
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
    base_query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?'
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
        SELECT s.*, u.name as user_name
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
    ''', (skill_id,)).fetchone()
    
    if not skill:
        flash('Skill not found.', 'error')
        return redirect(url_for('search'))
    
    # Get user's offered skills
    user_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered'
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
        offered_skill_id = request.form.get('offered_skill_id', '')
        wanted_skill_id = request.form.get('wanted_skill_id', '')
        message = request.form.get('message', '')
        
        if not offered_skill_id or not wanted_skill_id:
            flash('Please select both skills for the swap.', 'error')
            return redirect(url_for('search'))
        
        conn = get_db()
        
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
    stats['total_skills'] = conn.execute('SELECT COUNT(*) as count FROM skills').fetchone()['count']
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
    
    conn.close()
    
    # Convert datetime strings to datetime objects
    recent_users = convert_rows_datetimes(recent_users)
    recent_swaps = convert_rows_datetimes(recent_swaps)
    
    return render_template('admin_dashboard.html', stats=stats, recent_users=recent_users, recent_swaps=recent_swaps)

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
        ORDER BY s.id DESC
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
    
    # Get skill details before deleting
    skill = conn.execute('''
        SELECT s.*, u.name as user_name, u.email 
        FROM skills s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.id = ?
    ''', (skill_id,)).fetchone()
    
    if not skill:
        flash('Skill not found.', 'error')
        return redirect(url_for('admin_skills'))
    
    # Delete the skill
    conn.execute('DELETE FROM skills WHERE id = ?', (skill_id,))
    
    # Create notification for the user
    notification_title = "Skill Rejected"
    notification_message = f"Your skill '{skill['skill_name']}' has been rejected by an administrator. Please review our community guidelines and consider adding a different skill."
    
    conn.execute('''
        INSERT INTO notifications (user_id, title, message, type) 
        VALUES (?, ?, ?, ?)
    ''', (skill['user_id'], notification_title, notification_message, 'warning'))
    
    conn.commit()
    conn.close()
    
    flash(f'Skill "{skill["skill_name"]}" rejected and user notified.', 'warning')
    return redirect(url_for('admin_skills'))

@app.route('/admin/messages')
@admin_required
def admin_messages():
    conn = get_db()
    messages = conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()
    conn.close()
    
    # Convert datetime strings to datetime objects
    messages = convert_rows_datetimes(messages)
    
    return render_template('admin_messages.html', messages=messages)

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
    
    # Get all offered skills of this user
    offered_skills = conn.execute('''
        SELECT * FROM skills 
        WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1
    ''', (user_id,)).fetchall()
    
    if not offered_skills:
        flash('This user has no skills available for swapping.', 'warning')
        return redirect(url_for('index'))
    
    # Get current user's offered skills
    user_skills = conn.execute('''
        SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered'
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True)