// Per-user blacklist matching helpers.
//
// Now-playing titles arrive as a single "Artist - Title" string (cleaned up by
// nowplaying.php via iTunes). We split on the first " - " to get the artist and
// title, then compare (case-insensitively) against the user's blocked entries.

import type { BlacklistEntry } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Admin pregled: povuci blacklist-u određenog korisnika. Server dozvoljava samo
 * adminu; koristi se u BlacklistModal-u kad admin gleda tuđi dashboard (?adminView).
 */
export async function fetchUserBlacklist(userId: string): Promise<BlacklistEntry[]> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_URL}/blacklist.php?user_id=${encodeURIComponent(userId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Ne mogu da učitam blacklist-u korisnika.');
  const data = await res.json();
  return (data.blacklist ?? []) as BlacklistEntry[];
}

export interface ParsedTrack {
  artist: string; // normalized (lower-case, trimmed); '' if the title didn't split
  title: string;  // normalized; the whole string when there's no " - "
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Split a raw "Artist - Title" now-playing string into its parts. When there's
// no " - " separator (some stream titles), the whole thing is treated as the
// title with an empty artist.
export function parseTrack(fullTitle: string): ParsedTrack {
  const full = (fullTitle ?? '').trim();
  const idx = full.indexOf(' - ');
  if (idx === -1) return { artist: '', title: norm(full) };
  return { artist: norm(full.slice(0, idx)), title: norm(full.slice(idx + 3)) };
}

// Split a raw now-playing title into artist + title preserving original casing
// (for storing a fresh blacklist entry / displaying it back to the user).
export function splitTitle(fullTitle: string): { artist: string; title: string } {
  const full = (fullTitle ?? '').trim();
  const idx = full.indexOf(' - ');
  if (idx === -1) return { artist: '', title: full };
  return { artist: full.slice(0, idx).trim(), title: full.slice(idx + 3).trim() };
}

// True if the given now-playing title is blocked by any entry in the blacklist.
export function isTrackBlocked(fullTitle: string, blacklist: BlacklistEntry[]): boolean {
  if (!fullTitle || blacklist.length === 0) return false;
  const t = parseTrack(fullTitle);
  const fullNorm = norm(fullTitle);

  for (const e of blacklist) {
    const eArtist = norm(e.artist);
    if (e.block_type === 'artist') {
      if (eArtist === '') continue;
      // Match when the parsed artist equals the blocked artist, or — for titles
      // that didn't split — when the artist name appears in the raw title.
      if (t.artist === eArtist) return true;
      if (t.artist === '' && fullNorm.includes(eArtist)) return true;
    } else {
      const eTitle = norm(e.title ?? '');
      if (eTitle === '') continue;
      if (t.artist === eArtist && t.title === eTitle) return true;
      // Fallbacks for imperfect splits: the reconstructed "artist - title"
      // matching the raw string, or a title-only match.
      if (eArtist !== '' && fullNorm === `${eArtist} - ${eTitle}`) return true;
      if (eArtist === '' && t.title === eTitle) return true;
    }
  }
  return false;
}
