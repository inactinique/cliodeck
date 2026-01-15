# Rapport de Migration i18n - ClioDesk v1.0

Ce document détaille toutes les modifications nécessaires pour compléter l'internationalisation de ClioDesk.

**Date:** 2026-01-11
**Version cible:** 1.0.0
**Langues supportées:** Français (FR), Anglais (EN), Allemand (DE)

---

## 1. Vue d'ensemble

### État actuel
- ✅ i18next configuré et fonctionnel
- ✅ 3 langues supportées (fr, en, de)
- ✅ 2 namespaces (common, menu)
- ✅ ~42 clés de traduction existantes
- ❌ ~50+ chaînes de caractères en dur (hardcoded)
- ❌ Plusieurs composants critiques non traduits

### Objectifs
1. Ajouter toutes les clés manquantes aux fichiers de traduction
2. Remplacer tous les textes en dur par des appels à `t()`
3. Assurer une traduction complète FR/EN/DE

---

## 2. Clés de traduction à ajouter

### 2.1 Section Language (LanguageConfigSection)

**Fichier:** `src/renderer/src/components/Config/LanguageConfigSection.tsx`

| Clé | FR | EN | DE |
|-----|----|----|-----|
| `settings.languageSelector.label` | "Choisir la langue de l'interface" | "Choose the interface language" | "Wählen Sie die Sprache der Benutzeroberfläche" |
| `settings.languageSelector.changeWarning` | "La langue sera appliquée au prochain redémarrage de l'application." | "The language will be applied on next application restart." | "Die Sprache wird beim nächsten Neustart der Anwendung angewendet." |
| `settings.languageSelector.fr` | "Français" | "French" | "Französisch" |
| `settings.languageSelector.en` | "Anglais" | "English" | "Englisch" |
| `settings.languageSelector.de` | "Allemand" | "German" | "Deutsch" |

---

### 2.2 Section Actions (ActionsSection)

**Fichier:** `src/renderer/src/components/Config/ActionsSection.tsx`

