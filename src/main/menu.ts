import { Menu, MenuItemConstructorOptions, BrowserWindow, app } from 'electron';

/**
 * Creates and returns the application menu with keyboard shortcuts
 */
export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // App Menu (Mac only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Paramètres',
                accelerator: 'Cmd+,',
                click: () => {
                  mainWindow.webContents.send('menu:open-settings');
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouveau fichier',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:new-file');
          },
        },
        {
          label: 'Ouvrir fichier',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-file');
          },
        },
        {
          label: 'Sauvegarder',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save-file');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Nouveau projet',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu:new-project');
          },
        },
        {
          label: 'Ouvrir projet',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            mainWindow.webContents.send('menu:open-project');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Exporter PDF',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu:export-pdf');
          },
        },
        { type: 'separator' as const },
        ...(isMac
          ? []
          : [
              {
                label: 'Paramètres',
                accelerator: 'Ctrl+,',
                click: () => {
                  mainWindow.webContents.send('menu:open-settings');
                },
              },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ]),
      ],
    },

    // Edit Menu
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Gras',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu:format-bold');
          },
        },
        {
          label: 'Italique',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu:format-italic');
          },
        },
        {
          label: 'Insérer lien',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('menu:insert-link');
          },
        },
        {
          label: 'Insérer citation',
          accelerator: 'CmdOrCtrl+\'',
          click: () => {
            mainWindow.webContents.send('menu:insert-citation');
          },
        },
        {
          label: 'Insérer tableau',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            mainWindow.webContents.send('menu:insert-table');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Note de bas de page',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            mainWindow.webContents.send('menu:insert-footnote');
          },
        },
        {
          label: 'Bloc citation',
          accelerator: 'CmdOrCtrl+Shift+Q',
          click: () => {
            mainWindow.webContents.send('menu:insert-blockquote');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Statistiques du document',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu:toggle-stats');
          },
        },
        {
          label: 'Vérifier les citations',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('menu:check-citations');
          },
        },
      ],
    },

    // View Menu
    {
      label: 'Affichage',
      submenu: [
        // Preview disabled for now
        // {
        //   label: 'Basculer aperçu',
        //   accelerator: 'CmdOrCtrl+K',
        //   click: () => {
        //     mainWindow.webContents.send('menu:toggle-preview');
        //   },
        // },
        // { type: 'separator' as const },
        {
          label: 'Panneau Projects',
          accelerator: 'Alt+1',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'projects');
          },
        },
        {
          label: 'Panneau Bibliography',
          accelerator: 'Alt+2',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'bibliography');
          },
        },
        {
          label: 'Panneau Chat',
          accelerator: 'Alt+3',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'chat');
          },
        },
        {
          label: 'Panneau PDFs',
          accelerator: 'Alt+4',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'pdfs');
          },
        },
        {
          label: 'Panneau Corpus',
          accelerator: 'Alt+5',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'corpus');
          },
        },
        {
          label: 'Panneau Settings',
          accelerator: 'Alt+6',
          click: () => {
            mainWindow.webContents.send('menu:switch-panel', 'settings');
          },
        },
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },

    // Bibliography Menu
    {
      label: 'Bibliographie',
      submenu: [
        {
          label: 'Importer fichier BibTeX',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            mainWindow.webContents.send('menu:import-bibtex');
          },
        },
        {
          label: 'Rechercher citations',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu:search-citations');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Connecter Zotero',
          click: () => {
            mainWindow.webContents.send('menu:connect-zotero');
          },
        },
      ],
    },

    // Window Menu
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/yourusername/mdfocus-electron');
          },
        },
        {
          label: 'Signaler un problème',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/yourusername/mdfocus-electron/issues');
          },
        },
        { type: 'separator' as const },
        {
          label: 'À propos de mdFocus',
          click: () => {
            mainWindow.webContents.send('menu:about');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Sets up the application menu
 */
export function setupApplicationMenu(mainWindow: BrowserWindow): void {
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);
}
