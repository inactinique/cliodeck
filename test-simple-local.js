const { app, BrowserWindow } = require('electron');

console.log('✅ Electron module loaded!');
console.log('app:', typeof app);

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>Success!</h1>');
  console.log('✅ Window created!');
});

app.on('window-all-closed', () => app.quit());
