'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const skill = (name, folder = name, provider = 'claude') => ({
  id: name, name, description: '', provider, scope: 'user', path: folder
});
const catalogSkill = (name, source = `skills/${name}`) => ({
  name, url: `https://github.com/example/skills/tree/main/${source}`
});
const docx = catalogSkill('Word Documents', 'skills/docx');

const { installedSkillKeys, isCatalogSkillInstalled } = loadTs('src/shared/skillCatalogMatch.ts');

test('matches POSIX and Windows folders with spaces, trailing separators, and mixed case', () => {
  const keys = installedSkillKeys([
    skill('Document tools', '/home/New Contributor/.claude/skills/DOCX/'),
    skill('Other name', 'C:\\Users\\New Contributor\\.claude\\skills\\PDF\\')
  ]);
  assert.equal(isCatalogSkillInstalled(catalogSkill('Word Documents', 'skills/docx/'), keys), true);
  assert.equal(isCatalogSkillInstalled(catalogSkill('PDF tools', 'skills/pdf'), keys), true);
});

test('a repo-root catalog name identifies the destination, not a frontmatter alias', () => {
  const keys = installedSkillKeys([skill('color-expert', '/home/me/.claude/skills/custom-folder')]);
  assert.equal(isCatalogSkillInstalled({ name: 'COLOR-EXPERT', url: 'https://github.com/example/colors.git/?tab=readme#usage' }, keys), false);
  assert.equal(isCatalogSkillInstalled(catalogSkill('Colors', 'skills/color-expert'), keys), false);
  assert.equal(isCatalogSkillInstalled({ name: 'CUSTOM-FOLDER', url: 'https://github.com/example/colors' }, keys), true);
});

test('unsafe or unresolved sources are not guessed from a matching display name', () => {
  const keys = installedSkillKeys([skill('docx', '/home/me/.claude/skills/docx')]);
  for (const url of [
    'https://officialskills.sh/example/docx',
    'https://example.com/docx',
    'https://github.com/orgs/docx',
    'https://github.com/example/skills/tree/main/.docx',
    'https://github.com/example/skills/tree/main/a..docx'
  ]) assert.equal(isCatalogSkillInstalled({ name: 'docx', url }, keys), false, url);
  assert.equal(isCatalogSkillInstalled({ name: '', url: 'https://github.com/example/docx' }, keys), false);
});

test('URL query strings and fragments do not change an explicit source folder', () => {
  const keys = installedSkillKeys([skill('docx', '/home/me/.claude/skills/docx')]);
  assert.equal(isCatalogSkillInstalled({ ...docx, url: docx.url + '/?plain=1#readme' }, keys), true);
});

test('Codex plugins cannot satisfy a Claude skill match', () => {
  assert.equal(installedSkillKeys([skill('docx', '/home/me/.codex/plugins/docx', 'codex')]).size, 0);
});

test('real discovery reports a symlinked project skill and the catalog recognizes it', (t) => {
  const os = require('node:os');
  const { listLocalSkills } = loadTs('src/main/skills.ts');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill catalog with spaces-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'shared', 'document-tools');
  const skills = path.join(root, 'project', '.claude', 'skills');
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(skills, { recursive: true });
  fs.writeFileSync(path.join(target, 'SKILL.md'), '---\nname: document-tools\ndescription: A fixture\n---\n');
  fs.symlinkSync(target, path.join(skills, 'docx'), process.platform === 'win32' ? 'junction' : 'dir');
  const local = listLocalSkills({ cwds: [path.join(root, 'project')], bundledDir: null });
  const discovered = local.find((s) => s.path === path.join(skills, 'docx'));
  assert.ok(discovered, 'discovery follows the symlink and retains its install-folder name');
  assert.equal(isCatalogSkillInstalled(docx, installedSkillKeys([discovered])), true);
});
