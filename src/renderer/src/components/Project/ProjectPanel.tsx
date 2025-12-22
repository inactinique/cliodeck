import React, { useState, useEffect } from 'react';
import { FilePlus, FolderOpen, X } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { FileTree } from '../FileTree/FileTree';
import { CollapsibleSection } from '../common/CollapsibleSection';
import './ProjectPanel.css';

export const ProjectPanel: React.FC = () => {
  const {
    currentProject,
    recentProjects,
    loadProject,
    createProject,
    closeProject,
    loadRecentProjects,
  } = useProjectStore();

  const { loadFile } = useEditorStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<'article' | 'book' | 'presentation' | 'notes'>('article');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  const handleCreateProject = async () => {
    // For notes, use folder name as project name
    const projectName = newProjectType === 'notes'
      ? newProjectPath.split('/').filter(Boolean).pop() || 'Notes'
      : newProjectName;

    if ((newProjectType !== 'notes' && !newProjectName) || !newProjectPath) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsCreating(true);
    try {
      await createProject(projectName, newProjectType, newProjectPath);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectPath('');
      setNewProjectType('article');
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert('Erreur lors de la création du projet: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = async () => {
    try {
      const result = await window.electron.dialog.openFile({
        properties: ['openFile'],
        filters: [
          { name: 'Projet MDFocus', extensions: ['json'] },
          { name: 'Tous les fichiers', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        await loadProject(result.filePaths[0]);
      }
    } catch (error: any) {
      console.error('Failed to open project:', error);
      alert('Erreur lors de l\'ouverture du projet: ' + error.message);
    }
  };

  const handleSelectPath = async () => {
    try {
      const result = await window.electron.dialog.openFile({
        properties: ['openDirectory', 'createDirectory'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setNewProjectPath(result.filePaths[0]);
      }
    } catch (error: any) {
      console.error('Failed to select path:', error);
    }
  };

  const handleLoadRecentProject = async (project: any) => {
    try {
      // For non-notes projects, construct path to project.json
      // For notes projects, use the path directly (folder path)
      const projectPath = project.type === 'notes'
        ? project.path
        : `${project.path}/project.json`;

      await loadProject(projectPath);
    } catch (error: any) {
      console.error('Failed to load recent project:', error);
      alert('Erreur lors de l\'ouverture du projet: ' + error.message);
    }
  };

  const handleRemoveRecentProject = async (project: any) => {
    try {
      // Construct the path that was stored in recent projects
      const projectPath = project.type === 'notes'
        ? project.path
        : `${project.path}/project.json`;

      await window.electron.project.removeRecent(projectPath);
      await loadRecentProjects();
    } catch (error: any) {
      console.error('Failed to remove recent project:', error);
    }
  };

  const getProjectTypeName = (type: string) => {
    switch (type) {
      case 'article':
        return 'Article';
      case 'book':
        return 'Livre';
      case 'presentation':
        return 'Présentation';
      case 'notes':
        return 'Notes';
      default:
        return type;
    }
  };

  const handleFileSelect = async (filePath: string) => {
    try {
      await loadFile(filePath);
    } catch (error: any) {
      console.error('Failed to load file:', error);
      alert('Erreur lors de l\'ouverture du fichier: ' + error.message);
    }
  };

  return (
    <div className="project-panel">
      <div className="project-content">
        {/* Action Buttons */}
        <div className="project-actions">
          <button className="toolbar-btn" onClick={() => setShowCreateModal(true)} title="Nouveau projet">
            <FilePlus size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleOpenProject} title="Ouvrir un projet">
            <FolderOpen size={20} strokeWidth={1} />
          </button>
        </div>

        {/* Current Project Info */}
        {currentProject ? (
          <div className="current-project-info">
            <CollapsibleSection title="Projet actuel" defaultExpanded={true}>
              <div className="project-meta">
                <div className="project-meta-row">
                  <span className="project-meta-label">Nom:</span>
                  <span>{currentProject.name}</span>
                </div>
                <div className="project-meta-row">
                  <span className="project-meta-label">Type:</span>
                  <span className="project-type-badge">
                    {getProjectTypeName(currentProject.type)}
                  </span>
                </div>
                <div className="project-meta-row">
                  <span className="project-meta-label">Chemin:</span>
                  <span title={currentProject.path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentProject.path}
                  </span>
                </div>
                <div className="project-meta-row">
                  <span className="project-meta-label">Créé le:</span>
                  <span>{new Date(currentProject.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </CollapsibleSection>

            {/* File Tree for Notes projects */}
            {currentProject.type === 'notes' && (
              <CollapsibleSection title="Fichiers" defaultExpanded={true}>
                <FileTree rootPath={currentProject.path} onFileSelect={handleFileSelect} />
              </CollapsibleSection>
            )}

            <button
              className="project-btn"
              onClick={closeProject}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              Fermer le projet
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <p>Aucun projet ouvert</p>
            <p>Créez un nouveau projet ou ouvrez un projet existant</p>
          </div>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <CollapsibleSection title="Projets récents" defaultExpanded={false}>
            <div className="recent-projects-list">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="recent-project-item"
                >
                  <div
                    className="recent-project-content"
                    onClick={() => handleLoadRecentProject(project)}
                  >
                    <div className="recent-project-name">
                      {project.name} <span className="project-type-badge">{getProjectTypeName(project.type)}</span>
                    </div>
                    <div className="recent-project-path">{project.path}</div>
                  </div>
                  <button
                    className="recent-project-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRecentProject(project);
                    }}
                    title="Retirer des projets récents"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="create-project-modal" onClick={() => setShowCreateModal(false)}>
          <div className="create-project-content" onClick={(e) => e.stopPropagation()}>
            <h3>Créer un nouveau projet</h3>

            <div className="form-field">
              <label>Type de projet</label>
              <select
                value={newProjectType}
                onChange={(e) => setNewProjectType(e.target.value as any)}
              >
                <option value="article">Article</option>
                <option value="book">Livre</option>
                <option value="presentation">Présentation</option>
                <option value="notes">Notes (dossier existant)</option>
              </select>
            </div>

            {newProjectType !== 'notes' && (
              <div className="form-field">
                <label>Nom du projet</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Mon article"
                  autoFocus
                />
              </div>
            )}

            <div className="form-field">
              <label>{newProjectType === 'notes' ? 'Dossier de notes' : 'Emplacement'}</label>
              <div className="path-selector">
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  placeholder={newProjectType === 'notes' ? '/chemin/vers/mes-notes' : '/chemin/vers/dossier'}
                  readOnly
                />
                <button onClick={handleSelectPath}>Parcourir</button>
              </div>
              {newProjectType === 'notes' && (
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#888', fontSize: '0.75rem' }}>
                  Sélectionnez un dossier existant contenant vos fichiers Markdown
                </small>
              )}
            </div>

            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                Annuler
              </button>
              <button
                className="btn-submit"
                onClick={handleCreateProject}
                disabled={isCreating || (newProjectType !== 'notes' && !newProjectName) || !newProjectPath}
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
