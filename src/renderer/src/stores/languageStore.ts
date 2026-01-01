import { create } from 'zustand'
import i18n from '../i18n'
import type { SupportedLanguage } from '../i18n'

interface LanguageState {
  currentLanguage: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => Promise<void>
  initializeLanguage: () => Promise<void>
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: 'fr',

  setLanguage: async (language: SupportedLanguage) => {
    try {
      console.log('[Language Store] Changing language to:', language)

      // Changer la langue dans i18next
      await i18n.changeLanguage(language)
      console.log('[Language Store] i18n language changed to:', i18n.language)

      // Sauvegarder dans la configuration
      await window.electron.config.set('language', language)

      // Mettre à jour le store
      set({ currentLanguage: language })

      // Notifier le main process pour mettre à jour les menus
      window.electron.ipcRenderer.send('language-changed', language)
      console.log('[Language Store] Language change complete')
    } catch (error) {
      console.error('Error changing language:', error)
    }
  },

  initializeLanguage: async () => {
    try {
      console.log('[Language Store] Initializing language...')
      console.log('[Language Store] Current i18n language:', i18n.language)

      // Charger la langue depuis la configuration
      const savedLanguage = await window.electron.config.get('language')
      console.log('[Language Store] Saved language from config:', savedLanguage)

      if (savedLanguage && ['fr', 'en', 'de'].includes(savedLanguage)) {
        console.log('[Language Store] Applying saved language:', savedLanguage)
        await i18n.changeLanguage(savedLanguage)
        set({ currentLanguage: savedLanguage as SupportedLanguage })
        console.log('[Language Store] Language initialized to:', i18n.language)
      } else {
        // Détecter la langue du système
        const systemLanguage = navigator.language.split('-')[0]
        const language = (['fr', 'en', 'de'].includes(systemLanguage)
          ? systemLanguage
          : 'fr') as SupportedLanguage

        console.log('[Language Store] Using detected language:', language)
        await i18n.changeLanguage(language)
        set({ currentLanguage: language })
        console.log('[Language Store] Language initialized to:', i18n.language)
      }
    } catch (error) {
      console.error('Error initializing language:', error)
    }
  }
}))
