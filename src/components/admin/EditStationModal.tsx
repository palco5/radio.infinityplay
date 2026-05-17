import { useState, useEffect, useRef } from 'react';
import { stations as stationsApi } from '../../lib/api';
import { RadioStation } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Radio, AlertCircle, CheckCircle, Music, Smartphone, Monitor, Upload, X } from 'lucide-react';
import { getGenreStyle } from '../../lib/genreBackgrounds';
import MUSIC_GENRES from '../../lib/genres';
import { resizeImageToBase64 } from '../../lib/imageUtils';

const PRESET_COLORS = [
  { label: 'Narandžasta', value: '#f97316' },
  { label: 'Crvena', value: '#ef4444' },
  { label: 'Ružičasta', value: '#ec4899' },
  { label: 'Ljubičasta', value: '#8b5cf6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Plava', value: '#3b82f6' },
  { label: 'Cijan', value: '#06b6d4' },
  { label: 'Tirkiz', value: '#14b8a6' },
  { label: 'Zelena', value: '#22c55e' },
  { label: 'Žuta', value: '#eab308' },
  { label: 'Žutomrka', value: '#f59e0b' },
  { label: 'Siva', value: '#6b7280' },
  { label: 'Tamna', value: '#1f2937' },
];

interface EditStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  station: RadioStation | null;
}

const businessTypes = [
  // Ugostiteljstvo - Restorani
  'Restoran', 'Italijanski restoran', 'Pizzeria', 'Fast food', 'Picerija',
  'Kineski restoran', 'Japanski restoran', 'Meksički restoran', 'Grill restoran',
  'Riblji restoran', 'Vegetarijanski restoran', 'Vegan restoran',

  // Ugostiteljstvo - Barovi i kafići
  'Kafić', 'Bar', 'Pub', 'Lounge bar', 'Cocktail bar', 'Wine bar',
  'Sports bar', 'Beach bar', 'Rooftop bar', 'Noćni klub', 'Disco klub',

  // Hoteli i smeštaj
  'Hotel', 'Boutique hotel', 'Hostel', 'Motel', 'Apartmani', 'Lobby bar',

  // Wellness i fitness
  'Teretana', 'Fitness centar', 'Joga studio', 'Pilates studio', 'Crossfit sala',
  'Spa centar', 'Wellness centar', 'Salon lepote', 'Frizerski salon', 'Barbershop',
  'Masažni salon', 'Sauna', 'Bazen',

  // Prodaja
  'Prodavnica', 'Shopping centar', 'Butik', 'Supermarket', 'Knjižara',
  'Cvećara', 'Apoteka', 'Parfumerija', 'Sportska prodavnica', 'Auto salon',

  // Kancelarije i poslovanje
  'Kancelarija', 'Coworking prostor', 'Banka', 'Osiguravajuća kuća',
  'Advokatska kancelarija', 'Računovodstvena agencija',

  // Zdravstvo
  'Medicinski centar', 'Stomatološka ordinacija', 'Veterinarska ambulanta',
  'Laboratorija', 'Fizikalna terapija',

  // Ostalo
  'Autoperionica', 'Benzinska pumpa', 'Bioskop', 'Pozorište', 'Galerija',
  'Muzej', 'Biblioteka', 'Igraonica za decu', 'Escape room', 'Bowling',
  'Kladionica', 'Casino', 'Taxi služba', 'Rent-a-car', 'Turistička agencija'
];

