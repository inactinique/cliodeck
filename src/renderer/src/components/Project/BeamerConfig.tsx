import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import './BeamerConfig.css';

export interface BeamerConfigOptions {
  // Theme options
  theme: string;
  colortheme: string;
  fonttheme: string;
  aspectratio: string;
  navigation: boolean;
  showNotes: boolean;

  // Title page options
  institute?: string;
  logo?: string;
  titlegraphic?: string;

  // TOC options
  showToc: boolean;
  tocBeforeSection: boolean;

  // Frame numbering
  showFrameNumber: boolean;
  frameNumberStyle: 'total' | 'simple' | 'none';

  // Section numbering
  showSectionNumber: boolean;
  sectionNumberInToc: boolean;

  // Footer customization
  showAuthorInFooter: boolean;
  showTitleInFooter: boolean;
  showDateInFooter: boolean;

  // Advanced options
  incremental: boolean; // Incremental lists (reveal items one by one)
  overlays: boolean; // Enable pause/overlay commands
}

interface BeamerConfigProps {
  projectPath: string;
  onConfigChange?: (config: BeamerConfigOptions) => void;
}

const DEFAULT_CONFIG: BeamerConfigOptions = {
  // Theme options
  theme: 'Madrid',
  colortheme: 'default',
  fonttheme: 'default',
  aspectratio: '169',
  navigation: false,
  showNotes: false,

  // Title page options
  institute: '',
  logo: '',
  titlegraphic: '',

  // TOC options
  showToc: false,
  tocBeforeSection: false,

  // Frame numbering
  showFrameNumber: true,
  frameNumberStyle: 'total',

  // Section numbering
  showSectionNumber: false,
  sectionNumberInToc: false,

  // Footer customization
  showAuthorInFooter: false,
  showTitleInFooter: false,
  showDateInFooter: false,

  // Advanced options
  incremental: false,
  overlays: false,
};

// Beamer themes available
const THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'AnnArbor', label: 'Ann Arbor' },
  { value: 'Antibes', label: 'Antibes' },
  { value: 'Bergen', label: 'Bergen' },
  { value: 'Berkeley', label: 'Berkeley' },
  { value: 'Berlin', label: 'Berlin' },
  { value: 'Boadilla', label: 'Boadilla' },
  { value: 'CambridgeUS', label: 'Cambridge US' },
  { value: 'Copenhagen', label: 'Copenhagen' },
  { value: 'Darmstadt', label: 'Darmstadt' },
  { value: 'Dresden', label: 'Dresden' },
  { value: 'Frankfurt', label: 'Frankfurt' },
  { value: 'Goettingen', label: 'Goettingen' },
  { value: 'Hannover', label: 'Hannover' },
  { value: 'Ilmenau', label: 'Ilmenau' },
  { value: 'JuanLesPins', label: 'Juan Les Pins' },
  { value: 'Luebeck', label: 'Luebeck' },
  { value: 'Madrid', label: 'Madrid (défaut)' },
  { value: 'Malmoe', label: 'Malmoe' },
  { value: 'Marburg', label: 'Marburg' },
  { value: 'Montpellier', label: 'Montpellier' },
  { value: 'PaloAlto', label: 'Palo Alto' },
  { value: 'Pittsburgh', label: 'Pittsburgh' },
  { value: 'Rochester', label: 'Rochester' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Szeged', label: 'Szeged' },
  { value: 'Warsaw', label: 'Warsaw' },
];

const COLOR_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'albatross', label: 'Albatross' },
  { value: 'beaver', label: 'Beaver' },
  { value: 'beetle', label: 'Beetle' },
  { value: 'crane', label: 'Crane' },
  { value: 'dolphin', label: 'Dolphin' },
  { value: 'dove', label: 'Dove' },
  { value: 'fly', label: 'Fly' },
  { value: 'lily', label: 'Lily' },
  { value: 'orchid', label: 'Orchid' },
  { value: 'rose', label: 'Rose' },
  { value: 'seagull', label: 'Seagull' },
  { value: 'seahorse', label: 'Seahorse' },
  { value: 'whale', label: 'Whale' },
  { value: 'wolverine', label: 'Wolverine' },
];

