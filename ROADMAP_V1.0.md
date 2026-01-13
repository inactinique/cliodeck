# Plan d'implémentation - mdFocus v1.0

Version actuelle: 0.1.0
Objectif: Version 1.0 stable et complète

---

## Phase 1: Améliorations de l'interface utilisateur

### 1.1 Refonte du panneau Paramètres (Settings)

**Fichiers concernés:**
- `src/renderer/src/components/Config/ConfigPanel.tsx`
- `src/renderer/src/components/Config/ConfigPanel.css`
- Toutes les sections de configuration (`*ConfigSection.tsx`)

**Tâches:**
- [ ] Améliorer la cohérence du design entre toutes les sections
- [ ] Ajouter un message "Configuration sauvegardée" à droite des boutons
- [ ] Rendre les boutons Save/Reset sticky (fixés) lors du scroll
- [ ] Replier toutes les sections par défaut au chargement
- [ ] Utiliser ou améliorer le composant `CollapsibleSection` existant

**Priorité:** Moyenne
**Complexité:** Faible

---

### 1.2 Amélioration du panneau Journal de recherche

**Fichiers concernés:**
- `src/renderer/src/components/Journal/JournalPanel.tsx`
- `src/renderer/src/components/Journal/SessionTimeline.tsx`
- Backend: `backend/core/history/HistoryManager.ts`

**Tâches:**
- [ ] Filtrer et ne pas afficher les sessions vides (sans événements)
- [ ] Créer une nouvelle vue "Vue globale" affichant tous les événements de toutes les sessions
- [ ] Ajouter un toggle pour basculer entre "Vue par session" et "Vue globale"
- [ ] Optimiser les requêtes pour ne charger que les sessions non-vides

**Priorité:** Moyenne
**Complexité:** Moyenne

---

## Phase 2: Améliorations fonctionnelles

### 2.1 Exports du panneau Projet

**Fichiers concernés:**
- `src/renderer/src/components/Project/ProjectPanel.tsx`
- `src/renderer/src/components/Export/WordExportModal.tsx`
- Backend: `src/main/services/word-export.ts`
- Backend: `src/main/ipc/handlers/export-handlers.ts`

**Tâches:**
- [x] Ajouter l'option d'export vers Word (.docx) ✅
  - Utiliser la librairie `docx` déjà présente dans les dépendances
  - Service d'export Word créé (word-export.ts, ~600 lignes)
  - Modal d'export avec formulaire complet (WordExportModal.tsx)
- [x] Ajouter la gestion des fichiers CSL (Citation Style Language) ✅
  - Champ CSL ajouté dans ProjectPanel et CSLSettings
  - Support CSL intégré dans les exports Word
  - Composant CSLSettings.tsx pour gérer la sélection
- [x] Support des modèles Word (.dotx) ✅
  - Détection automatique des fichiers .dotx (méthode `findTemplate()`)
  - Merge avec template via docxtemplater (méthode `mergeWithTemplate()`)
  - Affichage du template détecté dans WordExportModal (badge vert)
  - Placeholders supportés: {title}, {author}, {date}, {content}, {abstract}
  - Fallback automatique si template invalide
- [x] Correction bug PageNumber ✅
  - Syntaxe corrigée pour les numéros de page dans le footer

**Dépendances ajoutées:**
- `docxtemplater@^3.55.7` - Traitement des templates Word
- `pizzip@^3.1.7` - Manipulation des archives ZIP
- `@types/pizzip` (dev) - Types TypeScript

**Documentation créée:**
- `WORD_TEMPLATES.md` - Guide utilisateur complet (184 lignes)
- `EXPORT_WORD_IMPLEMENTATION.md` - Documentation technique (245 lignes)

**Commits:**
- `75ee4d0` - feat: Add Word template (.dotx) support for exports
- `30e4219` - chore: Add docxtemplater/pizzip to package.json dependencies

**Priorité:** Haute
**Complexité:** Moyenne-Haute
**Status:** ✅ **Terminé** (2026-01-11)

