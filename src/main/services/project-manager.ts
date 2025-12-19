// @ts-nocheck
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { configManager } from './config-manager.js';

interface Project {
  id?: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
  bibliography?: string;
  chapters?: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  filePath: string;
}

export class ProjectManager {
  async createProject(data: { name: string; path: string; content?: string }) {
    const projectPath = path.join(data.path, data.name);

    // Créer le dossier du projet
    if (!existsSync(projectPath)) {
      await mkdir(projectPath, { recursive: true });
    }

    const project: Project = {
      name: data.name,
      path: projectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: data.content || '',
    };

    // Sauvegarder le fichier projet
    const projectFile = path.join(projectPath, 'project.json');
    await writeFile(projectFile, JSON.stringify(project, null, 2));

    // Créer le fichier markdown principal
    const mdFile = path.join(projectPath, 'document.md');
    await writeFile(mdFile, data.content || '# ' + data.name);

    // Ajouter aux projets récents
    configManager.addRecentProject(projectFile);

    console.log('✅ Project created:', projectPath);
    return { success: true, path: projectFile, project };
  }

  async loadProject(projectPath: string) {
    try {
      const content = await readFile(projectPath, 'utf-8');
      const project: Project = JSON.parse(content);

      // Charger le contenu markdown
      const mdFile = path.join(path.dirname(projectPath), 'document.md');
      if (existsSync(mdFile)) {
        project.content = await readFile(mdFile, 'utf-8');
      }

      configManager.addRecentProject(projectPath);
      console.log('✅ Project loaded:', projectPath);

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
}

export const projectManager = new ProjectManager();
