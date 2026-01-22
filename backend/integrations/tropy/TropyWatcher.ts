import * as fs from 'fs';
import { EventEmitter } from 'events';

// MARK: - Types

export interface TropyWatcherEvents {
  change: (tpyPath: string) => void;
  error: (error: Error) => void;
}

export interface TropyWatcherOptions {
  debounceMs?: number;
}

// MARK: - TropyWatcher

/**
 * Watcher pour les fichiers Tropy (.tpy)
 * Surveille les modifications du fichier et émet des événements
 * avec un debounce pour éviter les faux positifs.
 *
 * IMPORTANT: Ce watcher ne modifie JAMAIS le fichier .tpy.
 * Il observe uniquement les changements effectués par Tropy.
 */
export class TropyWatcher extends EventEmitter {
  private tpyPath: string | null = null;
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastMtime: number = 0;
  private isWatching: boolean = false;

  // Debounce par défaut de 2 secondes pour éviter les faux positifs
  // (Tropy peut faire plusieurs écritures rapprochées)
  private readonly debounceMs: number;

  constructor(options?: TropyWatcherOptions) {
    super();
    this.debounceMs = options?.debounceMs ?? 2000;
  }

  /**
   * Démarre la surveillance d'un fichier .tpy
   * @param tpyPath Chemin vers le fichier .tpy à surveiller
   */
  watch(tpyPath: string): void {
    // Arrêter la surveillance précédente si active
    if (this.isWatching) {
      this.unwatch();
    }

    if (!fs.existsSync(tpyPath)) {
      this.emit('error', new Error(`Tropy project not found: ${tpyPath}`));
      return;
    }

    this.tpyPath = tpyPath;

    // Enregistrer le mtime initial
    try {
      const stats = fs.statSync(tpyPath);
      this.lastMtime = stats.mtimeMs;
    } catch (error) {
      this.emit('error', new Error(`Failed to get file stats: ${error}`));
      return;
    }

    // Créer le watcher
    try {
      this.watcher = fs.watch(tpyPath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          this.handleChange();
        }
      });

      this.watcher.on('error', (error) => {
        this.emit('error', error);
      });

      this.isWatching = true;
      console.log(`👁️ Watching Tropy project: ${tpyPath}`);
    } catch (error) {
      this.emit('error', new Error(`Failed to start watcher: ${error}`));
    }
  }

  /**
   * Arrête la surveillance
   */
  unwatch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.tpyPath) {
      console.log(`👁️ Stopped watching: ${this.tpyPath}`);
    }

    this.tpyPath = null;
    this.isWatching = false;
    this.lastMtime = 0;
  }

  /**
   * Vérifie si le watcher est actif
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Retourne le chemin surveillé
   */
  getWatchedPath(): string | null {
    return this.tpyPath;
  }

  /**
   * Force une vérification manuelle des changements
   * Utile si on veut déclencher une sync sans attendre un changement de fichier
   */
  forceCheck(): void {
    if (this.tpyPath) {
      this.emit('change', this.tpyPath);
    }
  }

  // MARK: - Private Methods

  private handleChange(): void {
    // Annuler le timer précédent si présent (debounce)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Attendre le délai de debounce avant de vérifier le changement
    this.debounceTimer = setTimeout(() => {
      this.checkAndEmitChange();
    }, this.debounceMs);
  }

  private checkAndEmitChange(): void {
    if (!this.tpyPath) return;

    try {
      // Vérifier le mtime réel pour éviter les faux positifs
      const stats = fs.statSync(this.tpyPath);
      const currentMtime = stats.mtimeMs;

      if (currentMtime > this.lastMtime) {
        this.lastMtime = currentMtime;
        console.log(`📝 Tropy project changed: ${this.tpyPath}`);
        this.emit('change', this.tpyPath);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to check file change: ${error}`));
    }
  }
}

// MARK: - Factory

/**
 * Crée un nouveau TropyWatcher
 */
export function createTropyWatcher(options?: TropyWatcherOptions): TropyWatcher {
  return new TropyWatcher(options);
}