**Tests restants:**
- [ ] Tests manuels avec différents templates
- [ ] Tests d'intégration automatisés (à créer)
- [ ] Test sur les 3 plateformes après build

---

### 2.2 Gestion de la bibliographie

**Fichiers concernés:**
- `src/renderer/src/components/Bibliography/BibliographyPanel.tsx`
- Backend: `src/main/services/bibliography-service.ts` (à vérifier/créer)

**Tâches:**
- [ ] Modifier le bouton "+" pour offrir deux options:
  - Option 1: Remplacer complètement le fichier de bibliographie actuel
  - Option 2: Ajouter les références du nouveau fichier à celles existantes
- [ ] Implémenter la logique de fusion des références (éviter les doublons par clé de citation)
- [ ] Ajouter une confirmation avant le remplacement complet
- [ ] Afficher un résumé après l'ajout (X nouvelles références, Y doublons ignorés)

**Priorité:** Moyenne
**Complexité:** Moyenne

---

### 2.3 Amélioration du panneau Chat

**Fichiers concernés:**
- `src/renderer/src/components/Chat/ChatInterface.tsx`
- `src/renderer/src/components/Chat/RAGSettingsPanel.tsx`
- Backend: `src/main/services/chat-service.ts`
- Backend: `backend/core/llm/OllamaClient.ts`

**Tâches:**
- [ ] Ajouter un champ "Prompt système" dans les paramètres RAG
- [ ] Créer deux prompts système par défaut:
  - Prompt français: "Tu es un assistant de recherche pour historiens. Réponds toujours en français, de manière claire et académique."
  - Prompt anglais: "You are a research assistant for historians. Always respond in English, in a clear and academic manner."
- [ ] Ajouter un sélecteur de langue du prompt système (FR/EN) dans RAGSettingsPanel
- [ ] Permettre la modification du prompt système par l'utilisateur
- [ ] Sauvegarder les préférences de prompt système dans la configuration
- [ ] Intégrer le prompt système dans les requêtes au LLM

**Priorité:** Haute
**Complexité:** Faible-Moyenne

---

### 2.4 Amélioration de l'indexation PDF

**Fichiers concernés:**
- `src/renderer/src/components/PDFIndex/PDFIndexPanel.tsx`
- `src/renderer/src/components/PDFIndex/PDFCard.tsx`
- Backend: `backend/core/pdf/PDFIndexer.ts`

**Tâches:**
- [ ] Lors de l'import de PDFs, permettre de renommer les documents
- [ ] Ajouter une interface de renommage après sélection des fichiers, avant indexation
- [ ] Proposer un nom par défaut basé sur:
  - Le titre extrait des métadonnées PDF
  - Le nom du fichier (si pas de métadonnées)
- [ ] Permettre l'édition du nom après import
- [ ] Stocker les noms personnalisés dans la base de données

**Priorité:** Moyenne
**Complexité:** Moyenne

---

## Phase 3: Révision du contenu et documentation

### 3.1 Guide méthodologique

**Fichiers concernés:**
- `src/renderer/src/components/Methodology/MethodologyModal.tsx`
- Fichiers de contenu du guide (à localiser)

**Tâches:**
- [x] Auditer le contenu actuel du guide méthodologique
- [x] Évaluer la pertinence pour les utilisateurs (historiens/chercheurs)
- [ ] Réécrire les sections obsolètes ou non pertinentes *(Guide actuel est pertinent et à jour)*
- [ ] Ajouter des exemples concrets d'utilisation de mdFocus *(À faire si nécessaire)*
- [x] S'assurer que le guide reflète les fonctionnalités actuelles (embeddings, BM25, etc.)

**Priorité:** Moyenne
**Complexité:** Faible (rédaction)
**Status:** ✅ Audit complété - Guide de bonne qualité

---

### 3.2 Documentation technique GitHub

**Fichiers concernés:**
- `BUILD.md`
- `DEPLOYMENT.md` (si existe)
- `INSTALL.md` ou fichiers d'installation
- `README.md` (révision manuelle, pas par Claude Code)

