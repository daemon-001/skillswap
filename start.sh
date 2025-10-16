#!/bin/bash

echo "Starting SkillSwap React Application..."
echo

echo "Starting Backend (Flask API)..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting Frontend (React)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo
echo "Both servers are starting..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo
echo "Admin Login:"
echo "Email: admin@skillswap.com"
echo "Password: admin123"
echo

# Wait for user input to stop servers
echo "Press any key to stop both servers..."
read -n 1

echo "Stopping servers..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

echo "Servers stopped."
