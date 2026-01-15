# Raccourcis Clavier - ClioDesk

Ce document liste tous les raccourcis clavier disponibles dans ClioDesk.

> **Note**: Sur macOS, utilisez `Cmd` au lieu de `Ctrl`.

## 📝 Fichier

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+N` | Nouveau fichier | Crée un nouveau fichier Markdown vierge |
| `Ctrl+O` | Ouvrir fichier | Ouvre un fichier Markdown existant |
| `Ctrl+S` | Sauvegarder | Sauvegarde le fichier actuel |
| `Ctrl+Shift+N` | Nouveau projet | Crée un nouveau projet |
| `Ctrl+Shift+O` | Ouvrir projet | Ouvre un projet existant |
| `Ctrl+E` | Exporter PDF | Ouvre la boîte de dialogue d'export PDF |
| `Ctrl+,` | Paramètres | Ouvre le panneau de configuration |

## ✏️ Édition

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+Z` | Annuler | Annule la dernière modification |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rétablir | Rétablit la dernière modification annulée |
| `Ctrl+X` | Couper | Coupe le texte sélectionné |
| `Ctrl+C` | Copier | Copie le texte sélectionné |
| `Ctrl+V` | Coller | Colle le texte depuis le presse-papiers |
| `Ctrl+A` | Tout sélectionner | Sélectionne tout le contenu |

## 🎨 Formatage Markdown

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+B` | Gras | Insère ou formate le texte en **gras** |
| `Ctrl+I` | Italique | Insère ou formate le texte en _italique_ |
| `Ctrl+L` | Insérer lien | Insère un lien Markdown `[texte](url)` |
| `Ctrl+'` | Insérer citation | Insère une citation BibTeX `[@clé]` |
| `Ctrl+Shift+T` | Insérer tableau | Insère un tableau Markdown |

## 👁️ Affichage

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+K` | Basculer aperçu | Affiche/masque l'aperçu Markdown |
| `Alt+1` | Panneau Projects | Active le panneau de gestion des projets |
| `Alt+2` | Panneau Bibliography | Active le panneau de bibliographie |
| `Alt+3` | Panneau Chat | Active le panneau de chat RAG |
| `Alt+4` | Panneau PDFs | Active le panneau d'indexation des PDFs |
| `Alt+5` | Panneau Corpus | Active le panneau d'exploration du corpus |
| `Alt+6` | Panneau Settings | Active le panneau de configuration |
| `Ctrl+0` | Réinitialiser zoom | Rétablit le zoom par défaut |
| `Ctrl++` | Zoom avant | Augmente le niveau de zoom |
| `Ctrl+-` | Zoom arrière | Diminue le niveau de zoom |
| `F11` | Plein écran | Active/désactive le mode plein écran |
| `F12` | DevTools | Ouvre les outils de développement |

## 📚 Bibliographie

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+Shift+B` | Importer BibTeX | Ouvre la boîte de dialogue d'import BibTeX |
| `Ctrl+F` | Rechercher citations | Focus sur la barre de recherche de citations |

## 🪟 Fenêtre

| Raccourci | Action | Description |
|-----------|--------|-------------|
| `Ctrl+W` | Fermer fenêtre | Ferme la fenêtre actuelle (sur Windows/Linux) |
| `Ctrl+M` | Réduire | Réduit la fenêtre dans la barre des tâches |
| `Ctrl+Q` | Quitter | Quitte l'application (sur Windows/Linux) |

## 💡 Astuces

### Navigation rapide entre panneaux
Utilisez les raccourcis `Alt+1` à `Alt+6` pour naviguer rapidement entre les différents panneaux sans utiliser la souris.

### Workflow d'édition optimal
1. `Ctrl+N` - Nouveau fichier
2. Écrivez votre contenu
3. `Ctrl+B` / `Ctrl+I` - Formatage rapide
4. `Ctrl+'` - Insérez des citations
5. `Ctrl+K` - Prévisualisez le résultat
6. `Ctrl+S` - Sauvegardez régulièrement
7. `Ctrl+E` - Exportez en PDF quand terminé

### Citations bibliographiques
1. `Ctrl+Shift+B` - Importez votre fichier BibTeX
2. `Alt+2` - Basculez vers le panneau Bibliographie
3. `Ctrl+F` - Recherchez une citation
4. Cliquez sur "Insérer" ou utilisez `Ctrl+'` dans l'éditeur

### Chat RAG
- `Alt+3` - Accédez rapidement au panneau Chat
- Tapez votre question dans le champ de saisie
- Appuyez sur `Enter` pour envoyer (ou `Shift+Enter` si configuré ainsi)
- `Escape` - Annulez une génération en cours

## 🔧 Personnalisation

Les raccourcis clavier sont définis dans le fichier `src/main/menu.ts`. Pour les modifier :

1. Ouvrez `src/main/menu.ts`
2. Modifiez la propriété `accelerator` de l'élément de menu désiré
3. Recompilez l'application avec `npm run build`
4. Redémarrez l'application

### Format des raccourcis

Les raccourcis utilisent le format Electron Accelerator :
- `CmdOrCtrl` - `Cmd` sur macOS, `Ctrl` sur Windows/Linux
- `Shift` - Touche Maj
- `Alt` - Touche Alt (Option sur macOS)
- Combinez avec `+` : `CmdOrCtrl+Shift+B`

### Raccourcis disponibles

Vous pouvez utiliser :
- Lettres : `A-Z`
- Chiffres : `0-9`
- Touches fonction : `F1-F24`
- Touches spéciales : `Space`, `Tab`, `Enter`, `Escape`, `Backspace`, `Delete`
- Symboles : `+`, `-`, `=`, `[`, `]`, etc.

## 📖 Références

- [Documentation Electron - Accelerators](https://www.electronjs.org/docs/latest/api/accelerator)
- [Documentation ClioDesk](README.md)
