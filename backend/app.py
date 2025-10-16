from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import os
from datetime import datetime, timedelta
import csv
import io
import json

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-key-here'  # Change this in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = 'uploads'

# Enable CORS for all routes
CORS(app)

# Initialize JWT
jwt = JWTManager(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Helper function to convert SQLite timestamp string to datetime object
def parse_datetime(timestamp_str):
    if timestamp_str is None:
        return None
    try:
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
    
    if hasattr(row, 'keys'):
        row_dict = dict(row)
    else:
        row_dict = row
    
    timestamp_fields = ['created_at', 'updated_at', 'rejected_at', 'last_message_at']
    for field in timestamp_fields:
        if field in row_dict and row_dict[field]:
            parsed_dt = parse_datetime(row_dict[field])
            if parsed_dt:
                # Convert to ISO format string for JSON serialization
                row_dict[field] = parsed_dt.isoformat()
            else:
                # Keep original string if parsing failed
                row_dict[field] = str(row_dict[field])
    
    return row_dict

def convert_rows_datetimes(rows):
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
            is_under_supervision INTEGER DEFAULT 0,
            availability_days TEXT,
            availability_start_time TEXT,
            availability_end_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add new columns if they don't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN availability_days TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN availability_start_time TEXT')
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN availability_end_time TEXT')
    except sqlite3.OperationalError:
        pass
    
    # Skills table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            skill_name TEXT NOT NULL,
            skill_type TEXT NOT NULL,
            description TEXT,
            is_approved INTEGER DEFAULT 0,
            is_rejected INTEGER DEFAULT 0,
            rejection_reason TEXT,
            rejected_at TIMESTAMP,
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
            status TEXT DEFAULT 'pending',
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
    
    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
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
            message_type TEXT DEFAULT 'text',
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

def get_db():
    conn = sqlite3.connect('skill_swap.db')
    conn.row_factory = sqlite3.Row
    return conn

# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        location = data.get('location', '').strip()
        
        if not email or not password or not name:
            return jsonify({'error': 'Please fill in all required fields'}), 400
        
        conn = get_db()
        
        # Check if user already exists
        existing_user = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        cursor = conn.execute('''
            INSERT INTO users (email, password_hash, name, location) 
            VALUES (?, ?, ?, ?)
        ''', (email, password_hash, name, location))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create access token
        access_token = create_access_token(identity=str(user_id))
        
        return jsonify({
            'message': 'Registration successful',
            'access_token': access_token,
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'location': location,
                'is_admin': False,
                'is_public': True,
                'is_under_supervision': False
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '')
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            if user['is_banned']:
                return jsonify({'error': 'Your account has been banned'}), 403
            
            access_token = create_access_token(identity=str(user['id']))
            
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['name'],
                    'location': user['location'],
                    'profile_photo': user['profile_photo'],
                    'bio': user['bio'],
                    'availability': user['availability'],
                    'is_admin': bool(user['is_admin']),
                    'is_public': bool(user['is_public']),
                    'is_under_supervision': bool(user['is_under_supervision'])
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'location': user['location'],
                'profile_photo': user['profile_photo'],
                'bio': user['bio'],
                'availability': user['availability'],
                'is_admin': bool(user['is_admin']),
                'is_public': bool(user['is_public']),
                'is_under_supervision': bool(user['is_under_supervision'])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User endpoints
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 6, type=int)
        availability = request.args.get('availability', '')
        q = request.args.get('q', '')
        
        # Get current user ID if authenticated
        current_user_id = None
        try:
            current_user_id = int(get_jwt_identity())
        except:
            pass
        
        conn = get_db()
        
        # Build user query with filters
        user_query = '''SELECT * FROM users WHERE is_public = 1 AND is_banned = 0 AND is_admin = 0'''
        params = []
        
        if availability == 'available':
            user_query += ' AND availability IS NOT NULL AND availability != ""'
        elif availability == 'unavailable':
            user_query += ' AND (availability IS NULL OR availability = "")'
        
        if q:
            user_query += ' AND (name LIKE ? OR id IN (SELECT user_id FROM skills WHERE skill_name LIKE ? AND is_rejected = 0))'
            params.extend([f'%{q}%', f'%{q}%'])
        
        # Exclude current user if logged in
        if current_user_id:
            user_query += ' AND id != ?'
            params.append(current_user_id)
        
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
            count_params.extend([f'%{q}%', f'%{q}%'])
        
        if current_user_id:
            count_query += ' AND id != ?'
            count_params.append(current_user_id)
        
        total = conn.execute(count_query, count_params).fetchone()['count']
        total_pages = (total + per_page - 1) // per_page
        
        # For each user, get their skills and ratings
        user_profiles = []
        for user in users:
            user_id = user['id']
            offered_skills = conn.execute('''
                SELECT skill_name FROM skills 
                WHERE user_id = ? AND skill_type = 'offered' AND is_approved = 1 AND is_rejected = 0
            ''', (user_id,)).fetchall()
            
            wanted_skills = conn.execute('''
                SELECT skill_name FROM skills 
                WHERE user_id = ? AND skill_type = 'wanted' AND is_approved = 1 AND is_rejected = 0
            ''', (user_id,)).fetchall()
            
            rating_data = conn.execute('''
                SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings 
                FROM ratings WHERE rated_id = ?
            ''', (user_id,)).fetchone()
            
            avg_rating = rating_data['avg_rating']
            total_ratings = rating_data['total_ratings']
            
            user_profiles.append({
                'id': user['id'],
                'name': user['name'],
                'profile_photo': user['profile_photo'],
                'offered_skills': [s['skill_name'] for s in offered_skills],
                'wanted_skills': [s['skill_name'] for s in wanted_skills],
                'rating': round(avg_rating, 1) if avg_rating else None,
                'total_ratings': total_ratings,
                'availability': user['availability'],
                'bio': user['bio'],
                'location': user['location'],
                'is_under_supervision': bool(user['is_under_supervision'])
            })
        
        conn.close()
        
        return jsonify({
            'users': user_profiles,
            'pagination': {
                'page': page,
                'pages': total_pages,
                'per_page': per_page,
                'total': total,
                'has_prev': page > 1,
                'has_next': page < total_pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        conn = get_db()
        
        user = conn.execute('''
            SELECT * FROM users WHERE id = ? AND is_public = 1 AND is_banned = 0
        ''', (user_id,)).fetchone()
        
        if not user:
            return jsonify({'error': 'Profile not found'}), 404
        
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
        
        # Get recent reviews
        recent_reviews = conn.execute('''
            SELECT r.*, u.name as reviewer_name
            FROM ratings r
            JOIN users u ON r.rater_id = u.id
            WHERE r.rated_id = ?
            ORDER BY r.created_at DESC
            LIMIT 5
        ''', (user_id,)).fetchall()
        
        conn.close()
        
        return jsonify({
            'user': {
                'id': user['id'],
                'name': user['name'],
                'profile_photo': user['profile_photo'],
                'bio': user['bio'],
                'location': user['location'],
                'availability': user['availability'],
                'is_under_supervision': bool(user['is_under_supervision'])
            },
            'offered_skills': [dict(skill) for skill in offered_skills],
            'wanted_skills': [dict(skill) for skill in wanted_skills],
            'stats': {
                'offered_skills': len(offered_skills),
                'wanted_skills': len(wanted_skills),
                'completed_swaps': completed_swaps,
                'avg_rating': avg_rating['avg_rating'] or 0,
                'total_ratings': avg_rating['total_ratings'] or 0,
                'has_rating': avg_rating['total_ratings'] > 0
            },
            'recent_reviews': [dict(review) for review in recent_reviews]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Skills endpoints
@app.route('/api/skills/search', methods=['GET'])
@jwt_required()
def search_skills():
    try:
        user_id = int(get_jwt_identity())
        query = request.args.get('q', '')
        skill_type = request.args.get('skill_type', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        conn = get_db()
        
        base_query = '''
            SELECT s.*, u.name as user_name, u.location, u.is_under_supervision
            FROM skills s
            JOIN users u ON s.user_id = u.id
            WHERE s.skill_type = 'offered' 
            AND u.is_public = 1 AND u.is_banned = 0 AND u.id != ?
            AND s.is_approved = 1 AND s.is_rejected = 0
        '''
        
        params = [user_id]
        
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
        
        total_pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'skills': [dict(skill) for skill in results],
            'pagination': {
                'page': page,
                'pages': total_pages,
                'per_page': per_page,
                'total': total,
                'has_prev': page > 1,
                'has_next': page < total_pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skills', methods=['GET'])
@jwt_required()
def get_user_skills():
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Get user's skills (exclude rejected)
        offered_skills = conn.execute('''
            SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
        ''', (user_id,)).fetchall()
        
        wanted_skills = conn.execute('''
            SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_rejected = 0
        ''', (user_id,)).fetchall()
        
        # Get rejected skills
        rejected_skills = conn.execute('''
            SELECT * FROM skills WHERE user_id = ? AND is_rejected = 1 ORDER BY rejected_at DESC
        ''', (user_id,)).fetchall()
        
        conn.close()
        
        return jsonify({
            'offered_skills': [dict(skill) for skill in offered_skills],
            'wanted_skills': [dict(skill) for skill in wanted_skills],
            'rejected_skills': [dict(skill) for skill in rejected_skills]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skills', methods=['POST'])
@jwt_required()
def add_skill():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Check if user is under supervision
        conn = get_db()
        user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (user_id,)).fetchone()
        if user and user['is_under_supervision']:
            return jsonify({'error': 'You are currently under supervision and cannot add new skills'}), 403
        
        skill_name = data.get('skill_name', '').strip()
        skill_type = data.get('skill_type', '')
        description = data.get('description', '').strip()
        
        if not skill_name or skill_type not in ['offered', 'wanted']:
            return jsonify({'error': 'Invalid skill data'}), 400
        
        conn.execute('''
            INSERT INTO skills (user_id, skill_name, skill_type, description, is_approved)
            VALUES (?, ?, ?, ?, 0)
        ''', (user_id, skill_name, skill_type, description))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Skill submitted for review'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
@jwt_required()
def delete_skill(skill_id):
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Verify the skill belongs to the current user
        skill = conn.execute('SELECT * FROM skills WHERE id = ? AND user_id = ?', (skill_id, user_id)).fetchone()
        if not skill:
            return jsonify({'error': 'Skill not found or you do not have permission to delete it'}), 404
        
        # Check if user is under supervision (only for non-rejected skills)
        if not skill['is_rejected']:
            user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (user_id,)).fetchone()
            if user and user['is_under_supervision']:
                return jsonify({'error': 'You are currently under supervision and cannot delete skills'}), 403
        
        conn.execute('DELETE FROM skills WHERE id = ?', (skill_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Skill deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Swap Requests endpoints
@app.route('/api/swap-requests', methods=['GET'])
@jwt_required()
def get_swap_requests():
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Get sent requests
        sent_requests = conn.execute('''
            SELECT sr.*, u.name as provider_name, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name
            FROM swap_requests sr
            JOIN users u ON sr.provider_id = u.id
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            WHERE sr.requester_id = ?
            ORDER BY sr.created_at DESC
        ''', (user_id,)).fetchall()
        
        # Get received requests
        received_requests = conn.execute('''
            SELECT sr.*, u.name as requester_name, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name
            FROM swap_requests sr
            JOIN users u ON sr.requester_id = u.id
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            WHERE sr.provider_id = ?
            ORDER BY sr.created_at DESC
        ''', (user_id,)).fetchall()
        
        conn.close()
        
        # Combine all requests
        all_requests = list(sent_requests) + list(received_requests)
        all_requests.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify([dict(request) for request in all_requests]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    try:
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
        
        conn.close()
        
        return jsonify({
            'latest': dict(latest_announcement) if latest_announcement else None,
            'older': [dict(announcement) for announcement in old_announcements]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profile update endpoint
@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        name = data.get('name', '').strip()
        location = data.get('location', '').strip()
        bio = data.get('bio', '').strip()
        availability = data.get('availability', '').strip()
        is_public = data.get('is_public', True)
        
        # Handle advanced availability scheduling
        availability_days = data.get('availability_days', [])
        start_time = data.get('start_time', '').strip()
        end_time = data.get('end_time', '').strip()
        
        # Format availability string if days are provided
        if availability_days:
            day_order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            selected_days_sorted = [day for day in day_order if day in availability_days]
            
            if selected_days_sorted:
                day_display = ', '.join([day.title() for day in selected_days_sorted])
                
                if start_time and end_time:
                    # Format time for display
                    start_formatted = datetime.strptime(start_time, '%H:%M').strftime('%I:%M %p')
                    end_formatted = datetime.strptime(end_time, '%H:%M').strftime('%I:%M %p')
                    availability = f"{day_display} {start_formatted} to {end_formatted}"
                elif start_time:
                    start_formatted = datetime.strptime(start_time, '%H:%M').strftime('%I:%M %p')
                    availability = f"{day_display} from {start_formatted}"
                elif end_time:
                    end_formatted = datetime.strptime(end_time, '%H:%M').strftime('%I:%M %p')
                    availability = f"{day_display} until {end_formatted}"
                else:
                    availability = f"{day_display} (anytime)"
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        conn = get_db()
        
        # Store both formatted availability and individual components
        availability_days_str = ','.join(availability_days) if availability_days else ''
        
        conn.execute('''
            UPDATE users SET name = ?, location = ?, bio = ?, availability = ?, is_public = ?,
                           availability_days = ?, availability_start_time = ?, availability_end_time = ?
            WHERE id = ?
        ''', (name, location, bio, availability, is_public, availability_days_str, start_time, end_time, user_id))
        conn.commit()
        
        # Get updated user data
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'location': user['location'],
                'profile_photo': user['profile_photo'],
                'bio': user['bio'],
                'availability': user['availability'],
                'availability_days': (user['availability_days'] or '').split(',') if 'availability_days' in user.keys() and user['availability_days'] else [],
                'availability_start_time': user['availability_start_time'] if 'availability_start_time' in user.keys() else '',
                'availability_end_time': user['availability_end_time'] if 'availability_end_time' in user.keys() else '',
                'is_admin': bool(user['is_admin']),
                'is_public': bool(user['is_public']),
                'is_under_supervision': bool(user['is_under_supervision']),
                'created_at': user['created_at']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profile photo upload endpoint
@app.route('/api/profile/photo', methods=['POST'])
@jwt_required()
def upload_profile_photo():
    try:
        user_id = int(get_jwt_identity())
        
        if 'profile_photo' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['profile_photo']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check if file is an image
        if not file.content_type or not file.content_type.startswith('image/'):
            return jsonify({'error': 'Please upload a valid image file'}), 400
        
        # Generate secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        # Save file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Update user profile
        conn = get_db()
        
        # Get current photo to delete old one
        old_photo = conn.execute('SELECT profile_photo FROM users WHERE id = ?', (user_id,)).fetchone()
        if old_photo and old_photo['profile_photo']:
            old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], old_photo['profile_photo'])
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        conn.execute('UPDATE users SET profile_photo = ? WHERE id = ?', (filename, user_id))
        conn.commit()
        # Get updated user data
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        return jsonify({
            'message': 'Profile photo updated successfully',
            'profile_photo': filename,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'location': user['location'],
                'profile_photo': user['profile_photo'],
                'bio': user['bio'],
                'availability': user['availability'],
                'is_admin': bool(user['is_admin']),
                'is_public': bool(user['is_public']),
                'is_under_supervision': bool(user['is_under_supervision'])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profile photo removal endpoint
@app.route('/api/profile/photo', methods=['DELETE'])
@jwt_required()
def remove_profile_photo():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db()
        
        # Get current photo filename
        user = conn.execute('SELECT profile_photo FROM users WHERE id = ?', (user_id,)).fetchone()
        if user and user['profile_photo']:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], user['profile_photo'])
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Set profile_photo to NULL
        conn.execute('UPDATE users SET profile_photo = NULL WHERE id = ?', (user_id,))
        conn.commit()
        
        # Get updated user data
        updated_user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'message': 'Profile photo removed successfully',
            'user': {
                'id': updated_user['id'],
                'email': updated_user['email'],
                'name': updated_user['name'],
                'location': updated_user['location'],
                'profile_photo': updated_user['profile_photo'],
                'bio': updated_user['bio'],
                'availability': updated_user['availability'],
                'is_admin': bool(updated_user['is_admin']),
                'is_public': bool(updated_user['is_public']),
                'is_under_supervision': bool(updated_user['is_under_supervision'])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get profile stats endpoint
@app.route('/api/profile/stats', methods=['GET'])
@jwt_required()
def get_profile_stats():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db()
        
        # Get user's skills (exclude rejected)
        offered_skills = conn.execute('''
            SELECT * FROM skills WHERE user_id = ? AND skill_type = 'offered' AND is_rejected = 0
        ''', (user_id,)).fetchall()
        
        wanted_skills = conn.execute('''
            SELECT * FROM skills WHERE user_id = ? AND skill_type = 'wanted' AND is_rejected = 0
        ''', (user_id,)).fetchall()
        
        # Get completed swaps count
        completed_swaps = conn.execute('''
            SELECT COUNT(*) as count FROM swap_requests 
            WHERE (requester_id = ? OR provider_id = ?) AND status = 'accepted'
        ''', (user_id, user_id)).fetchone()['count']
        
        # Get average rating
        avg_rating = conn.execute('''
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
            FROM ratings WHERE rated_id = ?
        ''', (user_id,)).fetchone()
        
        conn.close()
        
        stats = {
            'offered_skills': len(offered_skills),
            'wanted_skills': len(wanted_skills),
            'completed_swaps': completed_swaps,
            'avg_rating': avg_rating['avg_rating'] or 0,
            'total_ratings': avg_rating['total_ratings'] or 0,
            'has_rating': avg_rating['total_ratings'] > 0
        }
        
        return jsonify({
            'stats': stats,
            'offered_skills': [dict(skill) for skill in offered_skills],
            'wanted_skills': [dict(skill) for skill in wanted_skills]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve uploaded files
@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    try:
        return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404

# Admin API Endpoints
@app.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def admin_stats():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get statistics
        total_users = conn.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').fetchone()['count']
        total_skills = conn.execute('SELECT COUNT(*) as count FROM skills').fetchone()['count']
        pending_swaps = conn.execute('SELECT COUNT(*) as count FROM swap_requests WHERE status = "pending"').fetchone()['count']
        completed_swaps = conn.execute('SELECT COUNT(*) as count FROM swap_requests WHERE status = "completed"').fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'stats': {
                'total_users': total_users,
                'total_skills': total_skills,
                'pending_swaps': pending_swaps,
                'completed_swaps': completed_swaps
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_users():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all non-admin users
        users = conn.execute('SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC').fetchall()
        users_list = [convert_row_datetimes(user) for user in users]
        
        conn.close()
        
        return jsonify({'users': users_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/skills', methods=['GET'])
@jwt_required()
def admin_skills():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all skills with user info
        skills = conn.execute('''
            SELECT s.*, u.name as user_name, u.email
            FROM skills s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
        ''').fetchall()
        
        skills_list = [convert_row_datetimes(skill) for skill in skills]
        
        conn.close()
        
        return jsonify({'skills': skills_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/ban_user/<int:target_user_id>', methods=['POST'])
@jwt_required()
def admin_ban_user(target_user_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Ban the user
        conn.execute('UPDATE users SET is_banned = 1 WHERE id = ?', (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User banned successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/unban_user/<int:target_user_id>', methods=['POST'])
@jwt_required()
def admin_unban_user(target_user_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Unban the user
        conn.execute('UPDATE users SET is_banned = 0 WHERE id = ?', (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User unbanned successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/supervise_user/<int:target_user_id>', methods=['POST'])
@jwt_required()
def admin_supervise_user(target_user_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Place user under supervision
        conn.execute('UPDATE users SET is_under_supervision = 1 WHERE id = ?', (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User placed under supervision'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/unsupervise_user/<int:target_user_id>', methods=['POST'])
@jwt_required()
def admin_unsupervise_user(target_user_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Remove user from supervision
        conn.execute('UPDATE users SET is_under_supervision = 0 WHERE id = ?', (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User removed from supervision'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/approve_skill/<int:skill_id>', methods=['POST'])
@jwt_required()
def admin_approve_skill(skill_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Approve the skill
        conn.execute('UPDATE skills SET is_approved = 1 WHERE id = ?', (skill_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Skill approved successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reject_skill_with_reason', methods=['POST'])
@jwt_required()
def admin_reject_skill_with_reason():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        skill_id = data.get('skill_id')
        rejection_reason = data.get('rejection_reason', '').strip()
        
        if not skill_id or not rejection_reason:
            return jsonify({'error': 'Skill ID and rejection reason are required'}), 400
        
        # Get skill details
        skill = conn.execute('SELECT * FROM skills WHERE id = ?', (skill_id,)).fetchone()
        if not skill:
            return jsonify({'error': 'Skill not found'}), 404
        
        # Delete the skill (reject it)
        conn.execute('DELETE FROM skills WHERE id = ?', (skill_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Skill rejected successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/messages', methods=['GET'])
@jwt_required()
def admin_messages():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all messages
        messages = conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()
        messages_list = [convert_row_datetimes(message) for message in messages]
        
        # Get users for quick message
        users = conn.execute('SELECT id, name, email FROM users WHERE is_admin = 0 AND is_banned = 0').fetchall()
        users_list = [dict(user) for user in users]
        
        conn.close()
        
        return jsonify({
            'messages': messages_list,
            'users': users_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/send_message', methods=['POST'])
@jwt_required()
def admin_send_message():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        
        if not title or not content:
            return jsonify({'error': 'Title and content are required'}), 400
        
        # Create new message
        conn.execute('''
            INSERT INTO messages (title, content, is_active)
            VALUES (?, ?, 1)
        ''', (title, content))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Message created successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/toggle_message/<int:message_id>', methods=['POST'])
@jwt_required()
def admin_toggle_message(message_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Toggle message status
        message = conn.execute('SELECT is_active FROM messages WHERE id = ?', (message_id,)).fetchone()
        if not message:
            return jsonify({'error': 'Message not found'}), 404
        
        new_status = 0 if message['is_active'] else 1
        conn.execute('UPDATE messages SET is_active = ? WHERE id = ?', (new_status, message_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Message status updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/delete_message/<int:message_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_message(message_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Delete the message
        conn.execute('DELETE FROM messages WHERE id = ?', (message_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Message deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/quick_message', methods=['POST'])
@jwt_required()
def admin_quick_message():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        title = data.get('quick_title', '').strip()
        content = data.get('quick_content', '').strip()
        message_type = data.get('quick_type', 'info')
        recipients = data.get('recipients', [])
        
        if not title or not content or not recipients:
            return jsonify({'error': 'Title, content, and recipients are required'}), 400
        
        # Send notifications to selected users
        for recipient_id in recipients:
            conn.execute('''
                INSERT INTO notifications (user_id, title, message, type, is_read)
                VALUES (?, ?, ?, ?, ?)
            ''', (recipient_id, title, content, message_type, 0))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Quick message sent successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/recent_users', methods=['GET'])
@jwt_required()
def admin_recent_users():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get recent users
        users = conn.execute('''
            SELECT * FROM users 
            WHERE is_admin = 0 
            ORDER BY created_at DESC 
            LIMIT 5
        ''').fetchall()
        users_list = [convert_row_datetimes(user) for user in users]
        
        conn.close()
        
        return jsonify({'users': users_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/recent_swaps', methods=['GET'])
@jwt_required()
def admin_recent_swaps():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get recent swaps
        swaps = conn.execute('''
            SELECT sr.*, 
                   u1.name as requester_name, 
                   u2.name as provider_name
            FROM swap_requests sr
            JOIN users u1 ON sr.requester_id = u1.id
            JOIN users u2 ON sr.provider_id = u2.id
            ORDER BY sr.created_at DESC 
            LIMIT 5
        ''').fetchall()
        swaps_list = [convert_row_datetimes(swap) for swap in swaps]
        
        conn.close()
        
        return jsonify({'swaps': swaps_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Swap Request API Endpoints
@app.route('/api/swap/request/<int:skill_id>', methods=['GET'])
@jwt_required()
def get_swap_request_form(skill_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get skill details
        skill = conn.execute('''
            SELECT s.*, u.name as user_name, u.profile_photo as user_photo, u.location as user_location, u.is_under_supervision
            FROM skills s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.is_approved = 1
        ''', (skill_id,)).fetchone()
        
        if not skill:
            return jsonify({'error': 'Skill not found'}), 404
        
        # Check if user is trying to request their own skill
        if skill['user_id'] == user_id:
            return jsonify({'error': 'Cannot request your own skill'}), 400
        
        # Check if the skill provider is under supervision
        if skill['is_under_supervision']:
            return jsonify({'error': 'This user is currently under supervision and cannot receive swap requests'}), 400
        
        conn.close()
        
        return jsonify({'skill': convert_row_datetimes(skill)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/send_request', methods=['POST'])
@jwt_required()
def send_swap_request():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        data = request.get_json()
        skill_id = data.get('skill_id')  # This is the wanted skill
        offered_skill_id = data.get('offered_skill_id')  # This is the skill the user is offering
        message = data.get('message', '').strip()
        
        if not skill_id:
            return jsonify({'error': 'Skill ID is required'}), 400
        
        if not offered_skill_id:
            return jsonify({'error': 'Offered skill ID is required'}), 400
        
        # Get skill details
        skill = conn.execute('SELECT * FROM skills WHERE id = ? AND is_approved = 1', (skill_id,)).fetchone()
        if not skill:
            return jsonify({'error': 'Skill not found'}), 404
        
        # Validate offered skill belongs to user
        offered_skill = conn.execute('SELECT * FROM skills WHERE id = ? AND user_id = ? AND skill_type = "offered" AND is_approved = 1', (offered_skill_id, user_id)).fetchone()
        if not offered_skill:
            return jsonify({'error': 'Invalid offered skill selected'}), 400
        
        # Check if user is trying to request their own skill
        if skill['user_id'] == user_id:
            return jsonify({'error': 'Cannot request your own skill'}), 400
        
        # Check if there's already a pending request
        existing_request = conn.execute('''
            SELECT id FROM swap_requests 
            WHERE requester_id = ? AND wanted_skill_id = ? AND status = 'pending'
        ''', (user_id, skill_id)).fetchone()
        
        if existing_request:
            return jsonify({'error': 'You already have a pending request for this skill'}), 400
        
        # Create swap request
        conn.execute('''
            INSERT INTO swap_requests (requester_id, provider_id, offered_skill_id, wanted_skill_id, message, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, skill['user_id'], offered_skill_id, skill_id, message, 'pending'))
        
        # Create notification for provider
        conn.execute('''
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, ?)
        ''', (skill['user_id'], 'New Swap Request', 
              f'You have received a new skill swap request for "{skill["skill_name"]}"', 'info', 0))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Swap request sent successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/respond/<int:request_id>/<action>', methods=['POST'])
@jwt_required()
def respond_swap_request(request_id, action):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get swap request
        swap_request = conn.execute('''
            SELECT sr.*, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name, u.name as requester_name
            FROM swap_requests sr
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            JOIN users u ON sr.requester_id = u.id
            WHERE sr.id = ? AND sr.provider_id = ?
        ''', (request_id, user_id)).fetchone()
        
        if not swap_request:
            return jsonify({'error': 'Swap request not found'}), 404
        
        if swap_request['status'] != 'pending':
            return jsonify({'error': 'This request has already been responded to'}), 400
        
        # Update request status
        if action == 'accept':
            conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', ('accepted', request_id))
            notification_title = 'Swap Request Accepted'
            notification_message = f'Your request for "{swap_request["wanted_skill_name"]}" has been accepted!'
        elif action == 'reject':
            conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', ('rejected', request_id))
            notification_title = 'Swap Request Rejected'
            notification_message = f'Your request for "{swap_request["wanted_skill_name"]}" has been rejected.'
        else:
            return jsonify({'error': 'Invalid action'}), 400
        
        # Create notification for requester
        conn.execute('''
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (?, ?, ?, ?, ?)
        ''', (swap_request['requester_id'], notification_title, notification_message, 'info', 0))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Swap request {action}ed successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/cancel/<int:request_id>', methods=['POST'])
@jwt_required()
def cancel_swap_request(request_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get swap request
        swap_request = conn.execute('''
            SELECT * FROM swap_requests 
            WHERE id = ? AND requester_id = ?
        ''', (request_id, user_id)).fetchone()
        
        if not swap_request:
            return jsonify({'error': 'Swap request not found'}), 404
        
        if swap_request['status'] != 'pending':
            return jsonify({'error': 'Cannot cancel a request that has already been responded to'}), 400
        
        # Cancel the request
        conn.execute('UPDATE swap_requests SET status = ? WHERE id = ?', ('cancelled', request_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Swap request cancelled successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/rate/<int:request_id>', methods=['GET'])
@jwt_required()
def get_rating_form(request_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get swap request details
        swap_request = conn.execute('''
            SELECT sr.*, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name, u.name as provider_name
            FROM swap_requests sr
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            JOIN users u ON sr.provider_id = u.id
            WHERE sr.id = ? AND sr.requester_id = ? AND sr.status = 'completed'
        ''', (request_id, user_id)).fetchone()
        
        if not swap_request:
            return jsonify({'error': 'Swap request not found or not completed'}), 404
        
        conn.close()
        
        return jsonify({'swap_request': convert_row_datetimes(swap_request)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/submit_rating', methods=['POST'])
@jwt_required()
def submit_rating():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        data = request.get_json()
        request_id = data.get('request_id')
        rating = data.get('rating')
        feedback = data.get('feedback', '').strip()
        
        if not request_id or not rating:
            return jsonify({'error': 'Request ID and rating are required'}), 400
        
        if rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        # Get swap request
        swap_request = conn.execute('''
            SELECT * FROM swap_requests 
            WHERE id = ? AND requester_id = ? AND status = 'completed'
        ''', (request_id, user_id)).fetchone()
        
        if not swap_request:
            return jsonify({'error': 'Swap request not found or not completed'}), 404
        
        # Check if already rated
        existing_rating = conn.execute('''
            SELECT id FROM ratings 
            WHERE swap_request_id = ? AND rater_id = ?
        ''', (request_id, user_id)).fetchone()
        
        if existing_rating:
            return jsonify({'error': 'You have already rated this swap'}), 400
        
        # Create rating
        conn.execute('''
            INSERT INTO ratings (swap_request_id, rater_id, rated_user_id, rating, feedback)
            VALUES (?, ?, ?, ?, ?)
        ''', (request_id, user_id, swap_request['provider_id'], rating, feedback))
        
        # Update user's average rating
        avg_rating = conn.execute('''
            SELECT AVG(rating) as avg_rating FROM ratings 
            WHERE rated_user_id = ?
        ''', (swap_request['provider_id'],)).fetchone()['avg_rating']
        
        conn.execute('UPDATE users SET rating = ? WHERE id = ?', 
                    (round(avg_rating, 2), swap_request['provider_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Rating submitted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/swap/all-requests', methods=['GET'])
@jwt_required()
def get_all_swap_requests():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get requests where user is requester
        sent_requests = conn.execute('''
            SELECT sr.*, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name, u.name as provider_name, u.profile_photo
            FROM swap_requests sr
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            JOIN users u ON sr.provider_id = u.id
            WHERE sr.requester_id = ?
            ORDER BY sr.created_at DESC
        ''', (user_id,)).fetchall()
        
        # Get requests where user is provider
        received_requests = conn.execute('''
            SELECT sr.*, s1.skill_name as offered_skill_name, s2.skill_name as wanted_skill_name, u.name as requester_name, u.profile_photo
            FROM swap_requests sr
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            JOIN users u ON sr.requester_id = u.id
            WHERE sr.provider_id = ?
            ORDER BY sr.created_at DESC
        ''', (user_id,)).fetchall()
        
        conn.close()
        
        return jsonify({
            'sent_requests': [convert_row_datetimes(req) for req in sent_requests],
            'received_requests': [convert_row_datetimes(req) for req in received_requests]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Notifications API Endpoints
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get all notifications for user
        notifications = conn.execute('''
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ''', (user_id,)).fetchall()
        
        notifications_list = [convert_row_datetimes(notification) for notification in notifications]
        
        conn.close()
        
        return jsonify({'notifications': notifications_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark_read/<int:notification_id>', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Mark notification as read
        conn.execute('''
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark_all_read', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Mark all notifications as read
        conn.execute('''
            UPDATE notifications 
            SET is_read = 1 
            WHERE user_id = ? AND is_read = 0
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/delete/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Delete notification
        conn.execute('''
            DELETE FROM notifications 
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Notification deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/unread_count', methods=['GET'])
@jwt_required()
def get_unread_notifications_count():
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Get unread notifications count
        count = conn.execute('''
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = 0
        ''', (user_id,)).fetchone()['count']
        
        conn.close()
        
        return jsonify({'unread_count': count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Chat API Endpoints
@app.route('/api/chat/conversations', methods=['GET'])
@jwt_required()
def get_chat_conversations():
    """Get all conversations for the current user"""
    try:
        user_id = int(get_jwt_identity())
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
                u.location as other_user_location,
                u.bio as other_user_bio,
                (SELECT COUNT(*) FROM chat_messages 
                 WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count,
                (SELECT message FROM chat_messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1) as last_message,
                (SELECT created_at FROM chat_messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1) as last_message_at
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
        ''', (user_id, user_id, user_id, user_id, user_id)).fetchall()
        
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
                    other_user_photo = f'/api/uploads/{other_user_photo}'
            
            conversations_list.append({
                'id': conv['id'],
                'other_user_id': conv['other_user_id'],
                'other_user_name': conv['other_user_name'],
                'other_user_photo': other_user_photo,
                'other_user_location': conv['other_user_location'],
                'other_user_bio': conv['other_user_bio'],
                'unread_count': conv['unread_count'],
                'last_message': conv['last_message'],
                'last_message_at': conv['last_message_at'],
                'created_at': conv['created_at']
            })
        
        return jsonify({'conversations': conversations_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/conversation/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    """Get messages for a specific conversation"""
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Verify user is part of this conversation
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
        ''', (user_id, user_id, conversation_id, user_id, user_id)).fetchone()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Get messages for this conversation
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
            WHERE conversation_id = ? AND sender_id != ?
        ''', (conversation_id, user_id))
        
        conn.commit()
        conn.close()
        
        # Convert to list of dicts
        messages_list = []
        for msg in messages:
            sender_photo = msg['sender_photo']
            if sender_photo and not sender_photo.startswith('http'):
                if sender_photo.startswith('/'):
                    sender_photo = sender_photo
                else:
                    sender_photo = f'/api/uploads/{sender_photo}'
            
            messages_list.append({
                'id': msg['id'],
                'conversation_id': msg['conversation_id'],
                'sender_id': msg['sender_id'],
                'sender_name': msg['sender_name'],
                'sender_photo': sender_photo,
                'message': msg['message'],
                'message_type': msg['message_type'],
                'is_read': msg['is_read'],
                'created_at': msg['created_at']
            })
        
        return jsonify({
            'conversation': {
                'id': conversation['id'],
                'other_user_id': conversation['other_user_id'],
                'other_user_name': conversation['other_user_name'],
                'other_user_photo': conversation['other_user_photo'],
                'other_user_location': conversation['other_user_location'],
                'other_user_bio': conversation['other_user_bio']
            },
            'messages': messages_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/send_message', methods=['POST'])
@jwt_required()
def send_chat_message():
    """Send a new chat message"""
    try:
        user_id = int(get_jwt_identity())
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
        ''', (conversation_id, user_id, user_id)).fetchone()
        
        if not conversation:
            return jsonify({'error': 'Conversation not found'}), 404
        
        # Insert message
        cursor = conn.execute('''
            INSERT INTO chat_messages (conversation_id, sender_id, message)
            VALUES (?, ?, ?)
        ''', (conversation_id, user_id, message))
        
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
        
        # Convert sender photo URL
        sender_photo = new_message['sender_photo']
        if sender_photo and not sender_photo.startswith('http'):
            if sender_photo.startswith('/'):
                sender_photo = sender_photo
            else:
                sender_photo = f'/api/uploads/{sender_photo}'
        
        return jsonify({
            'success': True,
            'message': {
                'id': new_message['id'],
                'conversation_id': new_message['conversation_id'],
                'sender_id': new_message['sender_id'],
                'sender_name': new_message['sender_name'],
                'sender_photo': sender_photo,
                'message': new_message['message'],
                'message_type': new_message['message_type'],
                'is_read': new_message['is_read'],
                'created_at': new_message['created_at']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/start_conversation', methods=['POST'])
@jwt_required()
def start_conversation():
    """Start a new conversation with a user"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        other_user_id = data.get('user_id')
        
        if not other_user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        conn = get_db()
        
        # Check if conversation already exists
        existing = conn.execute('''
            SELECT id FROM chat_conversations 
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        ''', (user_id, other_user_id, other_user_id, user_id)).fetchone()
        
        if existing:
            conn.close()
            return jsonify({'conversation_id': existing['id']})
        
        # Create new conversation
        cursor = conn.execute('''
            INSERT INTO chat_conversations (user1_id, user2_id)
            VALUES (?, ?)
        ''', (user_id, other_user_id))
        
        conversation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'conversation_id': conversation_id}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/users', methods=['GET'])
@jwt_required()
def get_chat_users():
    """Get all available users for chat"""
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Get all users for starting new conversations (excluding self, admins, and banned users)
        users = conn.execute('''
            SELECT id, name, profile_photo, is_admin, is_public, location, bio
            FROM users 
            WHERE id != ? AND is_banned = 0 AND is_public = 1
            ORDER BY name ASC
        ''', (user_id,)).fetchall()
        
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
                    profile_photo = f'/api/uploads/{profile_photo}'
            
            users_list.append({
                'id': user['id'],
                'name': user['name'],
                'profile_photo': profile_photo,
                'location': user['location'],
                'bio': user['bio']
            })
        
        return jsonify({'users': users_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/admin_message', methods=['POST'])
@jwt_required()
def send_admin_message():
    """Send a message to a specific user as admin"""
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        target_user_id = data.get('user_id')
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        if not target_user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Check if conversation exists, create if not
        conversation = conn.execute('''
            SELECT id FROM chat_conversations 
            WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
        ''', (user_id, target_user_id, target_user_id, user_id)).fetchone()
        
        if conversation:
            conversation_id = conversation['id']
        else:
            # Create new conversation
            cursor = conn.execute('''
                INSERT INTO chat_conversations (user1_id, user2_id)
                VALUES (?, ?)
            ''', (user_id, target_user_id))
            conversation_id = cursor.lastrowid
        
        # Insert message
        cursor = conn.execute('''
            INSERT INTO chat_messages (conversation_id, sender_id, message, message_type)
            VALUES (?, ?, ?, 'system')
        ''', (conversation_id, user_id, message))
        
        # Update conversation last_message_at
        conn.execute('''
            UPDATE chat_conversations 
            SET last_message_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (conversation_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'conversation_id': conversation_id}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/unread_count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get total unread message count for the user"""
    try:
        user_id = int(get_jwt_identity())
        conn = get_db()
        
        unread_count = conn.execute('''
            SELECT COUNT(*) as count FROM chat_messages cm
            JOIN chat_conversations c ON cm.conversation_id = c.id
            WHERE (c.user1_id = ? OR c.user2_id = ?) 
            AND cm.sender_id != ? AND cm.is_read = 0
        ''', (user_id, user_id, user_id)).fetchone()['count']
        
        conn.close()
        
        return jsonify({'unread_count': unread_count}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin Download Reports
@app.route('/api/admin/download/user_activity', methods=['GET'])
@jwt_required()
def download_user_activity():
    """Download user activity report as CSV"""
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Generate user activity report
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['User ID', 'Name', 'Email', 'Location', 'Registration Date', 'Last Login', 'Skills Count', 'Swap Requests Sent', 'Swap Requests Received', 'Completed Swaps', 'Average Rating'])
        
        # Get all users with their activity data
        users = conn.execute('''
            SELECT u.*, 
                   COUNT(DISTINCT s.id) as skills_count,
                   COUNT(DISTINCT sr1.id) as requests_sent,
                   COUNT(DISTINCT sr2.id) as requests_received,
                   COUNT(DISTINCT sr3.id) as completed_swaps,
                   AVG(r.rating) as avg_rating
            FROM users u
            LEFT JOIN skills s ON u.id = s.user_id AND s.is_approved = 1
            LEFT JOIN swap_requests sr1 ON u.id = sr1.requester_id
            LEFT JOIN swap_requests sr2 ON u.id = sr2.provider_id
            LEFT JOIN swap_requests sr3 ON (u.id = sr3.requester_id OR u.id = sr3.provider_id) AND sr3.status = 'accepted'
            LEFT JOIN ratings r ON u.id = r.rated_id
            WHERE u.is_admin = 0
            GROUP BY u.id
            ORDER BY u.created_at DESC
        ''').fetchall()
        
        for user in users:
            writer.writerow([
                user['id'],
                user['name'],
                user['email'],
                user['location'] or '',
                user['created_at'],
                user['last_login'] or '',
                user['skills_count'],
                user['requests_sent'],
                user['requests_received'],
                user['completed_swaps'],
                round(user['avg_rating'], 2) if user['avg_rating'] else 0
            ])
        
        conn.close()
        
        # Create file response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'user_activity_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/download/feedback_logs', methods=['GET'])
@jwt_required()
def download_feedback_logs():
    """Download feedback logs report as CSV"""
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Generate feedback logs report
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Rating ID', 'Rater Name', 'Rated User', 'Rating', 'Feedback', 'Swap Request ID', 'Date'])
        
        # Get all ratings with user names
        ratings = conn.execute('''
            SELECT r.*, 
                   u1.name as rater_name,
                   u2.name as rated_name
            FROM ratings r
            JOIN users u1 ON r.rater_id = u1.id
            JOIN users u2 ON r.rated_id = u2.id
            ORDER BY r.created_at DESC
        ''').fetchall()
        
        for rating in ratings:
            writer.writerow([
                rating['id'],
                rating['rater_name'],
                rating['rated_name'],
                rating['rating'],
                rating['feedback'] or '',
                rating['swap_request_id'],
                rating['created_at']
            ])
        
        conn.close()
        
        # Create file response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'feedback_logs_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/download/swap_stats', methods=['GET'])
@jwt_required()
def download_swap_stats():
    """Download swap statistics report as CSV"""
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Generate swap statistics report
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Swap Request ID', 'Requester Name', 'Provider Name', 'Offered Skill', 'Wanted Skill', 'Status', 'Created Date', 'Completed Date', 'Rating Given', 'Rating Received'])
        
        # Get all swap requests with details
        swaps = conn.execute('''
            SELECT sr.*,
                   u1.name as requester_name,
                   u2.name as provider_name,
                   s1.skill_name as offered_skill_name,
                   s2.skill_name as wanted_skill_name,
                   r1.rating as rating_given,
                   r2.rating as rating_received
            FROM swap_requests sr
            JOIN users u1 ON sr.requester_id = u1.id
            JOIN users u2 ON sr.provider_id = u2.id
            JOIN skills s1 ON sr.offered_skill_id = s1.id
            JOIN skills s2 ON sr.wanted_skill_id = s2.id
            LEFT JOIN ratings r1 ON sr.id = r1.swap_request_id AND r1.rater_id = sr.requester_id
            LEFT JOIN ratings r2 ON sr.id = r2.swap_request_id AND r2.rater_id = sr.provider_id
            ORDER BY sr.created_at DESC
        ''').fetchall()
        
        for swap in swaps:
            writer.writerow([
                swap['id'],
                swap['requester_name'],
                swap['provider_name'],
                swap['offered_skill_name'],
                swap['wanted_skill_name'],
                swap['status'],
                swap['created_at'],
                swap['completed_at'] or '',
                swap['rating_given'] or '',
                swap['rating_received'] or ''
            ])
        
        conn.close()
        
        # Create file response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'swap_stats_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/download/users', methods=['GET'])
@jwt_required()
def download_users():
    """Download all users data as CSV"""
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if user is admin
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Generate users report
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['User ID', 'Name', 'Email', 'Location', 'Bio', 'Registration Date', 'Last Login', 'Is Admin', 'Is Banned', 'Is Under Supervision', 'Profile Photo'])
        
        # Get all users
        users = conn.execute('''
            SELECT * FROM users ORDER BY created_at DESC
        ''').fetchall()
        
        for user in users:
            writer.writerow([
                user['id'],
                user['name'],
                user['email'],
                user['location'] or '',
                user['bio'] or '',
                user['created_at'],
                user['last_login'] or '',
                user['is_admin'],
                user['is_banned'],
                user['is_under_supervision'],
                user['profile_photo'] or ''
            ])
        
        conn.close()
        
        # Create file response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'users_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Resubmit skill functionality
@app.route('/api/skills/resubmit/<int:skill_id>', methods=['POST'])
@jwt_required()
def resubmit_skill(skill_id):
    """Resubmit a rejected skill for review"""
    try:
        user_id = get_jwt_identity()
        conn = get_db()
        
        # Check if the skill belongs to the current user and is rejected
        skill = conn.execute('''
            SELECT user_id, is_rejected FROM skills WHERE id = ?
        ''', (skill_id,)).fetchone()
        
        if not skill or skill['user_id'] != user_id:
            return jsonify({'error': 'You can only resubmit your own skills'}), 403
        
        if not skill['is_rejected']:
            return jsonify({'error': 'Only rejected skills can be resubmitted'}), 400
        
        # Check if user is under supervision
        user = conn.execute('SELECT is_under_supervision FROM users WHERE id = ?', (user_id,)).fetchone()
        if user and user['is_under_supervision']:
            return jsonify({'error': 'You are currently under supervision and cannot resubmit skills'}), 403
        
        data = request.get_json()
        skill_name = data.get('skill_name', '').strip()
        skill_type = data.get('skill_type', '')
        description = data.get('description', '').strip()
        
        if not skill_name or skill_type not in ['offered', 'wanted']:
            return jsonify({'error': 'Invalid skill data'}), 400
        
        # Update the skill
        conn.execute('''
            UPDATE skills 
            SET skill_name = ?, skill_type = ?, description = ?, is_rejected = 0, is_approved = 0, 
                rejection_reason = NULL, rejected_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (skill_name, skill_type, description, skill_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Skill resubmitted successfully for review'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=False, port=5000)