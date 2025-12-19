const electron = require('electron');
console.log('Electron type:', typeof electron);
console.log('Electron:', electron);
console.log('Has app?:', electron && electron.app);

if (electron && electron.app) {
  electron.app.whenReady().then(() => {
    console.log('Electron app is ready!');
    const win = new electron.BrowserWindow({ width: 800, height: 600 });
    win.loadURL('data:text/html,<h1>Hello from Electron!</h1>');
  });
} else {
  console.error('Electron not available!');
  process.exit(1);
}