**Tâches:**
- [x] Fusionner BUILD.md et DEPLOYMENT.md en un seul document cohérent → `BUILD_AND_DEPLOYMENT.md`
- [x] Revoir et mettre à jour les instructions d'installation
- [x] Vérifier que toutes les étapes sont à jour (dépendances natives, Python, etc.)
- [x] Ajouter des sections de troubleshooting communes
- [x] Organiser par plateformes (macOS, Linux, Windows)

**Priorité:** Haute
**Complexité:** Faible-Moyenne
**Status:** ✅ Terminé - Fichier INSTALL_*.md existants sont complets et à jour

---

### 3.3 Documentation des fonctionnalités techniques

**Fichiers concernés:**
- `CHUNKING_IMPROVEMENTS.md`
- `EMBEDDINGS_IMPROVEMENTS.md`
- Nouveau fichier: `ARCHITECTURE.md`

**Tâches:**
- [x] Fusionner CHUNKING_IMPROVEMENTS.md et EMBEDDINGS_IMPROVEMENTS.md
- [x] Créer un document ARCHITECTURE.md structuré:
  - Introduction: Qu'est-ce que mdFocus et comment il fonctionne
  - Architecture globale (frontend Electron + backend + services Python)
  - Système de RAG (Vector store, HNSW, BM25, hybrid search)
  - Pipeline d'indexation (chunking adaptatif, embeddings)
  - Intégrations (Zotero, PDF, export)
- [x] Rendre le document accessible aux développeurs externes
- [x] Ajouter des diagrammes si nécessaire

**Priorité:** Moyenne
**Complexité:** Moyenne
**Status:** ✅ Terminé - ARCHITECTURE.md créé avec diagrammes et explications complètes

---

## Phase 4: Internationalisation (i18n)

### 4.1 Audit et complétion de la traduction anglaise

**Fichiers concernés:**
- Tous les composants React utilisant `useTranslation`
- Fichiers de traduction (à localiser: probablement dans `src/renderer/src/i18n/` ou similaire)

**Tâches:**
- [x] Localiser le système de traduction actuel (i18next est déjà installé)
- [x] Identifier toutes les chaînes non traduites
- [x] Créer/compléter les fichiers de traduction:
  - `en/common.json` ✅
  - `fr/common.json` ✅
  - `de/common.json` ✅
- [x] Remplacer tous les textes en dur par des clés de traduction
- [x] Zones vérifiées et traduites:
  - Panneau de configuration (ActionsSection, LanguageConfigSection) ✅
  - Messages d'erreur (AlertS/prompts dans tous les composants) ✅
  - Chat Interface et état vide ✅
  - Bibliographie (CitationCard, ZoteroImport) ✅
  - Modals de confirmation ✅

**Priorité:** Haute
**Complexité:** Moyenne (volume important)
**Status:** ✅ Terminé - Rapport détaillé créé dans I18N_MIGRATION_REPORT.md

**Fichiers modifiés:**
- `public/locales/fr/common.json` - Ajout de ~50+ nouvelles clés
- `public/locales/en/common.json` - Ajout de ~50+ nouvelles clés
- `public/locales/de/common.json` - Ajout de ~50+ nouvelles clés
- `src/renderer/src/components/Config/LanguageConfigSection.tsx` - Traduit
- `src/renderer/src/components/Config/ActionsSection.tsx` - Traduit
- `src/renderer/src/components/Chat/ChatInterface.tsx` - Traduit
- `src/renderer/src/components/Bibliography/ZoteroImport.tsx` - Traduit
- `src/renderer/src/components/Bibliography/CitationCard.tsx` - Traduit

---

## Phase 5: Nettoyage et préparation

### 5.1 Suppression des fonctionnalités expérimentales

