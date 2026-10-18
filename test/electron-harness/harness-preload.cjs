'use strict';

/**
 * The bridge a scenario gets. Deliberately small: report a result, resize the real
 * window, and ask main for the accessibility tree.
 *
 * A harness preload that exposed `require` or the whole `ipcRenderer` would let a
 * scenario reach around the renderer it is supposed to be measuring, and the first
 * convenient shortcut through it would end up being the thing under test.
 *
 * `resize` and `axTree` are here because neither is observable from inside the page:
 * a real responsive reading needs the real window to change size, not a div, and the
 * accessibility TREE is what the platform exposes to a screen reader rather than
 * what the DOM says - they differ, and #14 asks about the former.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harness', {
  report: (payload) => ipcRenderer.send('harness:result', payload),
  resize: (width, height) => ipcRenderer.invoke('harness:resize', { width, height }),
  axTree: () => ipcRenderer.invoke('harness:axtree'),
  // A trusted click at window coordinates, through Chromium's input pipeline.
  click: (x, y) => ipcRenderer.invoke('harness:click', { x, y }),
  // The renderer process's own private / working-set MB, read by main (IMPACT-LOOP-171).
  metrics: () => ipcRenderer.invoke('harness:metrics')
});
