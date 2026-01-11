// @ts-nocheck
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { configManager } from './config-manager.js';

interface Project {
  id?: string;
  name: string;
  type?: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  bibliography?: string;
  bibliographySource?: {
    type: 'file' | 'zotero';
    filePath?: string; // Path to .bib file relative to project
    zoteroCollection?: string; // Zotero collection key
  };
  cslPath?: string; // Path to CSL file (relative to project or absolute)
  chapters?: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  filePath: string;
}

export class ProjectManager {
  private currentProject: Project | null = null;
  private currentProjectPath: string | null = null;

  /**
   * Retourne le chemin du dossier du projet actuellement ouvert
   * Pour un projet.json: retourne le dossier parent
   * Pour un dossier notes: retourne le dossier lui-même
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Retourne le projet actuellement ouvert
   */
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  async createProject(data: { name: string; type?: string; path: string; content?: string }) {
    const projectType = data.type || 'article';

    // For notes type, use the path directly (existing folder)
    // For other types, create a subfolder with the project name
    const projectPath = projectType === 'notes' ? data.path : path.join(data.path, data.name);

    // Create folder only for non-notes projects
    if (projectType !== 'notes' && !existsSync(projectPath)) {
      await mkdir(projectPath, { recursive: true });
    }

    const project: Project = {
      id: crypto.randomUUID(),
      name: data.name,
      type: projectType,
      path: projectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    };

    // For notes type, don't create project.json, just remember the folder
    if (projectType === 'notes') {
      // Just add to recent projects (folder path)
      configManager.addRecentProject(projectPath);

      // Store as current project
      this.currentProject = project;
      this.currentProjectPath = projectPath;

      console.log('✅ Notes folder created:', projectPath);
      return { success: true, path: projectPath, project };
    }

    // For other project types, create project.json
    const projectFile = path.join(projectPath, 'project.json');
    await writeFile(projectFile, JSON.stringify(project, null, 2));

    // Create markdown file
    const mdFile = path.join(projectPath, 'document.md');
    await writeFile(mdFile, data.content || '# ' + data.name);

    // For articles and books, create abstract.md and context.md
    if (projectType === 'article' || projectType === 'book') {
      const abstractFile = path.join(projectPath, 'abstract.md');
      await writeFile(abstractFile, '# Résumé\n\nRésumé à compléter...');

      const contextFile = path.join(projectPath, 'context.md');
      await writeFile(contextFile, '# Contexte du projet\n\nDécrivez ici le contexte de votre recherche. Ce contexte sera utilisé pour améliorer les réponses de l\'assistant IA.\n\nExemple : "Cette recherche porte sur l\'impact de l\'intelligence artificielle dans l\'éducation supérieure, avec un focus particulier sur la taxonomie de Bloom et les stratégies pédagogiques actives."');
    }

    // For presentations, create slides.md with Beamer syntax
    if (projectType === 'presentation') {
      const slidesFile = path.join(projectPath, 'slides.md');
      const slidesTemplate = `# Introduction

Votre contenu ici...

- Point important 1
- Point important 2
- Point important 3

# Plan de la présentation

1. Contexte
2. Méthodologie
3. Résultats
4. Conclusion

# Section 1: Contexte

## Sous-section

Texte de votre slide...

::: notes
Ceci est une note pour le présentateur.
Elle n'apparaîtra pas sur le slide, uniquement dans vos notes.
:::

# Section 2: Méthodologie

## Approche

- Méthode 1
- Méthode 2
- Méthode 3

# Résultats

## Tableau récapitulatif

| Élément | Valeur |
|---------|--------|
| A       | 10     |
| B       | 20     |

# Conclusion

Merci de votre attention !

::: notes
N'oubliez pas de mentionner les perspectives futures.
:::
`;
      await writeFile(slidesFile, slidesTemplate);
    }

    // Add to recent projects
    configManager.addRecentProject(projectFile);

    // Store as current project
    this.currentProject = project;
    this.currentProjectPath = projectPath;

    console.log('✅ Project created:', projectPath);
    return { success: true, path: projectFile, project };
  }

