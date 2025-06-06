const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveClassData: (classData) => ipcRenderer.invoke('save-class-data', classData),
  loadAllClasses: () => ipcRenderer.invoke('load-all-classes'),
  deleteClass: (className) => ipcRenderer.invoke('delete-class', className),
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // Menu event listeners
  onMenuNewClass: (callback) => ipcRenderer.on('menu-new-class', callback),
  onMenuImportCSV: (callback) => ipcRenderer.on('menu-import-csv', callback),
  onMenuTeamFormation: (callback) => ipcRenderer.on('menu-team-formation', callback),
  onMenuPairFormation: (callback) => ipcRenderer.on('menu-pair-formation', callback)
});