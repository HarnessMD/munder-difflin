'use strict';
// The founder, 24 Sep 2026: the agent note button in the sidebar card is a
// notepad, not a paperclip (the paperclip means "attach a file").
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the sidebar note button draws the notepad icon, not the paperclip', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const btn = sidebar.slice(sidebar.indexOf('const clipBtn'), sidebar.indexOf('</button>', sidebar.indexOf('const clipBtn')));
  assert.match(btn, /<ProIcon name="note"/);
  assert.doesNotMatch(btn, /name="clip"/);
});

test('the note icon is a declared path in the icon set', () => {
  const icons = read('src/renderer/src/components/pro/icons.tsx');
  assert.match(icons, /\| 'note'/);
  assert.match(icons, /\n  note: 'M/);
});