| Clé | FR | EN | DE |
|-----|----|----|-----|
| `actions.title` | "Actions" | "Actions" | "Aktionen" |
| `actions.dangerZone` | "Zone dangereuse" | "Danger Zone" | "Gefahrenzone" |
| `actions.purgeDatabase.title` | "Purger la base de données" | "Purge Database" | "Datenbank löschen" |
| `actions.purgeDatabase.description` | "Supprime tous les chunks vectoriels et réinitialise les index. Les PDFs devront être réindexés." | "Deletes all vector chunks and resets indexes. PDFs will need to be reindexed." | "Löscht alle Vektor-Chunks und setzt Indizes zurück. PDFs müssen neu indiziert werden." |
| `actions.purgeDatabase.button` | "Purger la base" | "Purge Database" | "Datenbank löschen" |
| `actions.purgeDatabase.confirmTitle` | "⚠️ ATTENTION - Action irréversible" | "⚠️ WARNING - Irreversible action" | "⚠️ WARNUNG - Unwiderrufliche Aktion" |
| `actions.purgeDatabase.confirmMessage` | "Cette action va :\n\n• Supprimer TOUS les embeddings vectoriels\n• Supprimer TOUS les chunks de texte\n• Détruire les index HNSW et BM25\n• Réinitialiser complètement la base vectorielle\n\nVous devrez réindexer TOUS vos PDFs.\n\nTapez 'PURGER' pour confirmer :" | "This action will:\n\n• Delete ALL vector embeddings\n• Delete ALL text chunks\n• Destroy HNSW and BM25 indexes\n• Completely reset the vector database\n\nYou will need to reindex ALL your PDFs.\n\nType 'PURGE' to confirm:" | "Diese Aktion wird:\n\n• ALLE Vektor-Embeddings löschen\n• ALLE Text-Chunks löschen\n• HNSW- und BM25-Indizes zerstören\n• Die Vektordatenbank vollständig zurücksetzen\n\nSie müssen ALLE Ihre PDFs neu indizieren.\n\nGeben Sie 'LÖSCHEN' ein, um zu bestätigen:" |
| `actions.purgeDatabase.finalConfirm` | "Dernière confirmation: Cette action est IRRÉVERSIBLE. Continuer ?" | "Final confirmation: This action is IRREVERSIBLE. Continue?" | "Letzte Bestätigung: Diese Aktion ist UNWIDERRUFLICH. Fortfahren?" |
| `actions.purgeDatabase.purging` | "Purge en cours..." | "Purging..." | "Wird gelöscht..." |
| `actions.purgeDatabase.success` | "Base de données purgée avec succès" | "Database purged successfully" | "Datenbank erfolgreich gelöscht" |
| `actions.purgeDatabase.error` | "Erreur lors de la purge" | "Error during purge" | "Fehler beim Löschen" |
| `actions.purgeDatabase.cancelledNoMatch` | "Purge annulée (texte de confirmation incorrect)" | "Purge cancelled (incorrect confirmation text)" | "Löschen abgebrochen (falscher Bestätigungstext)" |
| `actions.purgeDatabase.cancelled` | "Purge annulée" | "Purge cancelled" | "Löschen abgebrochen" |
| `actions.rebuildIndexes.title` | "Reconstruire les index" | "Rebuild Indexes" | "Indizes neu erstellen" |
| `actions.rebuildIndexes.description` | "Reconstruit les index HNSW et BM25 depuis la base SQLite existante. Utile si les index sont corrompus." | "Rebuilds HNSW and BM25 indexes from existing SQLite database. Useful if indexes are corrupted." | "Erstellt HNSW- und BM25-Indizes aus vorhandener SQLite-Datenbank neu. Nützlich bei beschädigten Indizes." |
| `actions.rebuildIndexes.button` | "Reconstruire" | "Rebuild" | "Neu erstellen" |
| `actions.rebuildIndexes.rebuilding` | "Reconstruction..." | "Rebuilding..." | "Wird neu erstellt..." |
| `actions.rebuildIndexes.success` | "Index reconstruits avec succès" | "Indexes rebuilt successfully" | "Indizes erfolgreich neu erstellt" |
| `actions.rebuildIndexes.error` | "Erreur lors de la reconstruction" | "Error during rebuild" | "Fehler beim Neuerstellen" |
| `actions.optimizeDatabase.title` | "Optimiser la base de données" | "Optimize Database" | "Datenbank optimieren" |
| `actions.optimizeDatabase.description` | "Compacte la base SQLite et optimise les performances. Recommandé après suppression de nombreux documents." | "Compacts SQLite database and optimizes performance. Recommended after deleting many documents." | "Komprimiert SQLite-Datenbank und optimiert die Leistung. Empfohlen nach dem Löschen vieler Dokumente." |
| `actions.optimizeDatabase.button` | "Optimiser" | "Optimize" | "Optimieren" |
| `actions.optimizeDatabase.optimizing` | "Optimisation..." | "Optimizing..." | "Wird optimiert..." |
| `actions.optimizeDatabase.success` | "Base optimisée. Gain: {{saved}}" | "Database optimized. Saved: {{saved}}" | "Datenbank optimiert. Gespart: {{saved}}" |
| `actions.optimizeDatabase.error` | "Erreur lors de l'optimisation" | "Error during optimization" | "Fehler bei der Optimierung" |
| `actions.exportData.title` | "Exporter les données" | "Export Data" | "Daten exportieren" |
| `actions.exportData.description` | "Exporte la configuration et les métadonnées du projet (pas les PDFs)." | "Exports project configuration and metadata (not PDFs)." | "Exportiert Projektkonfiguration und Metadaten (keine PDFs)." |
| `actions.exportData.button` | "Exporter" | "Export" | "Exportieren" |
| `actions.importData.title` | "Importer les données" | "Import Data" | "Daten importieren" |
| `actions.importData.description` | "Importe une configuration depuis un export précédent." | "Imports configuration from a previous export." | "Importiert Konfiguration aus einem früheren Export." |
| `actions.importData.button` | "Importer" | "Import" | "Importieren" |

---

### 2.3 Section Zotero Import (ZoteroImport)

**Fichier:** `src/renderer/src/components/Bibliography/ZoteroImport.tsx`

