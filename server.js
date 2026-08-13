require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 4000;

// Replace this with your Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Allow cross-origin requests with credentials if running frontend on another port
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Session management
app.use(session({
  secret: 'hsa_super_secret_session_key_123!',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true if serving over HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static assets (HTML, CSS, JS) directly from this directory
app.use(express.static(__dirname));

// Verify Google Token Endpoint
app.post('/auth/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Missing credential token" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Save user info in session
    req.session.user = user;

    res.json({ user });
  } catch (error) {
    console.error('Google token verification failed:', error);
    res.status(401).json({ error: 'Invalid Google credential token' });
  }
});

// Check current session
app.get('/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'HSA.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 HSA Server running at http://localhost:${PORT}`);
});