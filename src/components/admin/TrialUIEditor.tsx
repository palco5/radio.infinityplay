import React, { useState } from 'react';
import { X, Palette, Type, Sparkles, Eye } from 'lucide-react';
import { TrialUIConfig } from '../../types';

interface TrialUIEditorProps {
    config: TrialUIConfig;
    onSave: (config: TrialUIConfig) => void;
    onClose: () => void;
}

const TrialUIEditor: React.FC<TrialUIEditorProps> = ({ config, onSave, onClose }) => {
    const [editedConfig, setEditedConfig] = useState<TrialUIConfig>(config);
    const [previewMode, setPreviewMode] = useState(false);

    const handleSave = () => {
        onSave({
            ...editedConfig,
            updated_at: new Date().toISOString(),
        });
        onClose();
    };

    const updateConfig = (field: keyof TrialUIConfig, value: any) => {
        setEditedConfig(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const toggleFeature = (feature: string) => {
        const features = editedConfig.features_enabled.includes(feature)
            ? editedConfig.features_enabled.filter(f => f !== feature)
            : [...editedConfig.features_enabled, feature];

        updateConfig('features_enabled', features);
    };

    const availableFeatures = [
        { id: 'unlimited_stations', label: 'Neograničene stanice' },
        { id: 'no_ads', label: 'Bez reklama' },
        { id: 'hd_quality', label: 'HD kvalitet' },
        { id: 'offline_mode', label: 'Offline režim' },
        { id: 'custom_playlists', label: 'Prilagođene plejliste' },
        { id: 'priority_support', label: 'Prioritetna podrška' },
    ];

    return (
        <div className="trial-ui-editor-overlay">
            <div className="trial-ui-editor">
                <div className="editor-header">
                    <h2 className="editor-title">
                        <Palette size={24} />
                        Uredi Trial UI
                    </h2>
                    <button onClick={onClose} className="close-button">
                        <X size={24} />
                    </button>
                </div>

                <div className="editor-content">
                    {/* Color Settings */}
                    <div className="editor-section">
                        <h3 className="section-title">
                            <Palette size={20} />
                            Boje
                        </h3>
                        <div className="color-grid">
                            <div className="color-input-group">
                                <label>Pozadina</label>
                                <input
                                    type="color"
                                    value={editedConfig.background_color}
                                    onChange={(e) => updateConfig('background_color', e.target.value)}
                                />
                            </div>
                            <div className="color-input-group">
                                <label>Gradijent Start</label>
                                <input
                                    type="color"
                                    value={editedConfig.background_gradient_start}
                                    onChange={(e) => updateConfig('background_gradient_start', e.target.value)}
                                />
                            </div>
                            <div className="color-input-group">
                                <label>Gradijent End</label>
                                <input
                                    type="color"
                                    value={editedConfig.background_gradient_end}
                                    onChange={(e) => updateConfig('background_gradient_end', e.target.value)}
                                />
                            </div>
                            <div className="color-input-group">
                                <label>Primarna</label>
                                <input
                                    type="color"
                                    value={editedConfig.primary_color}
                                    onChange={(e) => updateConfig('primary_color', e.target.value)}
                                />
                            </div>
                            <div className="color-input-group">
                                <label>Sekundarna</label>
                                <input
                                    type="color"
                                    value={editedConfig.secondary_color}
                                    onChange={(e) => updateConfig('secondary_color', e.target.value)}
                                />
                            </div>
                            <div className="color-input-group">
                                <label>Akcent</label>
                                <input
                                    type="color"
                                    value={editedConfig.accent_color}
                                    onChange={(e) => updateConfig('accent_color', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Text Settings */}
                    <div className="editor-section">
                        <h3 className="section-title">
                            <Type size={20} />
                            Tekstovi
                        </h3>
                        <div className="text-inputs">
                            <div className="input-group">
                                <label>Poruka dobrodošlice</label>
                                <textarea
                                    value={editedConfig.welcome_message}
                                    onChange={(e) => updateConfig('welcome_message', e.target.value)}
                                    rows={3}
                                    placeholder="Dobrodošli u probni period!"
                                />
                            </div>
                            <div className="input-group">
                                <label>Trial Badge tekst</label>
                                <input
                                    type="text"
                                    value={editedConfig.trial_badge_text}
                                    onChange={(e) => updateConfig('trial_badge_text', e.target.value)}
                                    placeholder="PROBNI PERIOD"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="editor-section">
                        <h3 className="section-title">
                            <Sparkles size={20} />
                            Omogućene funkcije
                        </h3>
                        <div className="features-grid">
                            {availableFeatures.map(feature => (
                                <label key={feature.id} className="feature-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={editedConfig.features_enabled.includes(feature.id)}
                                        onChange={() => toggleFeature(feature.id)}
                                    />
                                    <span>{feature.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Display Options */}
                    <div className="editor-section">
                        <h3 className="section-title">
                            <Eye size={20} />
                            Opcije prikaza
                        </h3>
                        <div className="display-options">
                            <label className="option-checkbox">
                                <input
                                    type="checkbox"
                                    checked={editedConfig.show_confetti}
                                    onChange={(e) => updateConfig('show_confetti', e.target.checked)}
                                />
                                <span>Prikaži konfete pri ulasku</span>
                            </label>
                            <label className="option-checkbox">
                                <input
                                    type="checkbox"
                                    checked={editedConfig.show_timer}
                                    onChange={(e) => updateConfig('show_timer', e.target.checked)}
                                />
                                <span>Prikaži tajmer</span>
                            </label>
                        </div>
                    </div>

                    {/* Custom CSS */}
                    <div className="editor-section">
                        <h3 className="section-title">Custom CSS (opciono)</h3>
                        <textarea
                            value={editedConfig.custom_css || ''}
                            onChange={(e) => updateConfig('custom_css', e.target.value)}
                            rows={6}
                            placeholder=".trial-ui { /* vaši custom stilovi */ }"
                            className="css-editor"
                        />
                    </div>
                </div>

                <div className="editor-footer">
                    <button onClick={() => setPreviewMode(!previewMode)} className="preview-button">
                        <Eye size={20} />
                        {previewMode ? 'Zatvori pregled' : 'Pregled'}
                    </button>
                    <div className="footer-actions">
                        <button onClick={onClose} className="cancel-button">
                            Otkaži
                        </button>
                        <button onClick={handleSave} className="save-button">
                            Sačuvaj
                        </button>
                    </div>
                </div>

                {previewMode && (
                    <div className="preview-panel">
                        <div
                            className="preview-content"
                            style={{
                                background: `linear-gradient(135deg, ${editedConfig.background_gradient_start}, ${editedConfig.background_gradient_end})`,
                            }}
                        >
                            <div className="preview-badge" style={{ backgroundColor: editedConfig.primary_color }}>
                                {editedConfig.trial_badge_text}
                            </div>
                            <h2 style={{ color: editedConfig.accent_color }}>{editedConfig.welcome_message}</h2>
                            <div className="preview-features">
                                {editedConfig.features_enabled.map(f => (
                                    <div key={f} className="preview-feature" style={{ borderColor: editedConfig.secondary_color }}>
                                        {availableFeatures.find(af => af.id === f)?.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .trial-ui-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .trial-ui-editor {
          background: #1f2937;
          border-radius: 20px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid #374151;
        }

        .editor-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #f9fafb;
        }

        .close-button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #374151;
          color: #f9fafb;
        }

        .editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .editor-section {
          margin-bottom: 32px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 16px 0;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .color-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .color-input-group label {
          font-size: 14px;
          color: #d1d5db;
          font-weight: 500;
        }

        .color-input-group input[type="color"] {
          width: 100%;
          height: 50px;
          border: 2px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          background: #111827;
        }

        .text-inputs {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 14px;
          color: #d1d5db;
          font-weight: 500;
        }

        .input-group input,
        .input-group textarea {
          background: #111827;
          border: 2px solid #374151;
          border-radius: 8px;
          padding: 12px;
          color: #f9fafb;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .input-group input:focus,
        .input-group textarea:focus {
          outline: none;
          border-color: #6366f1;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .feature-checkbox,
        .option-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #111827;
          border: 2px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .feature-checkbox:hover,
        .option-checkbox:hover {
          border-color: #6366f1;
        }

        .feature-checkbox input,
        .option-checkbox input {
          cursor: pointer;
        }

        .feature-checkbox span,
        .option-checkbox span {
          color: #d1d5db;
          font-size: 14px;
        }

        .display-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .css-editor {
          font-family: 'Courier New', monospace;
          background: #111827;
          border: 2px solid #374151;
          border-radius: 8px;
          padding: 12px;
          color: #f9fafb;
          font-size: 13px;
          resize: vertical;
        }

        .css-editor:focus {
          outline: none;
          border-color: #6366f1;
        }

        .editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-top: 1px solid #374151;
        }

        .footer-actions {
          display: flex;
          gap: 12px;
        }

        .preview-button,
        .cancel-button,
        .save-button {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .preview-button {
          background: #374151;
          border: none;
          color: #f9fafb;
        }

        .preview-button:hover {
          background: #4b5563;
        }

        .cancel-button {
          background: transparent;
          border: 2px solid #374151;
          color: #d1d5db;
        }

        .cancel-button:hover {
          border-color: #6b7280;
          background: #374151;
        }

        .save-button {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          color: white;
        }

        .save-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }

        .preview-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 600px;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          z-index: 10001;
        }

        .preview-content {
          padding: 40px;
          border-radius: 12px;
          text-align: center;
        }

        .preview-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .preview-features {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }

        .preview-feature {
          padding: 8px 16px;
          border: 2px solid;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
        </div>
    );
};

export default TrialUIEditor;
