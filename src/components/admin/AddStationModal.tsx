import { useState } from 'react';
import { localStations } from '../../lib/localStorage';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Radio, AlertCircle, CheckCircle } from 'lucide-react';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const genres = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip Hop', 'R&B',
  'Country', 'Folk', 'Reggae', 'Blues', 'Metal', 'Indie', 'Dance',
  'Latin', 'World Music', 'Ambient', 'Chill', 'Lounge', 'Retro'
];

const businessTypes = [
  'Restoran', 'Kafić', 'Bar', 'Teretana', 'Hotel', 'Prodavnica',
  'Salon lepote', 'Spa centar', 'Kancelarija', 'Noćni klub',
  'Lounge bar', 'Shopping centar', 'Medicinski centar'
];

export default function AddStationModal({ isOpen, onClose, onSuccess }: AddStationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: 'Pop',
    stream_url: '',
    bitrate: 128,
    is_featured: false,
    recommended_for: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setLoading(true);

    try {
      localStations.create({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        genre: formData.genre,
        logo_url: null,
        stream_url: formData.stream_url.trim(),
        medicp_id: null,
        bitrate: formData.bitrate,
        is_featured: formData.is_featured,
        is_active: true,
        listener_count: 0,
        icon_url: null,
        icon_emoji: '🎵',
        background_url: null,
        background_color: '#10b981',
        background_type: 'solid',
        grid_row: null,
        grid_column: null,
        grid_page: 1,
        recommended_for: formData.recommended_for,
        updated_at: new Date().toISOString(),
      });

      setSuccess('Stanica je uspešno dodata!');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Greška pri dodavanju stanice');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      genre: 'Pop',
      stream_url: '',
      bitrate: 128,
      is_featured: false,
      recommended_for: [],
    });
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Dodaj Novu Stanicu">
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
            Žanr
          </label>
          <select
            value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-infinity-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-infinity-green-500 outline-none"
          >
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
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
            {loading ? 'Dodavanje...' : 'Dodaj Stanicu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
