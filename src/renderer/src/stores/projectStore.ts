import { create } from 'zustand';

// MARK: - Types

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'article' | 'book' | 'presentation' | 'notes';
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
      const result = await window.electron.project.load(projectPath);

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to load project');
      }

      const project = result.project;

      console.log('📥 Raw project data from backend:', {
        project: project,
        bibliography: project.bibliography,
        bibliographySource: project.bibliographySource
      });

      set({
        currentProject: {
          ...project,
          createdAt: new Date(project.createdAt),
          lastOpenedAt: new Date(project.lastOpenedAt || project.createdAt),
        },
      });

      // Load chapters for book projects
      if (project.type === 'book') {
        const chaptersResult = await window.electron.project.getChapters(project.id);
        if (chaptersResult.success) {
          set({ chapters: chaptersResult.chapters });
        }
      }

      // Load bibliography if configured
      console.log('🔍 Project data received:', {
        hasBibliography: !!project.bibliography,
        bibliographyPath: project.bibliography,
        hasBibliographySource: !!project.bibliographySource
      });

      if (project.bibliography) {
        try {
          const { useBibliographyStore } = await import('./bibliographyStore');
          console.log('📚 Loading bibliography from:', project.bibliography);
          await useBibliographyStore.getState().loadBibliography(project.bibliography);
          console.log('✅ Bibliography loaded for project');
        } catch (error) {
          console.error('❌ Failed to load project bibliography:', error);
        }
      } else {
        console.log('ℹ️ No bibliography to load');
      }

      // Load document.md into editor if it's not a notes project
      if (project.type !== 'notes' && project.content) {
        try {
          const { useEditorStore } = await import('./editorStore');
          useEditorStore.getState().setContent(project.content);
          console.log('📝 Document loaded into editor');
        } catch (error) {
          console.error('Failed to load document into editor:', error);
        }
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
      const result = await window.electron.project.create({ name, type, path });

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to create project');
      }

      const project = result.project;

      set({
        currentProject: {
          ...project,
          createdAt: new Date(project.createdAt),
          lastOpenedAt: new Date(project.lastOpenedAt || project.createdAt),
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
            const result = await window.electron.project.load(path);
            if (!result.success || !result.project) {
              return null;
            }
            const project = result.project;
            return {
              ...project,
              createdAt: new Date(project.createdAt),
              lastOpenedAt: new Date(project.lastOpenedAt || project.createdAt),
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
