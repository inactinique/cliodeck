# Implémentation de l'internationalisation (i18n)

## ✅ Ce qui a été implémenté

Votre application mdFocus supporte maintenant **3 langues** :
- 🇫🇷 Français (langue par défaut)
- 🇬🇧 Anglais
- 🇩🇪 Allemand

### Architecture mise en place

#### 1. **Renderer Process (React)**
- ✅ **i18next + react-i18next** installés
- ✅ Configuration dans [src/renderer/src/i18n.ts](src/renderer/src/i18n.ts)
- ✅ Store Zustand pour la gestion de la langue : [src/renderer/src/stores/languageStore.ts](src/renderer/src/stores/languageStore.ts)
- ✅ Sélecteur de langue dans les paramètres : [src/renderer/src/components/Config/LanguageConfigSection.tsx](src/renderer/src/components/Config/LanguageConfigSection.tsx)

#### 2. **Main Process (Electron)**
- ✅ Système de traduction pour les menus : [src/main/i18n.ts](src/main/i18n.ts)
- ✅ Synchronisation avec le renderer via IPC
- ✅ Menu adapté pour utiliser les traductions (début de migration montré)

#### 3. **Fichiers de traduction**
```
public/locales/
├── fr/
│   ├── common.json    # Traductions générales
│   └── menu.json      # Traductions des menus
├── en/
│   ├── common.json
│   └── menu.json
└── de/
    ├── common.json
    └── menu.json
```

### Composants migrés (exemples)

✅ **Paramètres**
- [SettingsModal.tsx](src/renderer/src/components/Config/SettingsModal.tsx) - Titre
- [ConfigPanel.tsx](src/renderer/src/components/Config/ConfigPanel.tsx) - Messages de sauvegarde
- [UIConfigSection.tsx](src/renderer/src/components/Config/UIConfigSection.tsx) - Complet
- [EditorConfigSection.tsx](src/renderer/src/components/Config/EditorConfigSection.tsx) - Labels principaux
- [LanguageConfigSection.tsx](src/renderer/src/components/Config/LanguageConfigSection.tsx) - Nouveau composant

✅ **Menu principal** (début)
- [src/main/menu.ts](src/main/menu.ts:1-58) - Les premiers menus (File, Settings) sont migrés comme exemple

---

## 🔧 Comment utiliser i18n dans vos composants

### Dans un composant React

```tsx
import { useTranslation } from 'react-i18next';

export const MonComposant: React.FC = () => {
  const { t } = useTranslation('common'); // 'common' ou 'menu'

  return (
    <div>
      <h1>{t('settings.title')}</h1>
      <button>{t('actions.save')}</button>
    </div>
  );
};
```

### Ajouter une nouvelle traduction

1. **Ajoutez la clé dans les 3 fichiers JSON** :

```json
// public/locales/fr/common.json
{
  "myFeature": {
    "title": "Mon titre en français",
    "description": "Ma description"
  }
}
```

```json
// public/locales/en/common.json
{
  "myFeature": {
    "title": "My title in English",
    "description": "My description"
  }
}
```

```json
// public/locales/de/common.json
{
  "myFeature": {
    "title": "Mein Titel auf Deutsch",
    "description": "Meine Beschreibung"
  }
}
```

2. **Utilisez la clé dans votre composant** :
```tsx
<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

---

## 📋 Travail restant pour une migration complète

### Composants du renderer à migrer

Les composants suivants contiennent encore des textes en dur à migrer :

#### Priorité haute (UI visible)
- [ ] `BibliographyPanel.tsx` - Panneau bibliographie
- [ ] `ProjectPanel.tsx` - Panneau projets
- [ ] `PDFExportModal.tsx` - Modal d'export PDF (~115 chaînes)
- [ ] `MarkdownEditor.tsx` - Éditeur markdown

#### Priorité moyenne
- [ ] `RAGConfigSection.tsx` - Configuration RAG
- [ ] `LLMConfigSection.tsx` - Configuration LLM
- [ ] `ZoteroConfigSection.tsx` - Configuration Zotero
- [ ] `SuggestionsConfigSection.tsx` - Configuration suggestions
- [ ] `ActionsSection.tsx` - Section actions

#### Autres composants
- [ ] Chat, Corpus, PDFIndex et autres composants...

### Menu principal à finaliser

Le fichier [src/main/menu.ts](src/main/menu.ts) nécessite de remplacer tous les labels hardcodés par `t('cle')`.

**Exemple de migration** (déjà fait pour les premiers menus) :
```typescript
// Avant
label: 'Nouveau fichier'

// Après
label: t('newFile')
```

**Labels à migrer** :
- [ ] Tous les items du menu "Édition" (lignes 103-189)
- [ ] Tous les items du menu "Affichage" (lignes 192-250)
- [ ] Tous les items du menu "Bibliographie" (lignes 252-278)
- [ ] Tous les items du menu "Fenêtre" (lignes 280-295)
- [ ] Tous les items du menu "Aide" (lignes 297-323)

**Note** : Toutes les clés nécessaires sont déjà dans [public/locales/*/menu.json](public/locales/fr/menu.json).

---

## 🎯 Comment l'utilisateur change de langue

1. L'utilisateur ouvre les **Paramètres** (Cmd/Ctrl+,)
2. La section **"Langue"** apparaît en haut
3. Il sélectionne la langue souhaitée dans le menu déroulant
4. ✨ **Changement instantané** :
   - L'interface React est mise à jour immédiatement
   - Les menus Electron sont reconstruits avec la nouvelle langue
   - La préférence est sauvegardée dans la configuration

---

## 🚀 Tester l'implémentation

```bash
# Installer les dépendances (déjà fait)
npm install

# Lancer l'application
npm start

# Ouvrir les Paramètres et changer la langue
# Vérifier que les textes changent dans :
# - Le titre du modal "Paramètres"
# - La section "Interface utilisateur"
# - Les menus "Fichier" et "Settings" (début de migration)
```

---

## 📝 Notes importantes

- **Détection automatique** : Au premier lancement, la langue du système est détectée (si supportée)
- **Fallback** : Si une traduction manque, la clé s'affiche (ex: "settings.title")
- **TypeScript** : Les types sont bien définis pour `SupportedLanguage` ('fr' | 'en' | 'de')
- **Performance** : Les traductions sont chargées au démarrage, aucun délai lors du changement

---

## 🛠️ Structure technique

### Flux de changement de langue

```
Utilisateur sélectionne langue
         ↓
LanguageConfigSection appelle setLanguage()
         ↓
LanguageStore met à jour:
  1. i18next (renderer)
  2. Configuration Electron Store
  3. IPC → Main Process
         ↓
Main Process:
  1. setLanguage() dans src/main/i18n.ts
  2. Reconstruit le menu avec nouvelles traductions
```

### Communication IPC

```typescript
// Renderer → Main
window.electron.ipcRenderer.send('language-changed', language)

// Main écoute
ipcMain.on('language-changed', (_event, language) => {
  setLanguage(language);
  setupApplicationMenu(mainWindow);
});
```

---

## ✅ Prochaines étapes suggérées

1. **Migrer PDFExportModal** - C'est le composant avec le plus de textes (~115)
2. **Finaliser les menus** - Remplacer tous les labels par `t('cle')`
3. **Migrer les panneaux** - Bibliography, Project, Chat, etc.
4. **Ajouter des tests** - Vérifier que toutes les clés existent dans les 3 langues

---

Besoin d'aide pour migrer un composant spécifique ? Demandez-moi ! 🚀
