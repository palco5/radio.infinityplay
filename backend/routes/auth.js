import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone_number, country_code } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM profiles WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = uuidv4();
        const username = email.split('@')[0];

        await pool.query(
            `INSERT INTO profiles 
       (id, email, password, username, display_name, first_name, last_name, phone_number, country_code) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, email, hashedPassword, username, username, first_name, last_name, phone_number, country_code]
        );

        // Get created user
        const [users] = await pool.query(
            `SELECT id, email, username, display_name, first_name, last_name, is_admin, subscription_tier 
       FROM profiles WHERE id = ?`,
            [userId]
        );

        const user = users[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                first_name: user.first_name,
                last_name: user.last_name,
                is_admin: user.is_admin,
                subscription_tier: user.subscription_tier
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.query(
            'SELECT * FROM profiles WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar_url: user.avatar_url,
                is_admin: user.is_admin,
                subscription_tier: user.subscription_tier,
                business_category: user.business_category
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT id, email, username, display_name, first_name, last_name, avatar_url, 
              is_admin, subscription_tier, business_category, phone_number, country_code,
              theme_preference, email_notifications, newsletter_subscribed, jingle_url, jingle_interval_minutes
       FROM profiles WHERE id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user', message: error.message });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

export { authenticateToken };
export default router;
