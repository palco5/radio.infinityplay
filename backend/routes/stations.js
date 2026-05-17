import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all active stations
router.get('/', async (req, res) => {
    try {
        const [stations] = await pool.query(
            `SELECT id, name, description, genre, logo_url, stream_url, bitrate, 
              is_featured, listener_count, icon_url, icon_emoji, background_url, 
              background_color, background_type, grid_row, grid_column, grid_page, 
              recommended_for, created_at
       FROM stations 
       WHERE is_active = 1 
       ORDER BY grid_page, grid_row, grid_column`
        );

        res.json({ stations });
    } catch (error) {
        console.error('Get stations error:', error);
        res.status(500).json({ error: 'Failed to get stations', message: error.message });
    }
});

// Get single station
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [stations] = await pool.query(
            'SELECT * FROM stations WHERE id = ?',
            [id]
        );

        if (stations.length === 0) {
            return res.status(404).json({ error: 'Station not found' });
        }

        res.json({ station: stations[0] });
    } catch (error) {
        console.error('Get station error:', error);
        res.status(500).json({ error: 'Failed to get station', message: error.message });
    }
});

export default router;