const FONT_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'professionalfonts', label: 'Professional' },
  { value: 'serif', label: 'Serif' },
  { value: 'structurebold', label: 'Structure Bold' },
  { value: 'structureitalicserif', label: 'Structure Italic Serif' },
  { value: 'structuresmallcapsserif', label: 'Structure Small Caps Serif' },
];

export const BeamerConfig: React.FC<BeamerConfigProps> = ({
  projectPath,
  onConfigChange,
}) => {
  const [config, setConfig] = useState<BeamerConfigOptions>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  // Load config from project
  useEffect(() => {
    loadConfig();
  }, [projectPath]);

  const loadConfig = async () => {
    try {
      const configPath = `${projectPath}/beamer-config.json`;
      const exists = await window.electron.fs.exists(configPath);

      if (exists) {
        const content = await window.electron.fs.readFile(configPath);
        const loadedConfig = JSON.parse(content);
        setConfig({ ...DEFAULT_CONFIG, ...loadedConfig });
      }
    } catch (error) {
      console.error('Failed to load Beamer config:', error);
    }
  };

  const saveConfig = async (newConfig: BeamerConfigOptions) => {
    setIsSaving(true);
    try {
      const configPath = `${projectPath}/beamer-config.json`;
      await window.electron.fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    } catch (error) {
      console.error('Failed to save Beamer config:', error);
      alert('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof BeamerConfigOptions, value: any) => {
    const newConfig = { ...config, [key]: value };
    saveConfig(newConfig);
  };

  return (
    <div className="beamer-config">
      <div className="config-header">
        <Settings size={18} />
        <h4>Configuration Beamer</h4>
      </div>

      {/* Theme Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Apparence</h5>

        <div className="config-section">
          <label>Thème principal</label>
          <select
            value={config.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            disabled={isSaving}
          >
            {THEMES.map(theme => (
              <option key={theme.value} value={theme.value}>{theme.label}</option>
            ))}
          </select>
        </div>

        <div className="config-section">
          <label>Thème de couleur</label>
          <select
            value={config.colortheme}
            onChange={(e) => handleChange('colortheme', e.target.value)}
            disabled={isSaving}
          >
            {COLOR_THEMES.map(theme => (
              <option key={theme.value} value={theme.value}>{theme.label}</option>
            ))}
          </select>
        </div>

        <div className="config-section">
          <label>Thème de police</label>
          <select
            value={config.fonttheme}
            onChange={(e) => handleChange('fonttheme', e.target.value)}
            disabled={isSaving}
          >
            {FONT_THEMES.map(theme => (
              <option key={theme.value} value={theme.value}>{theme.label}</option>
            ))}
          </select>
        </div>

        <div className="config-section">
          <label>Format d'écran</label>
          <select
            value={config.aspectratio}
            onChange={(e) => handleChange('aspectratio', e.target.value)}
            disabled={isSaving}
          >
            <option value="43">4:3 (Standard)</option>
            <option value="169">16:9 (Widescreen)</option>
            <option value="1610">16:10</option>
            <option value="149">14:9</option>
            <option value="141">1.41:1</option>
            <option value="54">5:4</option>
            <option value="32">3:2</option>
          </select>
        </div>
      </div>

      {/* Title Page Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Page de titre</h5>

        <div className="config-section">
          <label>Institution (optionnel)</label>
          <input
            type="text"
            value={config.institute || ''}
            onChange={(e) => handleChange('institute', e.target.value)}
            placeholder="Université de..."
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#1e1e1e',
              color: '#ccc',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              fontSize: 'var(--font-size-sm)'
            }}
          />
        </div>

        <div className="config-section">
          <label>Logo (chemin relatif, optionnel)</label>
          <input
            type="text"
            value={config.logo || ''}
            onChange={(e) => handleChange('logo', e.target.value)}
            placeholder="logo.png"
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#1e1e1e',
              color: '#ccc',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              fontSize: 'var(--font-size-sm)'
            }}
          />
        </div>
      </div>

      {/* Table of Contents Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Table des matières</h5>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showToc}
              onChange={(e) => handleChange('showToc', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher la table des matières au début</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.tocBeforeSection}
              onChange={(e) => handleChange('tocBeforeSection', e.target.checked)}
              disabled={isSaving || !config.showToc}
            />
            <span>Afficher la TOC avant chaque section</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.sectionNumberInToc}
              onChange={(e) => handleChange('sectionNumberInToc', e.target.checked)}
              disabled={isSaving || !config.showToc}
            />
            <span>Numéroter les sections dans la TOC</span>
          </label>
        </div>
      </div>

      {/* Numbering Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Numérotation</h5>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showFrameNumber}
              onChange={(e) => handleChange('showFrameNumber', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher les numéros de slides</span>
          </label>
        </div>

        <div className="config-section">
          <label>Style de numérotation</label>
          <select
            value={config.frameNumberStyle}
            onChange={(e) => handleChange('frameNumberStyle', e.target.value)}
            disabled={isSaving || !config.showFrameNumber}
          >
            <option value="total">Avec total (ex: 5/20)</option>
            <option value="simple">Simple (ex: 5)</option>
            <option value="none">Aucun</option>
          </select>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showSectionNumber}
              onChange={(e) => handleChange('showSectionNumber', e.target.checked)}
              disabled={isSaving}
            />
            <span>Numéroter les sections</span>
          </label>
        </div>
      </div>

      {/* Footer Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Pied de page</h5>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showAuthorInFooter}
              onChange={(e) => handleChange('showAuthorInFooter', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher l'auteur</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showTitleInFooter}
              onChange={(e) => handleChange('showTitleInFooter', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher le titre</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showDateInFooter}
              onChange={(e) => handleChange('showDateInFooter', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher la date</span>
          </label>
        </div>
      </div>

      {/* Advanced Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h5 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '0.9rem', fontWeight: 600 }}>Options avancées</h5>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.navigation}
              onChange={(e) => handleChange('navigation', e.target.checked)}
              disabled={isSaving}
            />
            <span>Afficher les symboles de navigation</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showNotes}
              onChange={(e) => handleChange('showNotes', e.target.checked)}
              disabled={isSaving}
            />
            <span>Inclure les notes de présentation dans le PDF</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.incremental}
              onChange={(e) => handleChange('incremental', e.target.checked)}
              disabled={isSaving}
            />
            <span>Listes incrémentales (apparition progressive des items)</span>
          </label>
        </div>

        <div className="config-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.overlays}
              onChange={(e) => handleChange('overlays', e.target.checked)}
              disabled={isSaving}
            />
            <span>Activer les overlays et animations</span>
          </label>
        </div>
      </div>

      {isSaving && (
        <div className="config-saving">
          Sauvegarde...
        </div>
      )}

      <div className="config-info">
        <p><strong>Guide de configuration :</strong></p>

        <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Thèmes</p>
        <ul>
          <li><strong>Madrid, Berlin, Copenhagen</strong> : Professionnels avec barre latérale</li>
          <li><strong>Singapore, Montpellier</strong> : Minimalistes et élégants</li>
          <li><strong>CambridgeUS, Berkeley</strong> : Style académique classique</li>
          <li><strong>Warsaw</strong> : Moderne avec gradients</li>
        </ul>

        <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Logo et images</p>
        <ul>
          <li>Placez vos images dans le dossier du projet</li>
          <li>Utilisez des chemins relatifs : <code style={{ color: '#4ec9b0' }}>logo.png</code> ou <code style={{ color: '#4ec9b0' }}>images/logo.png</code></li>
          <li>Formats supportés : PNG, JPG, PDF</li>
        </ul>

        <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Table des matières</p>
        <ul>
          <li><strong>TOC au début</strong> : Une page récapitulative de toutes les sections</li>
          <li><strong>TOC avant chaque section</strong> : Rappel du plan à chaque nouvelle section</li>
          <li>Numérotation optionnelle des sections</li>
        </ul>

        <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Options avancées</p>
        <ul>
          <li><strong>Listes incrémentales</strong> : Les items apparaissent un par un lors de la présentation</li>
          <li><strong>Overlays</strong> : Active les commandes <code style={{ color: '#4ec9b0' }}>\pause</code> et les animations</li>
          <li><strong>Notes</strong> : Syntaxe <code style={{ color: '#4ec9b0' }}>::: notes ... :::</code> pour notes de présentateur</li>
        </ul>
      </div>
    </div>
  );
};
