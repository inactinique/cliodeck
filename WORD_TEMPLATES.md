# Guide d'utilisation des modèles Word (.dotx)

## 📝 Vue d'ensemble

mdFocus supporte l'utilisation de modèles Word personnalisés (fichiers `.dotx`) pour l'export de vos documents. Cette fonctionnalité vous permet d'appliquer votre propre mise en forme, styles et structure à vos exports Word.

## 🚀 Utilisation basique

### 1. Détection automatique

Pour utiliser un modèle Word, placez simplement un fichier `.dotx` dans le dossier de votre projet mdFocus :

```
mon_projet/
├── .mdfocus/
├── document.md
├── bibliography.bib
└── mon_modele.dotx  ← Votre modèle Word
```

mdFocus détectera automatiquement le modèle et vous informera lors de l'export.

### 2. Export avec modèle

Lors de l'export Word :
1. Ouvrez le panneau **Projet** (📁)
2. Cliquez sur **Export Word (.docx)**
3. Si un modèle est détecté, vous verrez un message : ✅ **Modèle Word détecté: mon_modele.dotx**
4. Remplissez les informations (titre, auteur)
5. Cliquez sur **Exporter**

Le document généré utilisera les styles et la mise en forme de votre modèle.

## 📋 Création d'un modèle avec placeholders

mdFocus utilise `docxtemplater` pour fusionner votre contenu avec le modèle. Vous pouvez créer un modèle avec des placeholders pour un contrôle précis :

### Placeholders disponibles

| Placeholder | Description | Exemple |
|-------------|-------------|---------|
| `{title}` | Titre du document | "Mon article scientifique" |
| `{author}` | Auteur du document | "Marie Dupont" |
| `{date}` | Date d'export | "11/01/2026" |
| `{content}` | Contenu Markdown converti | Tout votre document.md |
| `{abstract}` | Résumé (si fichier abstract.md existe) | Votre résumé |

### Exemple de modèle

Créez un document Word et insérez ces placeholders :

```
═══════════════════════════════════════════════════
                    {title}

                 Par {author}
                    {date}
═══════════════════════════════════════════════════

RÉSUMÉ

{abstract}


CONTENU

{content}
```

Enregistrez ce document au format `.dotx` (Fichier → Enregistrer en tant que modèle Word).

## 🎨 Styles et mise en forme

### Styles automatiques

Si votre modèle contient des styles nommés, mdFocus les appliquera automatiquement :

- **Titre 1** → `Heading1` ou `Titre 1`
- **Titre 2** → `Heading2` ou `Titre 2`
- **Titre 3** → `Heading3` ou `Titre 3`
- **Normal** → Style de paragraphe par défaut
- **Citation** → Citations et blockquotes

### En-têtes et pieds de page

Votre modèle peut inclure :
- ✅ En-têtes personnalisés
- ✅ Pieds de page personnalisés
- ✅ Numérotation de pages
- ✅ Logo ou image institutionnelle

**Note** : Si votre modèle n'a pas d'en-tête/pied de page, mdFocus utilisera ceux par défaut (titre dans l'en-tête, numéro de page dans le pied de page).

## 🔧 Comportement en cas d'erreur

Si le modèle ne peut pas être chargé (fichier corrompu, placeholders incorrects, etc.), mdFocus :
1. ⚠️ Affichera un avertissement dans les logs
2. 🔄 Basculera automatiquement vers la génération standard
3. ✅ Créera quand même votre document (sans appliquer le modèle)

Vous ne perdrez jamais votre export !

## 📚 Cas d'usage

### Thèses et mémoires universitaires

Créez un modèle avec :
- Page de garde institutionnelle
- Déclaration sur l'honneur
- Table des matières (générée par Word)
- Styles de titres conformes aux exigences

### Articles scientifiques

Utilisez un modèle respectant :
- Format de revue spécifique (APA, Vancouver, etc.)
- Marges et espacements requis
- En-tête avec titre courant

### Rapports professionnels

Incluez dans votre modèle :
- Logo d'entreprise
- Charte graphique
- Pied de page avec informations légales

## ⚙️ Paramètres avancés

### Plusieurs modèles

Si vous avez plusieurs fichiers `.dotx` dans votre projet, mdFocus utilisera le **premier trouvé** (ordre alphabétique).

**Recommandation** : N'utilisez qu'un seul modèle par projet.

### Modèles par type de projet

Vous pouvez créer des modèles spécifiques selon le type de projet :

```
modeles/
├── article_template.dotx  ← Pour les articles
├── book_template.dotx     ← Pour les livres
└── notes_template.dotx    ← Pour les notes
```

Copiez le modèle approprié dans votre projet avant l'export.

## 🐛 Dépannage

### Le modèle n'est pas détecté

- ✅ Vérifiez que le fichier a bien l'extension `.dotx` (pas `.docx`)
- ✅ Assurez-vous que le fichier est dans le **dossier racine** du projet (pas dans `.mdfocus/`)
- ✅ Redémarrez mdFocus si nécessaire

### Le contenu n'apparaît pas

Si vous utilisez des placeholders :
- ✅ Vérifiez l'orthographe : `{content}` et non `{contenu}`
- ✅ Utilisez des accolades simples, pas doubles
- ✅ Pas d'espace : `{title}` et non `{ title }`

### Mise en forme incorrecte

- ✅ Vérifiez que vos styles Word sont bien nommés (Titre 1, Titre 2, etc.)
- ✅ Testez le modèle en créant manuellement un document Word avec
- ✅ Assurez-vous que le modèle n'est pas corrompu

## 📖 Ressources

- [Documentation docxtemplater](https://docxtemplater.com/)
- [Créer un modèle Word - Microsoft](https://support.microsoft.com/fr-fr/office/cr%C3%A9er-un-mod%C3%A8le-86a1d089-5ae2-4d53-9042-1191bce57deb)

## 🆘 Support

En cas de problème :
1. Consultez les logs de mdFocus (Panneau Journal)
2. Vérifiez que votre modèle s'ouvre correctement dans Word
3. Essayez d'exporter sans modèle pour vérifier que le problème vient du modèle

---

**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
