import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can only view their own profile unless admin
        if (req.user.userId !== id) {
            const [adminCheck] = await pool.query(
                'SELECT is_admin FROM profiles WHERE id = ?',
                [req.user.userId]
            );

            if (!adminCheck[0]?.is_admin) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        const [profiles] = await pool.query(
            `SELECT id, email, username, display_name, first_name, last_name, avatar_url,
              bio, phone_number, country_code, subscription_tier, subscription_status,
              theme_preference, email_notifications, newsletter_subscribed, business_category,
              custom_location, jingle_url, jingle_interval_minutes, is_admin, created_at
       FROM profiles WHERE id = ?`,
            [id]
        );

        if (profiles.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({ profile: profiles[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile', message: error.message });
    }
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can only update their own profile
        if (req.user.userId !== id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const {
            display_name,
            avatar_url,
            bio,
            business_category,
            custom_location,
            theme_preference,
            email_notifications,
            newsletter_subscribed,
            jingle_url,
            jingle_interval_minutes
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
        if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }
        if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
        if (business_category !== undefined) { updates.push('business_category = ?'); values.push(business_category); }
        if (custom_location !== undefined) { updates.push('custom_location = ?'); values.push(custom_location); }
        if (theme_preference !== undefined) { updates.push('theme_preference = ?'); values.push(theme_preference); }
        if (email_notifications !== undefined) { updates.push('email_notifications = ?'); values.push(email_notifications); }
        if (newsletter_subscribed !== undefined) { updates.push('newsletter_subscribed = ?'); values.push(newsletter_subscribed); }
        if (jingle_url !== undefined) { updates.push('jingle_url = ?'); values.push(jingle_url); }
        if (jingle_interval_minutes !== undefined) { updates.push('jingle_interval_minutes = ?'); values.push(jingle_interval_minutes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        await pool.query(
            `UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [profiles] = await pool.query(
            'SELECT id, email, username, display_name, avatar_url, bio, business_category FROM profiles WHERE id = ?',
            [id]
        );

        res.json({ profile: profiles[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile', message: error.message });
    }
});

export default router;
