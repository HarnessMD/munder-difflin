'use strict';

/**
 * Add agent: picking a character used to overwrite the name the person had
 * already typed, because the picker always reported the character's own name
 * (`onPick` did `if (displayName) setName(displayName)`). Kevin hit it typing a
 * name and then choosing an avatar.
 *
 * `nameAfterPick` (468b6214) decides it instead: the picker's suggestion is used
 * only while the person has not chosen a name themselves — typed it, imported it
 * with a hire, or had it handed over — or while the field is empty.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { nameAfterPick } = loadTs('src/shared/pickName.ts');

test('a name the person chose stays when a character is picked', () => {
  assert.equal(nameAfterPick('Chaitanya', true, 'Dwight'), 'Chaitanya');
  // Picking twice must not wear the typed name down.
  assert.equal(nameAfterPick(nameAfterPick('Chaitanya', true, 'Dwight'), true, 'Pam'), 'Chaitanya');
});

test('an unchosen name takes the picked character’s name', () => {
  // 'Jim' is the field's default, not a choice: the picker owns it.
  assert.equal(nameAfterPick('Jim', false, 'Dwight'), 'Dwight');
});

test('a chosen name that is empty or only spaces takes the suggestion', () => {
  assert.equal(nameAfterPick('', true, 'Dwight'), 'Dwight');
  assert.equal(nameAfterPick('   ', true, 'Dwight'), 'Dwight');
  assert.equal(nameAfterPick('\t \n', true, 'Dwight'), 'Dwight');
  // Same when nothing was chosen.
  assert.equal(nameAfterPick('', false, 'Dwight'), 'Dwight');
});

test('no suggestion keeps the current name', () => {
  assert.equal(nameAfterPick('Chaitanya', true, undefined), 'Chaitanya');
  assert.equal(nameAfterPick('Jim', false, undefined), 'Jim');
  // An empty suggestion is no suggestion: it must never blank the field.
  assert.equal(nameAfterPick('Chaitanya', true, ''), 'Chaitanya');
  assert.equal(nameAfterPick('Jim', false, ''), 'Jim');
});