| Clé | FR | EN | DE |
|-----|----|----|-----|
| `zotero.import.title` | "Import depuis Zotero" | "Import from Zotero" | "Aus Zotero importieren" |
| `zotero.import.notConfigured` | "Zotero n'est pas configuré" | "Zotero is not configured" | "Zotero ist nicht konfiguriert" |
| `zotero.import.configureFirst` | "Veuillez d'abord configurer votre connexion Zotero dans les paramètres." | "Please configure your Zotero connection in settings first." | "Bitte konfigurieren Sie zuerst Ihre Zotero-Verbindung in den Einstellungen." |
| `zotero.import.goToSettings` | "Aller aux paramètres" | "Go to Settings" | "Zu den Einstellungen" |
| `zotero.import.loading` | "Chargement des collections Zotero..." | "Loading Zotero collections..." | "Lade Zotero-Sammlungen..." |
| `zotero.import.loadError` | "Erreur lors du chargement des collections Zotero" | "Error loading Zotero collections" | "Fehler beim Laden der Zotero-Sammlungen" |
| `zotero.import.selectCollection` | "Sélectionner une collection" | "Select a collection" | "Sammlung auswählen" |
| `zotero.import.selectPlaceholder` | "Choisir une collection..." | "Choose a collection..." | "Sammlung wählen..." |
| `zotero.import.options` | "Options d'import" | "Import Options" | "Importoptionen" |
| `zotero.import.downloadPDFs` | "Télécharger les PDFs attachés" | "Download attached PDFs" | "Angehängte PDFs herunterladen" |
| `zotero.import.indexPDFs` | "Indexer automatiquement les PDFs" | "Automatically index PDFs" | "PDFs automatisch indizieren" |
| `zotero.import.mergeBibliography` | "Fusionner avec la bibliographie existante" | "Merge with existing bibliography" | "Mit vorhandener Bibliografie zusammenführen" |
| `zotero.import.startImport` | "Démarrer l'import" | "Start Import" | "Import starten" |
| `zotero.import.importing` | "Import en cours..." | "Importing..." | "Wird importiert..." |
| `zotero.import.fetchingMetadata` | "Récupération des métadonnées ({{current}}/{{total}})" | "Fetching metadata ({{current}}/{{total}})" | "Abrufen von Metadaten ({{current}}/{{total}})" |
| `zotero.import.downloadingPDFs` | "Téléchargement des PDFs ({{current}}/{{total}})" | "Downloading PDFs ({{current}}/{{total}})" | "Herunterladen von PDFs ({{current}}/{{total}})" |
| `zotero.import.indexingPDFs` | "Indexation des PDFs ({{current}}/{{total}})" | "Indexing PDFs ({{current}}/{{total}})" | "Indizieren von PDFs ({{current}}/{{total}})" |
| `zotero.import.successTitle` | "✅ Import réussi!" | "✅ Import successful!" | "✅ Import erfolgreich!" |
| `zotero.import.successMessage` | "**{{items}} références** importées\n**{{pdfs}} PDFs** téléchargés\n**{{indexed}} documents** indexés" | "**{{items}} references** imported\n**{{pdfs}} PDFs** downloaded\n**{{indexed}} documents** indexed" | "**{{items}} Referenzen** importiert\n**{{pdfs}} PDFs** heruntergeladen\n**{{indexed}} Dokumente** indiziert" |
| `zotero.import.errorTitle` | "❌ Erreur lors de l'import" | "❌ Import error" | "❌ Importfehler" |
| `zotero.import.close` | "Fermer" | "Close" | "Schließen" |

---

### 2.4 Section Chat Interface (ChatInterface)

**Fichier:** `src/renderer/src/components/Chat/ChatInterface.tsx`

| Clé | FR | EN | DE |
|-----|----|----|-----|
| `chat.aiAssistant` | "Assistant IA" | "AI Assistant" | "KI-Assistent" |
| `chat.helpText` | "L'assistant utilise RAG (Retrieval-Augmented Generation) pour répondre à vos questions en se basant sur les documents PDF indexés." | "The assistant uses RAG (Retrieval-Augmented Generation) to answer your questions based on indexed PDF documents." | "Der Assistent verwendet RAG (Retrieval-Augmented Generation), um Ihre Fragen basierend auf indizierten PDF-Dokumenten zu beantworten." |
| `chat.emptyState.title` | "Aucun document indexé" | "No indexed documents" | "Keine indizierten Dokumente" |
| `chat.emptyState.message` | "L'assistant recherchera dans vos PDFs indexés pour répondre à vos questions.\n\nIndexez des PDFs pour commencer." | "The assistant will search through your indexed PDFs to answer your questions.\n\nIndex PDFs to get started." | "Der Assistent durchsucht Ihre indizierten PDFs, um Ihre Fragen zu beantworten.\n\nIndizieren Sie PDFs, um zu beginnen." |

---

### 2.5 Section Editor Config (EditorConfigSection)

**Fichier:** `src/renderer/src/components/Config/EditorConfigSection.tsx`

