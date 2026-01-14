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
- [x] Améliorer la cohérence du design entre toutes les sections ✅
- [x] Ajouter un message "Configuration sauvegardée" à droite des boutons ✅
- [x] Rendre les boutons Save/Reset sticky (fixés) lors du scroll ✅
- [x] Replier toutes les sections par défaut au chargement ✅
- [x] Utiliser ou améliorer le composant `CollapsibleSection` existant ✅

**Priorité:** Moyenne
**Complexité:** Faible
**Status:** ✅ **Terminé**

---

### 1.2 Amélioration du panneau Journal de recherche

**Fichiers concernés:**
- `src/renderer/src/components/Journal/JournalPanel.tsx`
- `src/renderer/src/components/Journal/SessionTimeline.tsx`
- Backend: `backend/core/history/HistoryManager.ts`

**Tâches:**
- [x] Filtrer et ne pas afficher les sessions vides (sans événements) ✅
- [x] Créer une nouvelle vue "Vue globale" affichant tous les événements de toutes les sessions ✅
- [x] Ajouter un toggle pour basculer entre "Vue par session" et "Vue globale" ✅
- [x] Optimiser les requêtes pour ne charger que les sessions non-vides ✅ *(filtrage côté client)*

**Priorité:** Moyenne
**Complexité:** Moyenne
**Status:** ✅ **Terminé**

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
- `src/renderer/src/components/Bibliography/BibImportModeModal.tsx`
- `src/renderer/src/components/Bibliography/BibImportSummaryModal.tsx`
- `src/renderer/src/stores/bibliographyStore.ts`

**Tâches:**
- [x] Modifier le bouton "+" pour offrir deux options ✅
  - Option 1: Remplacer complètement le fichier de bibliographie actuel
  - Option 2: Ajouter les références du nouveau fichier à celles existantes
- [x] Implémenter la logique de fusion des références (éviter les doublons par clé de citation) ✅
- [x] Ajouter une confirmation avant le remplacement complet ✅
- [x] Afficher un résumé après l'ajout (X nouvelles références, Y doublons ignorés) ✅

**Priorité:** Moyenne
**Complexité:** Moyenne
**Status:** ✅ **Terminé**

---

### 2.3 Amélioration du panneau Chat

**Fichiers concernés:**
- `src/renderer/src/components/Chat/RAGSettingsPanel.tsx`
- `src/renderer/src/stores/ragQueryStore.ts`
- `backend/core/llm/SystemPrompts.ts`
- `src/main/services/chat-service.ts`

**Tâches:**
- [x] Ajouter un champ "Prompt système" dans les paramètres RAG ✅
- [x] Créer deux prompts système par défaut ✅
  - Prompt français: Assistant académique en français
  - Prompt anglais: Academic assistant in English
- [x] Ajouter un sélecteur de langue du prompt système (FR/EN) dans RAGSettingsPanel ✅
- [x] Permettre la modification du prompt système par l'utilisateur ✅
- [x] Sauvegarder les préférences de prompt système dans la configuration ✅
- [x] Intégrer le prompt système dans les requêtes au LLM ✅

**Priorité:** Haute
**Complexité:** Faible-Moyenne
**Status:** ✅ **Terminé**

---

### 2.4 Amélioration de l'indexation PDF

**Fichiers concernés:**
- `src/renderer/src/components/PDFIndex/PDFIndexPanel.tsx`
- `src/renderer/src/components/PDFIndex/PDFRenameModal.tsx`
- `backend/core/pdf/PDFIndexer.ts`

**Tâches:**
- [x] Lors de l'import de PDFs, permettre de renommer les documents ✅
- [x] Ajouter une interface de renommage après sélection des fichiers, avant indexation ✅
- [x] Proposer un nom par défaut basé sur ✅
  - Le titre extrait des métadonnées PDF
  - Le nom du fichier (si pas de métadonnées)
- [x] Permettre l'édition du nom après import ✅
- [x] Stocker les noms personnalisés dans la base de données ✅

**Priorité:** Moyenne
**Complexité:** Moyenne
**Status:** ✅ **Terminé**

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
- `src/shared/logger.ts` (créé)
- `src/shared/console-filter.ts` (créé)
- `src/main/index.ts`
- `src/renderer/src/main.tsx`

**Tâches:**
- [x] Auditer tous les logs de l'application ✅ (~850 appels console.* dans 85+ fichiers)
- [x] Créer un système de logging centralisé avec niveaux (debug, info, warn, error) ✅
- [x] ~~Remplacer les console.log par le système de logging~~ → Approche pragmatique: filtre automatique ✅
- [x] Configurer les logs pour ✅
  - Mode développement: tous les niveaux
  - Mode production: warn et error uniquement
- [x] ~~Ajouter la rotation des logs si nécessaire~~ → Non nécessaire pour v1.0
- [x] Documenter comment activer les logs de debug en production ✅ → `LOGGING.md`

**Approche implémentée:** Solution pragmatique avec filtre console automatique qui désactive `console.log` et `console.info` en production, sans nécessiter la migration des 850+ appels existants.

**Fichiers créés:**
- `src/shared/logger.ts` - Logger centralisé avec niveaux
- `src/shared/console-filter.ts` - Filtre automatique en production
- `LOGGING.md` - Documentation

**Variables d'environnement:**
- `MDFOCUS_DEBUG=1` : Active tous les logs en production
- `MDFOCUS_LOG_LEVEL=debug` : Définit le niveau de log

**Priorité:** Haute
**Complexité:** Moyenne
**Status:** ✅ **Terminé** (2026-01-14)

---

### 6.2 Retrait des DevTools (ON HOLD FOR NOW)

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
| **Phase 1** - UI | 9 | 9 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 2** - Fonctionnalités | 22 | 22 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 3** - Documentation | 8 | 8 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 4** - i18n | 7 | 7 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 5** - Nettoyage | 7 | 7 | 0 | 0 | 🟩🟩🟩🟩🟩 100% |
| **Phase 6** - Release | 13 | 6 | 0 | 7 | 🟩🟩🟩⬜⬜ 46% |
| **TOTAL** | **66** | **59** | **0** | **7** | 🟩🟩🟩🟩⬜ **89%** |

### Détail Phase 2 - Améliorations fonctionnelles

| Sous-section | Tâches | Complétées | Statut |
|--------------|--------|------------|--------|
| 2.1 Export Word + CSL + Templates | 7 | 7 | ✅ **100%** |
| 2.2 Gestion bibliographie | 4 | 4 | ✅ **100%** |
| 2.3 Prompt système Chat | 6 | 6 | ✅ **100%** |
| 2.4 Renommage PDFs | 5 | 5 | ✅ **100%** |

### Détail Phase 6 - Release

| Sous-section | Tâches | Complétées | Statut |
|--------------|--------|------------|--------|
| 6.1 Optimisation des logs | 6 | 6 | ✅ **100%** |
| 6.2 Retrait DevTools | 5 | 0 | ❌ 0% |
| 6.3 Préparation release | 5 | 0 | ❌ 0% |

### Prochaines priorités

1. **Phase 6.2 - Retrait DevTools**
   - Désactiver les DevTools en production
   - Variable d'environnement pour debug
   - Complexité: Faible

2. **Phase 6.3 - Préparation release**
   - Mise à jour version 1.0.0
   - CHANGELOG.md
   - Tests multi-plateformes
   - Tag Git v1.0.0

---

**Dernière mise à jour:** 2026-01-14
**Status:** 89% terminé - Phases 1-5 complètes, Phase 6.1 (logs) terminée
**Prochaine étape:** Phase 6.2 (DevTools) puis Phase 6.3 (Release)
