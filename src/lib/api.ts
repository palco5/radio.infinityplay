// API Client for InfinityPlay Radio - Loopia Backend
// Zamenjuje Supabase client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'Request failed';
        let errorData: any = null;
        try {
            const text = await response.text();
            try {
                errorData = JSON.parse(text);
                errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
            } catch {
                // Not JSON, use text (truncate if too long)
                errorMessage = text.substring(0, 200) || `HTTP Error ${response.status} ${response.statusText}`;
            }
        } catch (e) {
            errorMessage = `HTTP Error ${response.status} ${response.statusText}`;
        }
        if (errorData && errorData.debug_code) {
            // Local dev only (backend EMAIL_CODE_DEBUG): show the PIN in console.
            console.log(`%c[DEV] PIN kod: ${errorData.debug_code}`, 'font-size:18px;font-weight:bold;color:#10b981');
        }
        const err = new Error(errorMessage) as Error & { status?: number; data?: any };
        err.status = response.status;
        err.data = errorData;
        throw err;
    }

    const data = await response.json();
    if (data && data.debug_code) {
        // Local dev only (backend EMAIL_CODE_DEBUG): show the PIN in console.
        console.log(`%c[DEV] PIN kod: ${data.debug_code}`, 'font-size:18px;font-weight:bold;color:#10b981');
    }
    return data;
}