Les clés suivantes existent déjà dans common.json, mais les textes d'aide ne sont pas tous utilisés. À vérifier et compléter si nécessaire.

✅ Déjà présent:
- `editor.fontSizeHelp`
- `editor.currentSize`
- `editor.appliesToEditor`
- `editor.wordWrapHelp`
- `editor.minimapHelp`
- `editor.fontFamilyHelp`
- `editor.fontSystem`
- `editor.fontNote`

---

### 2.6 Section Citation Card (CitationCard)

**Fichier:** `src/renderer/src/components/Bibliography/CitationCard.tsx`

| Clé | FR | EN | DE |
|-----|----|----|-----|
| `bibliography.pdfIndexed` | "PDF indexé:" | "PDF indexed:" | "PDF indiziert:" |
| `bibliography.indexError` | "Erreur:" | "Error:" | "Fehler:" |
| `bibliography.viewDetails` | "Voir détails" | "View details" | "Details anzeigen" |
| `bibliography.copyKey` | "Copier la clé" | "Copy key" | "Schlüssel kopieren" |
| `bibliography.indexPDF` | "Indexer le PDF" | "Index PDF" | "PDF indizieren" |
| `bibliography.openPDF` | "Ouvrir le PDF" | "Open PDF" | "PDF öffnen" |
| `bibliography.keyCopied` | "Clé copiée!" | "Key copied!" | "Schlüssel kopiert!" |

---

## 3. Modifications des composants

### 3.1 LanguageConfigSection.tsx

**Lignes à modifier:** 24-26, 42-44

**Avant:**
```typescript
const languageLabels = {
  fr: currentLang === 'fr' ? 'Choisir la langue...' :
      currentLang === 'en' ? 'Choose the interface...' : 'Wählen Sie...',
  // ...
};
```

**Après:**
```typescript
const languageLabels = {
  fr: t('settings.languageSelector.fr'),
  en: t('settings.languageSelector.en'),
  de: t('settings.languageSelector.de')
};
```

**Et remplacer:**
```typescript
<p className="language-note">
  {currentLang === 'fr'
    ? 'La langue sera appliquée au prochain redémarrage de l\'application.'
    : currentLang === 'en'
      ? 'Language will be applied on next application restart.'
      : 'Die Sprache wird beim nächsten Neustart der Anwendung angewendet.'}
</p>
```

**Par:**
```typescript
<p className="language-note">
  {t('settings.languageSelector.changeWarning')}
</p>
```

---

### 3.2 ActionsSection.tsx

**Actions requises:**
1. Ajouter `const { t } = useTranslation('common');` en haut du composant
2. Remplacer tous les textes en dur par des appels `t()`

**Exemples de remplacement:**

Ligne 28-37:
```typescript
// Avant
const userConfirmation = prompt(
  `⚠️ ATTENTION - Action irréversible\n\n` +
  `Cette action va :\n\n` +
  `• Supprimer TOUS les embeddings vectoriels\n` +
  // ...
);

// Après
const userConfirmation = prompt(t('actions.purgeDatabase.confirmMessage'));
```

---

### 3.3 ZoteroImport.tsx

**Actions requises:**
1. Ajouter `const { t } = useTranslation('common');` en haut du composant
2. Remplacer tous les `alert()` et textes en dur

**Exemples:**

Ligne 47:
```typescript
// Avant
alert("Zotero n'est pas configuré...");

// Après
alert(t('zotero.import.notConfigured') + '\n' + t('zotero.import.configureFirst'));
```

Ligne 129:
```typescript
// Avant
setResultMessage(
  `✅ Import réussi!\n\n` +
  `**${imported.items} références** importées\n` +
  // ...
);

// Après
setResultMessage(
  t('zotero.import.successTitle') + '\n\n' +
  t('zotero.import.successMessage', {
    items: imported.items,
    pdfs: imported.pdfs,
    indexed: imported.indexed
  })
);
```

---

### 3.4 ChatInterface.tsx

**Actions requises:**
1. Le composant utilise déjà `useTranslation`
2. Remplacer les textes en dur lignes 56, 58, 78-79

**Exemples:**

Ligne 56:
```typescript
// Avant
<h2>Assistant IA</h2>

// Après
<h2>{t('chat.aiAssistant')}</h2>
```

Ligne 58:
```typescript
// Avant
<p className="chat-help">
  L'assistant utilise RAG (Retrieval-Augmented Generation) pour...
</p>

// Après
<p className="chat-help">
  {t('chat.helpText')}
</p>
```

