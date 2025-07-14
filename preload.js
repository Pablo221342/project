// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  invoke:   (chan, data) => ipcRenderer.invoke(chan, data),
  on:       (chan, fn)   => ipcRenderer.on(chan, (e, d) => fn(d))
});