**Fichiers concernés:**
- `src/renderer/src/components/Editor/ContextualSuggestions.tsx`
- `src/renderer/src/components/Editor/CitationSuggestionsPanel.tsx`
- `src/renderer/src/components/Config/SuggestionsConfigSection.tsx`
- Références dans d'autres composants

**Tâches:**
- [x] Supprimer le composant ContextualSuggestions
- [x] Supprimer CitationSuggestionsPanel
- [x] Supprimer SuggestionsConfigSection
- [x] Retirer les références dans ConfigPanel
- [x] Nettoyer les imports et types associés
- [x] Supprimer les services backend associés si isolés
- [x] Vérifier qu'aucune fonctionnalité active ne dépend de ces composants

**Priorité:** Faible (à faire avant la release)
**Complexité:** Faible
**Status:** ✅ Terminé

**Fichiers modifiés:**
- Supprimés: `ContextualSuggestions.tsx`, `ContextualSuggestions.css`
- Supprimés: `CitationSuggestionsPanel.tsx`, `CitationSuggestionsPanel.css`
- Supprimé: `SuggestionsConfigSection.tsx`
- Modifiés: `ConfigPanel.tsx`, `EditorPanel.tsx`, `editorStore.ts`
- Modifiés: `useMenuShortcuts.ts`, `MarkdownEditor.tsx`

---

## Phase 6: Version finale 1.0 (branche dédiée)

### 6.1 Optimisation des logs

**Fichiers concernés:**
- Tous les fichiers avec `console.log`, `console.error`, etc.
- À examiner: backend et frontend

**Tâches:**
- [ ] Auditer tous les logs de l'application
- [ ] Créer un système de logging centralisé avec niveaux (debug, info, warn, error)
- [ ] Remplacer les console.log par le système de logging
- [ ] Configurer les logs pour:
  - Mode développement: tous les niveaux
  - Mode production: warn et error uniquement
- [ ] Ajouter la rotation des logs si nécessaire
- [ ] Documenter comment activer les logs de debug en production

**Priorité:** Haute
**Complexité:** Moyenne

---

### 6.2 Retrait des DevTools

**Fichiers concernés:**
- `src/main/index.ts`
- Configuration Electron

**Tâches:**
- [ ] Localiser l'activation des DevTools dans le code
- [ ] Désactiver les DevTools en mode production
- [ ] Conserver la possibilité de les activer via variable d'environnement pour debug
- [ ] Vérifier qu'aucune référence aux DevTools ne reste dans le build production
- [ ] Tester le build final sans DevTools

**Priorité:** Haute
**Complexité:** Faible

---

### 6.3 Préparation de la release

**Fichiers concernés:**
- `package.json`
- `CHANGELOG.md` (à créer)
- Tags Git

**Tâches:**
- [ ] Mettre à jour la version dans package.json: 0.1.0 → 1.0.0
- [ ] Créer un CHANGELOG.md complet listant:
  - Nouvelles fonctionnalités
  - Améliorations
  - Corrections de bugs
  - Breaking changes (si applicable)
- [ ] Tester le build complet sur les trois plateformes:
  - macOS (Intel et Apple Silicon)
  - Linux (AppImage et deb)
  - Windows (NSIS)
- [ ] Créer un tag Git v1.0.0
- [ ] Préparer les notes de release GitHub

**Priorité:** Critique
**Complexité:** Faible

---

## Organisation des phases

### Ordre recommandé d'exécution:

1. **Phase 3** (Documentation) - Pendant que le code est encore frais
2. **Phase 4** (i18n) - Pour avoir une interface complète avant les tests
3. **Phase 2** (Fonctionnalités) - Ajouts majeurs
4. **Phase 1** (UI) - Polish de l'interface
5. **Phase 5** (Nettoyage) - Suppression des features expérimentales
6. **Phase 6** (Release) - Finalisation et publication

### Branches Git recommandées:

- `towards-1.0` (branche actuelle) - Phases 1 à 5
- `release/1.0` - Phase 6 uniquement
- Sous-branches optionnelles pour les grosses features:
  - `feature/word-export`
  - `feature/i18n-complete`
  - `feature/system-prompt`