---

### 3.5 CitationCard.tsx

**Actions requises:**
1. Ajouter `import { useTranslation } from 'react-i18next';`
2. Ajouter `const { t } = useTranslation('common');`
3. Remplacer les textes des boutons et alertes

---

## 4. Fichiers de traduction à modifier

### 4.1 Structure finale des fichiers

Chaque fichier (`fr/common.json`, `en/common.json`, `de/common.json`) doit contenir:

```json
{
  "app": { ... },
  "actions": {
    // Clés existantes +
    // Nouvelles clés (ActionsSection)
  },
  "settings": {
    // Clés existantes +
    "languageSelector": {
      "label": "...",
      "changeWarning": "...",
      "fr": "...",
      "en": "...",
      "de": "..."
    }
  },
  "editor": { ... }, // Déjà complet
  "ui": { ... }, // Déjà complet
  "bibliography": {
    // Clés existantes +
    "pdfIndexed": "...",
    "indexError": "...",
    // etc.
  },
  "project": { ... },
  "export": { ... },
  "rag": { ... },
  "llm": { ... },
  "zotero": {
    // Clés existantes +
    "import": {
      "title": "...",
      "notConfigured": "...",
      // etc.
    }
  },
  "suggestions": { ... },
  "chat": {
    // Clés existantes +
    "aiAssistant": "...",
    "helpText": "...",
    "emptyState": {
      "title": "...",
      "message": "..."
    }
  },
  "corpus": { ... },
  "toolbar": { ... }
}
```

---

## 5. Plan d'exécution

### Phase 1: Ajout des clés de traduction
1. ✅ Mettre à jour `public/locales/fr/common.json`
2. ✅ Mettre à jour `public/locales/en/common.json`
3. ✅ Mettre à jour `public/locales/de/common.json`

### Phase 2: Modification des composants
1. ✅ `LanguageConfigSection.tsx`
2. ✅ `ActionsSection.tsx`
3. ✅ `ZoteroImport.tsx`
4. ✅ `ChatInterface.tsx`
5. ✅ `CitationCard.tsx`

### Phase 3: Tests
1. Tester le changement de langue (FR → EN → DE)
2. Vérifier tous les composants modifiés
3. Vérifier qu'aucun texte en dur ne subsiste

---

## 6. Composants à vérifier après migration

### Composants déjà traduits (à vérifier)
- [x] `ConfigPanel.tsx`
- [x] `SettingsModal.tsx`
- [x] `EditorConfigSection.tsx`
- [x] `UIConfigSection.tsx`
- [x] `BibliographyPanel.tsx`
- [x] `ProjectPanel.tsx`
- [x] `EditorPanel.tsx`
- [x] `MessageInput.tsx`
- [x] `MessageBubble.tsx`
- [x] `SourceCard.tsx`

### Nouveaux composants à traduire
- [ ] `LanguageConfigSection.tsx`
- [ ] `ActionsSection.tsx`
- [ ] `ZoteroImport.tsx`
- [ ] `ChatInterface.tsx`
- [ ] `CitationCard.tsx`

---

## 7. Checklist de validation

- [ ] Tous les textes hardcodés sont remplacés par `t()`
- [ ] Les 3 fichiers de traduction (fr, en, de) ont les mêmes clés
- [ ] Le changement de langue fonctionne sans redémarrage
- [ ] Les interpolations de variables fonctionnent (ex: `{{size}}`, `{{items}}`)
- [ ] Les textes multilignes sont correctement gérés
- [ ] Les confirmations et alertes sont traduites
- [ ] Aucune console warning i18next manquante

---

## 8. Notes techniques

### Interpolation de variables
```typescript
// FR
"success": "Base optimisée. Gain: {{saved}}"

// Utilisation
t('actions.optimizeDatabase.success', { saved: '10 MB' })
```

### Textes multilignes
```typescript
// Dans JSON
"message": "Ligne 1\n\nLigne 2\nLigne 3"

// Ou utiliser concat
t('zotero.import.successTitle') + '\n\n' + t('zotero.import.successMessage')
```

### Pluralisation (future amélioration)
i18next supporte la pluralisation nativement:
```json
"items": "{{count}} référence",
"items_plural": "{{count}} références"
```

---

**Statut:** ⏳ En cours de migration
**Dernière mise à jour:** 2026-01-11
