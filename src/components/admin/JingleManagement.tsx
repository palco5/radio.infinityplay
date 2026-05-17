import React, { useState, useEffect } from 'react';
import { UserJingle } from '../../types';
import { jingles as jinglesApi } from '../../lib/api';
import { Music, Upload, Trash, Play, Pause, Hash, Volume2 } from 'lucide-react';

interface JingleManagementProps {
    userId: string;
    onJinglesUpdate?: (jingles: UserJingle[]) => void;
}

// Base preview volume — stays below 1.0 so boost has headroom to be heard
const PREVIEW_BASE_VOLUME = 0.5;

export function JingleManagement({ userId, onJinglesUpdate }: JingleManagementProps) {
    const [jingles, setJingles] = useState<UserJingle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [playingJingleId, setPlayingJingleId] = useState<string | null>(null);
    const [audioPreview] = useState(new Audio());
    const [jingleUrl, setJingleUrl] = useState('');
    const [jingleName, setJingleName] = useState('');

    useEffect(() => {
        loadJingles();
        return () => {
            audioPreview.pause();
            audioPreview.src = '';
        };
    }, [userId]);

    const loadJingles = async () => {
        try {
            setLoading(true);
            const data = await jinglesApi.getAll(userId);
            setJingles(data);
            if (onJinglesUpdate) onJinglesUpdate(data);
        } catch (err: any) {
            setError('Greška: ' + (err.message || String(err)));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (jingles.length + files.length > 5) {
            setError('Maksimalan broj džinglova je 5');
            return;
        }

        setUploading(true);
        setError('');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (file.size > 5 * 1024 * 1024) {
                    setError(`Fajl "${file.name}" je prevelik. Maksimalna veličina je 5MB.`);
                    continue;
                }

                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const duration = await new Promise<number>((resolve) => {
                    const audio = new Audio();
                    audio.onloadedmetadata = () => resolve(audio.duration);
                    audio.src = URL.createObjectURL(file);
                });

                await jinglesApi.create({
                    user_id: userId,
                    jingle_name: file.name.replace(/\.[^/.]+$/, ''),
                    jingle_data: base64Data,
                    storage_type: 'base64',
                    duration_seconds: duration,
                    file_size_bytes: file.size,
                    schedule_type: 'interval',
                    interval_minutes: 15,
                    is_active: true,
                });
            }

            await loadJingles();
        } catch (err: any) {
            setError('Greška pri upload-u: ' + (err.message || String(err)));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleUrlSubmit = async () => {
        if (!jingleUrl.trim()) { setError('Unesite URL džingla'); return; }
        if (jingles.length >= 5) { setError('Maksimalan broj džinglova je 5'); return; }

        setUploading(true);
        setError('');

        try {
            const audio = new Audio(jingleUrl);
            const duration = await new Promise<number>((resolve, reject) => {
                audio.onloadedmetadata = () => resolve(audio.duration);
                audio.onerror = () => reject(new Error('Nije moguće učitati audio sa ovog URL-a'));
                audio.src = jingleUrl;
            });

            await jinglesApi.create({
                user_id: userId,
                jingle_name: jingleName.trim() || 'Džingl ' + (jingles.length + 1),
                cloudinary_url: jingleUrl,
                storage_type: 'url',
                duration_seconds: duration,
                file_size_bytes: 0,
                schedule_type: 'interval',
                interval_minutes: 15,
                is_active: true,
            });

            setJingleUrl('');
            setJingleName('');
            await loadJingles();
        } catch (err: any) {
            setError('Greška: ' + (err.message || String(err)));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Da li ste sigurni da želite da obrišete ovaj džingl?')) return;
        try {
            await jinglesApi.delete(id);
            loadJingles();
        } catch {
            setError('Greška pri brisanju');
        }
    };

    const handleUpdate = async (id: string, updates: Partial<UserJingle>) => {
        try {
            const updatedJingles = jingles.map(j => j.id === id ? { ...j, ...updates } : j);
            setJingles(updatedJingles);
            await jinglesApi.update(id, updates);
            if (onJinglesUpdate) onJinglesUpdate(updatedJingles);
        } catch {
            setError('Greška pri ažuriranju');
            loadJingles();
        }
    };

    const applyPreviewVolume = (boostDb: number) => {
        const gain = Math.pow(10, boostDb / 20);
        audioPreview.volume = Math.min(1.0, PREVIEW_BASE_VOLUME * gain);
    };

    const togglePreview = (jingle: UserJingle, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (playingJingleId === jingle.id) {
            audioPreview.pause();
            setPlayingJingleId(null);
        } else {
            const audioUrl = jingle.jingle_data
                ? `data:audio/mpeg;base64,${jingle.jingle_data}`
                : jingle.cloudinary_url || '';

            applyPreviewVolume(jingle.volume_boost_db || 0);
            audioPreview.src = audioUrl;
            audioPreview.play();
            setPlayingJingleId(jingle.id);
            audioPreview.onended = () => setPlayingJingleId(null);
        }
    };

    const handleBoostChange = (jingle: UserJingle, db: number) => {
        // Update local state immediately for display
        const updatedJingles = jingles.map(j => j.id === jingle.id ? { ...j, volume_boost_db: db } : j);
        setJingles(updatedJingles);
        if (onJinglesUpdate) onJinglesUpdate(updatedJingles);

        // Live update preview volume if this jingle is playing
        if (playingJingleId === jingle.id) {
            applyPreviewVolume(db);
        }
    };

    const handleBoostSave = (jingle: UserJingle, db: number) => {
        // Persist to DB only when user releases the slider
        jinglesApi.update(jingle.id, { volume_boost_db: db }).catch(() => {
            setError('Greška pri čuvanju pojačanja');
            loadJingles();
        });
    };

    if (loading) {
        return <div className="text-center p-4">Učitavanje džinglova...</div>;
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Upload Area */}
            {jingles.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-infinity-green-500 transition-colors">
                    <input
                        type="file"
                        id="jingle-upload"
                        className="hidden"
                        accept="audio/mp3,audio/mpeg,audio/wav"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <label htmlFor="jingle-upload" className="cursor-pointer block">
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-infinity-green-500 mb-2" />
                                <p className="text-gray-500">Upload u toku...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="font-medium text-gray-700 dark:text-gray-300">Kliknite za upload džinglova</p>
                                <p className="text-xs text-gray-500 mt-1">MP3 format, do 5 fajlova (Preostalo: {5 - jingles.length})</p>
                            </div>
                        )}
                    </label>
                </div>
            )}

            {/* URL Input */}
            {jingles.length < 5 && (
                <div className="border-2 border-gray-300 dark:border-gray-700 rounded-xl p-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Ili dodajte džingl putem URL-a</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Naziv džingla (opciono)</label>
                            <input
                                type="text"
                                value={jingleName}
                                onChange={(e) => setJingleName(e.target.value)}
                                placeholder="Npr. Radio Intro"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                disabled={uploading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL džingla (MP3)</label>
                            <input
                                type="url"
                                value={jingleUrl}
                                onChange={(e) => setJingleUrl(e.target.value)}
                                placeholder="https://example.com/jingle.mp3"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
                                disabled={uploading}
                            />
                        </div>
                        <button
                            onClick={handleUrlSubmit}
                            disabled={uploading || !jingleUrl.trim()}
                            className="w-full px-4 py-2 bg-infinity-green-600 hover:bg-infinity-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Dodavanje...' : 'Dodaj Džingl'}
                        </button>
                    </div>
                </div>
            )}

            {/* Jingle List */}
            <div className="space-y-4">
                {jingles.map((jingle) => (
                    <div key={jingle.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-infinity-green-100 dark:bg-infinity-green-900/30 rounded-lg text-infinity-green-600">
                                    <Music size={20} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{jingle.jingle_name}</h4>
                                    <p className="text-xs text-gray-500">
                                        {Math.round(jingle.duration_seconds)}s • {(jingle.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={(e) => togglePreview(jingle, e)}
                                    className="p-2 text-gray-500 hover:text-infinity-green-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {playingJingleId === jingle.id ? <Pause size={18} /> : <Play size={18} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(jingle.id)}
                                    className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">

                            {/* Active Toggle */}
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`active-${jingle.id}`}
                                    checked={jingle.is_active}
                                    onChange={(e) => handleUpdate(jingle.id, { is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                                />
                                <label htmlFor={`active-${jingle.id}`} className="text-sm font-medium">Aktivan</label>
                            </div>

                            {/* Interval — minutes only */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Hash size={16} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Pusti svakih</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={jingle.interval_minutes || 15}
                                    onChange={(e) => handleUpdate(jingle.id, { interval_minutes: Math.max(1, parseInt(e.target.value) || 15) })}
                                    className="w-16 text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 p-1 text-center"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">minuta</span>
                            </div>

                            {/* Volume Boost */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Volume2 size={16} className="text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Pojačanje</span>
                                <input
                                    type="range"
                                    min="-6"
                                    max="20"
                                    step="1"
                                    value={jingle.volume_boost_db ?? 0}
                                    onChange={(e) => handleBoostChange(jingle, parseInt(e.target.value))}
                                    onMouseUp={(e) => handleBoostSave(jingle, parseInt((e.target as HTMLInputElement).value))}
                                    onTouchEnd={(e) => handleBoostSave(jingle, parseInt((e.target as HTMLInputElement).value))}
                                    className="flex-1 min-w-[80px] accent-infinity-green-500"
                                />
                                <span className="text-sm font-mono w-12 text-right text-gray-700 dark:text-gray-300">
                                    {(jingle.volume_boost_db ?? 0) > 0 ? '+' : ''}{jingle.volume_boost_db ?? 0} dB
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {jingles.length === 0 && !uploading && (
                    <div className="text-center text-gray-500 py-4">Nema učitanih džinglova.</div>
                )}
            </div>
        </div>
    );
}
