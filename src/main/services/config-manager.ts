// @ts-nocheck
import type { AppConfig, LLMConfig, RAGConfig } from '../../../backend/types/config.js';
import { DEFAULT_CONFIG } from '../../../backend/types/config.js';

export class ConfigManager {
  private store: any;
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;

    // Dynamic import pour electron-store (ES module)
    const { default: Store } = await import('electron-store');

    this.store = new Store<AppConfig>({
      defaults: DEFAULT_CONFIG,
      name: 'mdfocus-config',
      projectName: 'mdfocus-electron',
    });

    this.initialized = true;
    console.log('✅ ConfigManager initialized');
    console.log(`   Config path: ${this.store.path}`);
  }

  // Getter générique
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  // Setter générique
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
    console.log(`✅ Config updated: ${key}`);
  }

  // Méthodes spécifiques LLM
  getLLMConfig(): LLMConfig {
    return this.store.get('llm');
  }

  setLLMConfig(config: Partial<LLMConfig>): void {
    const current = this.getLLMConfig();
    this.store.set('llm', { ...current, ...config });
    console.log('✅ LLM config updated');
  }

  // Méthodes spécifiques RAG
  getRAGConfig(): RAGConfig {
    return this.store.get('rag');
  }

  setRAGConfig(config: Partial<RAGConfig>): void {
    const current = this.getRAGConfig();
    this.store.set('rag', { ...current, ...config });
    console.log('✅ RAG config updated');
  }

  // Gestion des projets récents
  getRecentProjects(): string[] {
    return this.store.get('recentProjects');
  }

  addRecentProject(projectPath: string): void {
    const recent = this.getRecentProjects();
    // Ajouter en premier, supprimer les doublons, garder max 10
    const updated = [
      projectPath,
      ...recent.filter((p) => p !== projectPath),
    ].slice(0, 10);
    this.store.set('recentProjects', updated);
    console.log(`✅ Added recent project: ${projectPath}`);
  }

  removeRecentProject(projectPath: string): void {
    const recent = this.getRecentProjects();
    this.store.set('recentProjects', recent.filter((p) => p !== projectPath));
    console.log(`✅ Removed recent project: ${projectPath}`);
  }

  // Reset à la config par défaut
  reset(): void {
    this.store.clear();
    console.log('✅ Config reset to defaults');
  }

  // Obtenir toute la config
  getAll(): AppConfig {
    return this.store.store;
  }
}

// Instance singleton (nécessite init() avant utilisation)
export const configManager = new ConfigManager();