// Auth API
export const auth = {
    async register(email: string, password: string, first_name: string, last_name: string, phone_number?: string, country_code?: string, venue_name?: string) {
        // Returns { requiresVerification: true, email } — no token until the
        // email PIN is verified via verifyEmail().
        const data = await apiCall('/auth.php?path=register', {
            method: 'POST',
            body: JSON.stringify({ email, password, first_name, last_name, phone_number, country_code, venue_name }),
        });

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        return data;
    },

    async verifyEmail(email: string, code: string) {
        const data = await apiCall('/auth.php?path=verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        return data;
    },

    async resendCode(email: string) {
        return apiCall('/auth.php?path=resend-code', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    async requestPasswordReset(email: string) {
        return apiCall('/auth.php?path=request-reset', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    async verifyResetCode(email: string, code: string) {
        // Validates the reset PIN without consuming it (wizard PIN step).
        return apiCall('/auth.php?path=verify-reset-code', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
    },

    async resetPassword(email: string, code: string, newPassword: string) {
        return apiCall('/auth.php?path=reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, code, newPassword }),
        });
    },

    async login(email: string, password: string) {
        const data = await apiCall('/auth.php?path=login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        return data;
    },

    async getCurrentUser() {
        // NE brišemo token na grešku — mrežni/serverski štucaj ne sme da izloguje
        // korisnika. Vrati null; pozivalac zadržava sesiju iz lokalnog tokena.
        try {
            const data = await apiCall('/auth.php?path=me');
            return data.user;
        } catch (error) {
            return null;
        }
    },

    async getAllProfiles() {
        const data = await apiCall('/auth.php?path=users');
        return data.users;
    },

    async changePassword(currentPassword: string, newPassword: string) {
        return apiCall('/auth.php?path=change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    async deleteAccount(password: string) {
        const data = await apiCall('/auth.php?path=delete-account', {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
        localStorage.removeItem('auth_token');
        return data;
    },

    logout() {
        localStorage.removeItem('auth_token');
    },
};

// Stations API
export const stations = {
    async getAll() {
        const data = await apiCall('/stations.php');
        return data.stations;
    },

    async getById(id: string) {
        const data = await apiCall(`/stations.php?id=${id}`);
        return data.station;
    },

    async create(station: any) {
        const data = await apiCall('/stations.php', {
            method: 'POST',
            body: JSON.stringify(station),
        });
        return data;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/stations.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data;
    },

    async delete(id: string) {
        const data = await apiCall(`/stations.php?id=${id}`, {
            method: 'DELETE',
        });
        return data;
    },
};

// Profiles API
export const profiles = {
    async getById(id: string) {
        const data = await apiCall(`/profiles.php?id=${id}`);
        return data.profile;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/profiles.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data.profile;
    },

    async delete(id: string) {
        await apiCall(`/profiles.php?id=${id}`, { method: 'DELETE' });
    },
};

// Favorites API
export const favorites = {
    async getAll() {
        const data = await apiCall('/favorites.php');
        return data.favorites;
    },

    async add(station_id: string) {
        const data = await apiCall('/favorites.php', {
            method: 'POST',
            body: JSON.stringify({ station_id }),
        });
        return data.favorite;
    },

    async remove(station_id: string) {
        await apiCall(`/favorites.php?station_id=${station_id}`, {
            method: 'DELETE',
        });
    },
};

// Blacklist API — per-user blocked songs / artists
export interface BlacklistEntry {
    id: string;
    block_type: 'song' | 'artist';
    artist: string;
    title: string | null;
    created_at?: string;
}

export const blacklist = {
    async getAll(): Promise<BlacklistEntry[]> {
        const data = await apiCall('/blacklist.php');
        return data.blacklist ?? [];
    },
    async blockSong(artist: string, title: string): Promise<BlacklistEntry> {
        const data = await apiCall('/blacklist.php', {
            method: 'POST',
            body: JSON.stringify({ block_type: 'song', artist, title }),
        });
        return data.entry;
    },
    async blockArtist(artist: string): Promise<BlacklistEntry> {
        const data = await apiCall('/blacklist.php', {
            method: 'POST',
            body: JSON.stringify({ block_type: 'artist', artist }),
        });
        return data.entry;
    },
    async remove(id: string): Promise<void> {
        await apiCall(`/blacklist.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    // Really skip the current track on the user's personal "Moj Radio" AutoDJ
    // station (server calls MediaCP). Per-user; safe for personal stations only.
    async skipMojRadio(streamUrl: string): Promise<{ ok: boolean }> {
        return apiCall('/blacklist.php?action=skip', {
            method: 'POST',
            body: JSON.stringify({ stream_url: streamUrl }),
        });
    },
};

// Email API
export const emails = {
    async send(to: string, subject: string, html: string) {
        const data = await apiCall('/send_email.php', {
            method: 'POST',
            body: JSON.stringify({ to, subject, html }),
        });
        return data;
    },
};

// Jingles API
export const jingles = {
    async getAll(user_id?: string) {
        const url = user_id ? `/jingles.php?user_id=${user_id}` : '/jingles.php';
        const data = await apiCall(url);
        return data.jingles;
    },

    async create(jingle: any) {
        const data = await apiCall('/jingles.php', {
            method: 'POST',
            body: JSON.stringify(jingle),
        });
        return data;
    },

    async update(id: string, updates: any) {
        const data = await apiCall(`/jingles.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        return data;
    },

    async delete(id: string) {
        const data = await apiCall(`/jingles.php?id=${id}`, {
            method: 'DELETE',
        });
        return data;
    },
};

// Remote Session API
export const remote = {
    async heartbeat(payload: { device_id: string; device_type: string; device_name: string; station_id: string | null; station_name: string | null; is_playing: boolean; song_title?: string | null; song_artist?: string | null; song_artwork?: string | null; now_playing_title?: string | null; now_playing_cover?: string | null; now_playing_is_jingle?: boolean; song_state?: string; song_queue?: string | null; saved_playlist_count?: number; volume?: number }) {
        return apiCall('/remote.php?action=heartbeat', { method: 'POST', body: JSON.stringify(payload) });
    },
    async status(deviceId: string) {
        return apiCall(`/remote.php?action=status&device_id=${encodeURIComponent(deviceId)}`);
    },
    async sendCommand(targetDeviceId: string, command: string) {
        return apiCall('/remote.php?action=command', { method: 'POST', body: JSON.stringify({ target_device_id: targetDeviceId, command }) });
    },
    async ack(deviceId: string, commandId: string) {
        return apiCall('/remote.php?action=ack', { method: 'POST', body: JSON.stringify({ device_id: deviceId, command_id: commandId }) });
    },
    async unregister(deviceId: string) {
        return apiCall(`/remote.php?device_id=${encodeURIComponent(deviceId)}`, { method: 'DELETE' }).catch(() => {});
    },
    async renameDevice(targetDeviceId: string, newName: string) {
        return apiCall('/remote.php?action=rename', { method: 'POST', body: JSON.stringify({ device_id: targetDeviceId, device_name: newName }) });
    },
    async liveStats(): Promise<{ listener_counts: Record<string, number>; total_playing: number; total_devices: number }> {
        return apiCall('/remote.php?action=live_stats');
    },
    async liveUsers(): Promise<{ user_sessions: Record<string, { station_name: string; station_id: string; is_playing: boolean; device_name: string; device_type: string }> }> {
        return apiCall('/remote.php?action=live_users');
    },
};

// YouTube Search API — returns video IDs via scraping proxy
export const youtubeSearch = {
    async getVideoIds(query: string, durationSeconds?: number): Promise<string[]> {
        try {
            const token = localStorage.getItem('auth_token');
            let url = `${API_URL}/youtube_search.php?q=${encodeURIComponent(query)}`;
            if (durationSeconds) url += `&duration=${Math.round(durationSeconds)}`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) return [];
            const data = await res.json();
            const ids: string[] = [];
            if (data.videoId) ids.push(data.videoId);
            if (Array.isArray(data.fallback)) ids.push(...data.fallback);
            return ids;
        } catch {
            return [];
        }
    },
};

// Now Playing API — fetches ICY metadata (song title) from any stream
export const nowplaying = {
    async getTitle(streamUrl: string): Promise<string> {
        try {
            const response = await fetch(`${API_URL}/nowplaying.php?url=${encodeURIComponent(streamUrl)}`);
            if (!response.ok) return '';
            const data = await response.json();
            return data.title || '';
        } catch {
            return '';
        }
    },

    async getInfo(streamUrl: string): Promise<{ title: string; coverart: string | null; isJingle: boolean }> {
        try {
            const response = await fetch(`${API_URL}/nowplaying.php?url=${encodeURIComponent(streamUrl)}`);
            if (!response.ok) return { title: '', coverart: null, isJingle: false };
            const data = await response.json();
            return { title: data.title || '', coverart: data.coverart || null, isJingle: data.is_jingle === true };
        } catch {
            return { title: '', coverart: null, isJingle: false };
        }
    },
};

// Polar (merchant of record) — kartično plaćanje
export const polar = {
    // Javni config (bez tajni): da li je Polar podešen na serveru + okruženje.
    async getConfig(): Promise<{ provider: string; environment: string; configured: boolean }> {
        const response = await fetch(`${API_URL}/polar_config.php`);
        return response.json();
    },

    // Server pravi Polar checkout sesiju za paket/ciklus i vraća URL (za embed/modal).
    async createCheckout(params: { plan: string; ciklus: 'mesecno' | 'godisnje' }): Promise<{ url: string; id?: string }> {
        return apiCall('/polar_checkout.php', { method: 'POST', body: JSON.stringify(params) });
    },

    // Posle uspešne uplate: povuci stanje sa Polara odmah (ne čekaj webhook).
    async sync(checkoutId: string): Promise<{ synced: boolean; state?: string; pending?: boolean }> {
        return apiCall('/polar_sync.php', { method: 'POST', body: JSON.stringify({ checkout_id: checkoutId }) });
    },

    // Polar Customer Portal — hostovano upravljanje karticom/plaćanjem/fakturama
    // (kao Claude→Stripe). Vraća URL na koji preusmeravamo korisnika.
    async portal(): Promise<{ url: string }> {
        return apiCall('/polar_portal.php', { method: 'POST' });
    },
};

// Billing (plaćanje po fakturi za firme — e-faktura na SEF)
export interface FirmaCheckoutPayload {
    plan: string;
    ciklus: 'mesecno' | 'godisnje';
    broj_lokacija: number;
    pib: string;
    naziv: string;
    maticni_broj?: string; // opciono — PIB je dovoljan za fakturu
    adresa: string;
    grad: string;
    postanski_broj: string;
    email: string;
    kontakt_osoba?: string;
    u_sistemu_pdv: boolean;
}

export interface FirmaCheckoutResult {
    success: boolean;
    redirect: string;
    subscription: { id: string; state: string; access_until: string; ukupno: number; currency: string };
}

export interface BillingPortalPayment {
    invoice_id: number;
    broj_fakture: string;
    ukupno: string;
    valuta: string;
    racun: string;
    poziv_na_broj: string;
    primalac: string;
    datum_valute: string;
    qr: string; // data URL PNG (prazan ako firma nije podešena)
}

export interface BillingPortalInvoice {
    id: number;
    broj_fakture: string;
    datum: string;
    ukupno: string;
    valuta: string;
    status: string;
    placeno_datum: string | null;
}

export interface BillingPortalState {
    has_access: boolean;
    subscription: {
        state: string;
        payment_method: string;
        plan: string;
        ciklus: string;
        current_period_end: string | null;
        access_until: string | null;
        cancel_at_period_end: boolean;
    } | null;
    payment: BillingPortalPayment | null;
    invoices: BillingPortalInvoice[];
}

export const billing = {
    // Server validira PIB ponovo, upisuje firmu + pretplatu (pending_payment,
    // pristup odmah na 3 dana) i stavlja izdavanje fakture u red. Vraća redirect.
    async firmaCheckout(payload: FirmaCheckoutPayload): Promise<FirmaCheckoutResult> {
        return apiCall('/checkout_firma.php', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // Stanje pretplate + podaci za uplatu (IPS QR) + istorija faktura.
    async getPortal(): Promise<BillingPortalState> {
        return apiCall('/billing_portal.php');
    },

    // Otkazivanje (radi za oba načina: faktura + kartica).
    async cancel(): Promise<{ success: boolean; state: string; access_until: string | null; message?: string }> {
        return apiCall('/billing_portal.php?action=cancel', { method: 'POST' });
    },

    // Reaktivacija u toku perioda.
    async reactivate(): Promise<{ success: boolean; state: string }> {
        return apiCall('/billing_portal.php?action=reactivate', { method: 'POST' });
    },

    // URL HTML fakture za pregled/štampu.
    invoiceUrl(id: number): string {
        return `${API_URL}/billing_portal.php?action=invoice&id=${id}`;
    },

    // Pretraga firme za auto-popunu. Po matičnom broju (lokalni registar) ili
    // po PIB-u (komercijalni API ako je podešen). source_configured=false znači
    // da izvor nije podešen -> tiho ručni unos.
    async lookupCompany(params: { mb?: string; pib?: string }): Promise<{
        found: boolean;
        source_configured?: boolean;
        status?: string | null;
        company?: { naziv: string; adresa: string; grad: string; postanski_broj: string; maticni_broj: string };
    }> {
        const qs = params.mb
            ? `mb=${encodeURIComponent(params.mb)}`
            : `pib=${encodeURIComponent(params.pib ?? '')}`;
        return apiCall(`/pib_lookup.php?${qs}`);
    },
};

// ── Admin: pregled naplate/pretplata za praćenje biznisa ─────────────────────
export interface AdminSubscription {
    id: string;
    user_id: string;
    email: string;
    display_name: string | null;
    state: string;
    plan: string;
    payment_method: string;
    billing_provider: string | null;
    cancel_at_period_end: number;
    current_period_end: string | null;
    access_until: string | null;
    trial_ends_at: string | null;
    provider_subscription_id: string | null;
    created_at: string;
    updated_at: string;
}
export interface AdminBillingOverview {
    summary: { total: number; by_state: Record<string, number>; by_method: Record<string, number> };
    subscriptions: AdminSubscription[];
}
export interface BillingEvent { type: string; reason: string | null; created_at: string }

export interface RevenueMetrics {
    currency: string;
    start: string;
    end: string;
    interval: string;
    totals: { revenue: number; net_revenue: number; orders: number; mrr: number; active_subscriptions: number }; // u centima
    periods: { timestamp: string | null; revenue: number }[];
}

export const adminBilling = {
    // Sve pretplate + zbir po stanju/načinu plaćanja.
    async overview(): Promise<AdminBillingOverview> {
        return apiCall('/admin_billing.php');
    },
    // Istorijat (otkaz/reaktivacija/aktivacija…) jedne pretplate.
    async events(subscriptionId: string): Promise<{ events: BillingEvent[] }> {
        return apiCall(`/admin_billing.php?events=${encodeURIComponent(subscriptionId)}`);
    },
    // Prihod sa Polara (Metrics API) za izabrani period/interval.
    async metrics(params: { start: string; end: string; interval: 'day' | 'week' | 'month' | 'year' }): Promise<RevenueMetrics> {
        const qs = `metrics=1&start=${params.start}&end=${params.end}&interval=${params.interval}`;
        return apiCall(`/admin_billing.php?${qs}`);
    },
};

// Export default client object (compatible with Supabase structure)
const apiClient = {
    auth,
    stations,
    profiles,
    favorites,
    emails,
};

export default apiClient;
