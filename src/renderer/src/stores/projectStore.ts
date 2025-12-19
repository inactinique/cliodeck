import { create } from 'zustand';

// MARK: - Types

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'article' | 'book' | 'presentation';
  createdAt: Date;
  lastOpenedAt: Date;
}

export interface Chapter {
  id: string;
  title: string;
  filePath: string;
  order: number;
}

interface ProjectState {
  // Current project
  currentProject: Project | null;
  chapters: Chapter[];
  currentChapterId: string | null;

  // Recent projects
  recentProjects: Project[];

  // Actions
  loadProject: (projectPath: string) => Promise<void>;
  createProject: (name: string, type: Project['type'], path: string) => Promise<void>;
  closeProject: () => void;

  setCurrentChapter: (chapterId: string) => void;
  addChapter: (title: string, filePath: string) => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapters: (chapters: Chapter[]) => void;

  loadRecentProjects: () => Promise<void>;
}

// MARK: - Store

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  chapters: [],
  currentChapterId: null,
  recentProjects: [],

  loadProject: async (projectPath: string) => {
    try {
      // Call IPC to load project
      const project = await window.electron.project.load(projectPath);

      set({
        currentProject: {
          ...project,
          createdAt: new Date(project.createdAt),
          lastOpenedAt: new Date(),
        },
      });

      // Load chapters for book projects
      if (project.type === 'book') {
        const chapters = await window.electron.project.getChapters(project.id);
        set({ chapters });
      }

      // Update recent projects
      await get().loadRecentProjects();
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  },

  createProject: async (name: string, type: Project['type'], path: string) => {
    try {
      const project = await window.electron.project.create({ name, type, path });

      set({
        currentProject: {
          ...project,
          createdAt: new Date(project.createdAt),
          lastOpenedAt: new Date(),
        },
        chapters: [],
        currentChapterId: null,
      });

      await get().loadRecentProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  closeProject: () => {
    set({
      currentProject: null,
      chapters: [],
      currentChapterId: null,
    });
  },

  setCurrentChapter: (chapterId: string) => {
    set({ currentChapterId: chapterId });
  },

  addChapter: (title: string, filePath: string) => {
    const { chapters } = get();
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title,
      filePath,
      order: chapters.length,
    };
    set({ chapters: [...chapters, newChapter] });
  },

  deleteChapter: (chapterId: string) => {
    const { chapters } = get();
    set({
      chapters: chapters.filter((c) => c.id !== chapterId),
      currentChapterId: null,
    });
  },

  reorderChapters: (newChapters: Chapter[]) => {
    set({ chapters: newChapters });
  },

  loadRecentProjects: async () => {
    try {
      const recentPaths = await window.electron.project.getRecent();

      const recentProjects = await Promise.all(
        recentPaths.map(async (path) => {
          try {
            const project = await window.electron.project.load(path);
            return {
              ...project,
              createdAt: new Date(project.createdAt),
              lastOpenedAt: new Date(project.lastOpenedAt),
            };
          } catch {
            return null;
          }
        })
      );

      set({
        recentProjects: recentProjects.filter((p): p is Project => p !== null),
      });
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  },
}));