  async loadProject(projectPath: string) {
    try {
      // Check if it's a notes folder (directory without project.json)
      const { stat } = await import('fs/promises');
      const stats = await stat(projectPath);

      if (stats.isDirectory()) {
        // It's a notes folder
        const folderName = path.basename(projectPath);
        const project: Project = {
          id: crypto.randomUUID(),
          name: folderName,
          type: 'notes',
          path: projectPath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
        };

        configManager.addRecentProject(projectPath);

        // Store current project
        this.currentProject = project;
        this.currentProjectPath = projectPath; // For notes, it's the folder itself

        console.log('✅ Notes folder loaded:', projectPath);
        return { success: true, project };
      }

      // It's a project.json file
      const content = await readFile(projectPath, 'utf-8');
      const project: Project = JSON.parse(content);

      // Update lastOpenedAt
      project.lastOpenedAt = new Date().toISOString();

      // Load bibliography if configured
      console.log('🔍 Checking for bibliography source:', project.bibliographySource);
      if (project.bibliographySource?.filePath) {
        const bibPath = path.join(path.dirname(projectPath), project.bibliographySource.filePath);
        console.log('🔍 Looking for bibliography at:', bibPath);
        if (existsSync(bibPath)) {
          project.bibliography = bibPath;
          console.log('📚 Bibliography found:', bibPath);
        } else {
          console.log('⚠️ Bibliography file not found:', bibPath);
        }
      } else {
        console.log('ℹ️ No bibliography source configured');
      }

      // Save update
      await writeFile(projectPath, JSON.stringify(project, null, 2));

      configManager.addRecentProject(projectPath);

      // Store current project
      this.currentProject = project;
      this.currentProjectPath = path.dirname(projectPath); // For project.json, use parent folder

      console.log('✅ Project loaded:', projectPath);
      console.log('📤 Returning project with bibliography:', {
        hasBibliography: !!project.bibliography,
        bibliographyPath: project.bibliography,
        hasBibliographySource: !!project.bibliographySource
      });

      return { success: true, project };
    } catch (error) {
      console.error('❌ Failed to load project:', error);
      return { success: false, error: error.message };
    }
  }

  async saveProject(data: { path: string; content: string; bibliography?: string }) {
    try {
      // Charger le projet existant
      const projectContent = await readFile(data.path, 'utf-8');
      const project: Project = JSON.parse(projectContent);

      // Mettre à jour
      project.updatedAt = new Date().toISOString();
      if (data.bibliography !== undefined) {
        project.bibliography = data.bibliography;
      }

      // Sauvegarder le projet
      await writeFile(data.path, JSON.stringify(project, null, 2));

      // Sauvegarder le markdown
      const mdFile = path.join(path.dirname(data.path), 'document.md');
      await writeFile(mdFile, data.content);

      console.log('✅ Project saved:', data.path);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save project:', error);
      return { success: false, error: error.message };
    }
  }

  async getChapters(projectId: string) {
    try {
      // Pour l'instant, retourner un chapitre par défaut basé sur document.md
      // Dans une version future, on pourra gérer plusieurs chapitres
      const chapters: Chapter[] = [
        {
          id: 'main',
          title: 'Document principal',
          order: 0,
          filePath: 'document.md',
        },
      ];

      return { success: true, chapters };
    } catch (error) {
      console.error('❌ Failed to get chapters:', error);
      return { success: false, chapters: [], error: error.message };
    }
  }

  async setBibliographySource(data: {
    projectPath: string;
    type: 'file' | 'zotero';
    filePath?: string;
    zoteroCollection?: string;
  }) {
    try {
      const projectContent = await readFile(data.projectPath, 'utf-8');
      const project: Project = JSON.parse(projectContent);

      project.bibliographySource = {
        type: data.type,
        filePath: data.filePath,
        zoteroCollection: data.zoteroCollection,
      };

      project.updatedAt = new Date().toISOString();

      await writeFile(data.projectPath, JSON.stringify(project, null, 2));

      console.log('✅ Bibliography source configured:', data.type);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to set bibliography source:', error);
      return { success: false, error: error.message };
    }
  }

  async setCSLPath(data: {
    projectPath: string;
    cslPath?: string;
  }) {
    try {
      const projectContent = await readFile(data.projectPath, 'utf-8');
      const project: Project = JSON.parse(projectContent);

      project.cslPath = data.cslPath;
      project.updatedAt = new Date().toISOString();

      await writeFile(data.projectPath, JSON.stringify(project, null, 2));

      console.log('✅ CSL path configured:', data.cslPath);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to set CSL path:', error);
      return { success: false, error: error.message };
    }
  }
}

export const projectManager = new ProjectManager();
