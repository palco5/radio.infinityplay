import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get user favorites
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [favorites] = await pool.query(
            `SELECT f.id, f.station_id, f.created_at,
              s.name, s.description, s.genre, s.logo_url, s.stream_url
       FROM favorites f
       JOIN stations s ON f.station_id = s.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
            [req.user.userId]
        );

        res.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to get favorites', message: error.message });
    }
});

// Add favorite
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { station_id } = req.body;

        if (!station_id) {
            return res.status(400).json({ error: 'Station ID is required' });
        }

        const id = uuidv4();

        // Check if already exists
        const [existing] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND station_id = ?',
            [req.user.userId, station_id]
        );

        if (existing.length > 0) {
            return res.json({ favorite: existing[0], message: 'Already in favorites' });
        }

        await pool.query(
            'INSERT INTO favorites (id, user_id, station_id) VALUES (?, ?, ?)',
            [id, req.user.userId, station_id]
        );

        const [favorites] = await pool.query(
            'SELECT * FROM favorites WHERE id = ?',
            [id]
        );

        res.status(201).json({ favorite: favorites[0] });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: 'Failed to add favorite', message: error.message });
    }
});

// Remove favorite
router.delete('/:station_id', authenticateToken, async (req, res) => {
    try {
        const { station_id } = req.params;

        await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND station_id = ?',
            [req.user.userId, station_id]
        );

        res.json({ message: 'Favorite removed' });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Failed to remove favorite', message: error.message });
    }
});

export default router;