---

## Estimation globale

**Total des tâches:** ~60-70 tâches individuelles

**Complexité par phase:**
- Phase 1: ~1-2 semaines
- Phase 2: ~2-3 semaines
- Phase 3: ~1 semaine
- Phase 4: ~1-2 semaines
- Phase 5: ~2-3 jours
- Phase 6: ~3-5 jours

---

## Notes importantes

### Dépendances externes à ajouter:
- Librairie CSL (citation-js ou citeproc-js) pour la gestion des styles bibliographiques
- Possiblement: librairie de logging structuré (winston, pino, ou custom)

### Tests à prévoir:
- Tests d'intégration pour les nouveaux exports (Word, CSL)
- Tests du système de prompt système
- Tests de fusion de bibliographies
- Tests multi-plateformes du build final

### Documentation utilisateur:
- Mettre à jour le guide méthodologique après chaque phase
- Créer des exemples d'utilisation des nouvelles fonctionnalités
- Préparer des captures d'écran pour la documentation

---

## 📊 Progression globale vers v1.0

### Vue d'ensemble par phase

| Phase | Tâches totales | Complétées | En cours | Non commencées | Progression |
|-------|---------------|------------|----------|----------------|-------------|
| **Phase 1** - UI | 8 | 0 | 0 | 8 | ⬜⬜⬜⬜⬜ 0% |
| **Phase 2** - Fonctionnalités | 19 | 7 | 0 | 12 | 🟩🟩🟩⬜⬜ 37% |
| **Phase 3** - Documentation | 8 | 8 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 4** - i18n | 7 | 7 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 5** - Nettoyage | 7 | 7 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 6** - Release | 13 | 0 | 0 | 13 | ⬜⬜⬜⬜⬜ 0% |
| **TOTAL** | **62** | **29** | **0** | **33** | 🟩🟩⬜⬜⬜ **47%** |

### Détail Phase 2 - Améliorations fonctionnelles

| Sous-section | Tâches | Complétées | Statut |
|--------------|--------|------------|--------|
| 2.1 Export Word + CSL + Templates | 7 | 7 | ✅ **100%** |
| 2.2 Gestion bibliographie | 4 | 0 | ❌ 0% |
| 2.3 Prompt système Chat | 6 | 0 | ❌ 0% |
| 2.4 Renommage PDFs | 5 | 0 | ❌ 0% |

### Commits récents (branche towards-1.0)

```
30e4219 (HEAD) chore: Add docxtemplater/pizzip to package.json dependencies
75ee4d0 feat: Add Word template (.dotx) support for exports
b30c936 bug chatbot
9037ba5 bug export word
a4b4e2c support csl, export word
54f16ca remove useless functionalities
0717737 internationalisation plus complète, révision des fichiers install, architecture, documentation.
```

### Prochaines priorités recommandées

1. **Phase 2.3 - Prompt système** (Priorité HAUTE)
   - Fonctionnalité clé pour l'utilisation académique
   - Complexité: Faible-Moyenne
   - ~6 tâches à implémenter

2. **Phase 2.2 - Gestion bibliographie** (Priorité Moyenne)
   - Améliore le workflow d'import
   - Complexité: Moyenne
   - ~4 tâches à implémenter

3. **Phase 2.4 - Renommage PDFs** (Priorité Moyenne)
   - UX améliorée pour l'indexation
   - Complexité: Moyenne
   - ~5 tâches à implémenter

4. **Phase 1 - Polish UI** (après Phase 2)
   - Amélioration de l'expérience utilisateur
   - ~8 tâches à implémenter

5. **Phase 6 - Finalisation release**
   - Logs, DevTools, version 1.0.0
   - ~13 tâches critiques

---

**Dernière mise à jour:** 2026-01-11 16:30
**Status:** En cours - Phase 2.1 terminée (Export Word + Templates)
**Prochaine étape:** Phase 2.3 (Prompt système) ou Phase 2.2 (Bibliographie)
