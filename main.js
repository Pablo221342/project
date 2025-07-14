// src/main.js
const path     = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { initDbHandlers }    = require('./utils/db');
const { initExcelHandlers } = require('./utils/excel');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

app.whenReady().then(() => {
  // 1) Registra handlers de BD y Excel
  initDbHandlers(ipcMain, app);
  initExcelHandlers(ipcMain, dialog);

  // 2) Nuevo handler: pide medio de pago antes de registrar la venta
  ipcMain.handle('ventas:seleccionar-medio-pago', async () => {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Efectivo', 'Tarjeta', 'Transferencia', 'Cancelar'],
      title: 'Medio de pago',
      message: 'Selecciona el medio de pago para la venta'
    });
    if (response === 3) {
      // botón “Cancelar”
      throw new Error('cancel');
    }
    return ['efectivo', 'tarjeta', 'transferencia'][response];
  });

  // 3) Crea la ventana
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});