export default function EditStationModal({ isOpen, onClose, onSuccess, station }: EditStationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genres: [] as string[],
    stream_url: '',
    logo_url: '',
    bitrate: 128,
    is_featured: false,
    is_active: true,
    hero_mobile: true,
    hero_desktop: true,
    recommended_for: [] as string[],
    icon_color: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customPlaceInput, setCustomPlaceInput] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (station) {
      // Parse genres from comma-separated string
      const genreArray = station.genre ? station.genre.split(',').map(g => g.trim()) : [];

      setFormData({
        name: station.name,
        description: station.description || '',
        genres: genreArray,
        stream_url: station.stream_url,
        logo_url: station.logo_url || '',
        bitrate: station.bitrate,
        is_featured: station.is_featured,
        is_active: station.is_active,
        hero_mobile: Number(station.hero_mobile) !== 0,
        hero_desktop: Number(station.hero_desktop) !== 0,
        recommended_for: station.recommended_for || [],
        icon_color: station.background_color || '',
      });
    }
  }, [station]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const base64 = await resizeImageToBase64(file, 400, 0.8);
      setFormData(prev => ({ ...prev, logo_url: base64 }));
    } catch {
      setError('Greška pri obradi slike. Pokušajte sa drugom slikom.');
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;

    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Naziv stanice je obavezan');
      return;
    }

    if (!formData.stream_url.trim()) {
      setError('Stream URL je obavezan');
      return;
    }

    if (formData.genres.length === 0) {
      setError('Morate odabrati bar jedan žanr');
      return;
    }

    setLoading(true);

    try {
      await stationsApi.update(station.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        genre: formData.genres.join(', '),
        logo_url: formData.logo_url.trim() || null,
        stream_url: formData.stream_url.trim(),
        bitrate: formData.bitrate,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
        hero_mobile: formData.hero_mobile,
        hero_desktop: formData.hero_desktop,
        recommended_for: formData.recommended_for,
        background_color: formData.icon_color || null,
        background_type: formData.icon_color ? 'solid' : null,
      });

      setSuccess('Stanica je uspešno ažurirana!');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Greška pri ažuriranju stanice');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    onClose();
  };

  if (!station) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Izmeni Stanicu">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Naziv Stanice
          </label>
          <div className="relative">
            <Radio className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pl-10"
              placeholder="Npr. Infinity Rock Radio"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Opis
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
            placeholder="Kratak opis stanice..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Žanrovi {formData.genres.length > 0 && `(${formData.genres.length} odabrano)`}
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-infinity-dark-700">
            {MUSIC_GENRES.map((genre) => (
              <label key={genre} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-infinity-dark-600 p-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={formData.genres.includes(genre)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, genres: [...formData.genres, genre] });
                    } else {
                      setFormData({ ...formData, genres: formData.genres.filter(g => g !== genre) });
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{genre}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Izaberite jedan ili više žanrova koji najbolje opisuju ovu stanicu
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stream URL
          </label>
          <Input
            type="url"
            value={formData.stream_url}
            onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
            placeholder="https://stream.example.com/radio.mp3"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logo stanice (opciono)
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={formData.logo_url.startsWith('data:') ? '' : formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              disabled={formData.logo_url.startsWith('data:')}
              className={formData.logo_url.startsWith('data:') ? 'opacity-50' : ''}
            />
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Upload size={15} />
              {uploadingLogo ? 'Obrada...' : 'Otpremi'}
            </button>
          </div>

          {formData.logo_url && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-infinity-dark-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.logo_url.startsWith('data:') ? '✅ Otpremljena slika' : 'Pregled logoa'}
                </p>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logo_url: '' })}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X size={12} /> Ukloni
                </button>
              </div>
              <div className="w-full h-32 bg-white dark:bg-infinity-dark-800 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={formData.logo_url}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Unesite URL slike ili kliknite "Otpremi" da uploadujete sa računara
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Boja Ikonice (opciono)
          </label>
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-infinity-dark-700 space-y-3">
            {/* Live preview */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0">
                {formData.icon_color ? (
                  <div className="absolute inset-0" style={{ backgroundColor: formData.icon_color }}></div>
                ) : (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${getGenreStyle(formData.genres[0] || '').gradient}`}></div>
                    <div className={`absolute inset-0 ${getGenreStyle(formData.genres[0] || '').pattern}`}></div>
                  </>
                )}
                <Music className="text-white relative z-10" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formData.icon_color ? `Prilagođena boja` : 'Automatska (prema žanru)'}
                </p>
                {formData.icon_color && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{formData.icon_color}</p>
                )}
              </div>
            </div>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon_color: color.value })}
                  title={color.label}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.icon_color === color.value
                      ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
              {/* Custom color picker */}
              <label
                className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center cursor-pointer hover:border-gray-600 dark:hover:border-gray-300 transition-colors bg-white dark:bg-infinity-dark-600"
                title="Prilagođena boja"
              >
                <span className="text-gray-500 dark:text-gray-400 text-lg leading-none">+</span>
                <input
                  type="color"
                  value={formData.icon_color || '#10b981'}
                  onChange={(e) => setFormData({ ...formData, icon_color: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>
            {/* Reset */}
            {formData.icon_color && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, icon_color: '' })}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors"
              >
                Resetuj na automatsku boju prema žanru
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bitrate (kbps)
          </label>
          <Input
            type="number"
            value={formData.bitrate}
            onChange={(e) => setFormData({ ...formData, bitrate: parseInt(e.target.value) })}
            min="64"
            max="320"
            step="32"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
          />
          <label htmlFor="is_featured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Istakni ovu stanicu
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Stanica je aktivna
          </label>
        </div>

        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-infinity-dark-700 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Prikaz na Home Page</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hero_mobile}
              onChange={(e) => setFormData({ ...formData, hero_mobile: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
            />
            <Smartphone size={16} className="text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Prikaži u animaciji na telefonu/tabletu</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hero_desktop}
              onChange={(e) => setFormData({ ...formData, hero_desktop: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
            />
            <Monitor size={16} className="text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Prikaži u hero sekciji na kompjuteru</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preporučeno za objekte
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-infinity-dark-700">
            {businessTypes.map((type) => (
              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.recommended_for.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, recommended_for: [...formData.recommended_for, type] });
                    } else {
                      setFormData({ ...formData, recommended_for: formData.recommended_for.filter(t => t !== type) });
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-infinity-green-600 focus:ring-infinity-green-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
              </label>
            ))}
          </div>

          {/* Custom mesta */}
          <div className="mt-3 p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-infinity-dark-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Dodaj prilagođeno mesto:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPlaceInput}
                onChange={(e) => setCustomPlaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = customPlaceInput.trim();
                    if (val && !formData.recommended_for.includes(val)) {
                      setFormData({ ...formData, recommended_for: [...formData.recommended_for, val] });
                    }
                    setCustomPlaceInput('');
                  }
                }}
                placeholder="Npr. Frizerski salon, Pekara..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-infinity-dark-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const val = customPlaceInput.trim();
                  if (val && !formData.recommended_for.includes(val)) {
                    setFormData({ ...formData, recommended_for: [...formData.recommended_for, val] });
                  }
                  setCustomPlaceInput('');
                }}
                className="px-3 py-2 bg-infinity-green-600 hover:bg-infinity-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Dodaj
              </button>
            </div>
            {/* Prikaz custom unosa */}
            {formData.recommended_for.filter(t => !businessTypes.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.recommended_for.filter(t => !businessTypes.includes(t)).map((custom) => (
                  <span key={custom} className="flex items-center gap-1 px-2 py-1 bg-infinity-green-100 dark:bg-infinity-green-900/30 text-infinity-green-700 dark:text-infinity-green-400 text-xs rounded-full">
                    {custom}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, recommended_for: formData.recommended_for.filter(t => t !== custom) })}
                      className="hover:text-red-600 dark:hover:text-red-400 transition-colors font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Izaberite tipove objekata za koje je ova stanica preporučena
          </p>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleClose}
            disabled={loading}
          >
            Otkaži
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj Izmene'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
