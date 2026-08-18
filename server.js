require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Allow CORS if frontend runs separately during development
app.use(cors({
  origin: ['http://localhost:4000', 'http://127.0.0.1:4000'],
  credentials: true
}));

app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Configure Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// 1. Send Google Client ID to frontend securely from .env
app.get('/api/auth/config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

// 2. Google OAuth Verification Endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // Save user info in session
    req.session.user = {
      id: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture']
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid Google Token' });
  }
});

// 3. Endpoint to check active user session
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// 4. Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Default route serving HSA.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'HSA.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
