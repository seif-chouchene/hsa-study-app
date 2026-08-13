require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Strict CORS Policy
app.use(cors({
  origin: 'http://localhost:4000',
  credentials: true
}));

app.use(express.json());

// 2. Secure Session Cookie Setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents XSS attacks from reading session cookie
    secure: process.env.NODE_ENV === 'production', // Set to true if running over HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// 3. Backend Google Auth Verification Endpoint
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // Store user data safely in session
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
