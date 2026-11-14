#!/usr/bin/env node
/**
 * check-ptBR-parity.cjs — paridade de chaves en.json <-> pt-BR.json.
 *
 * O i18next cai em silencio para o ingles (`fallbackLng: 'en'`) quando uma
 * chave falta no locale ativo. Este script impede que isso passe batido:
 * falha (exit 1) listando chaves ausentes, orfas e placeholders `{{...}}`
 * divergentes. Rode antes de cada push da branch feat/pt-BR.
 *
 * Uso:
 *   node tools/check-ptBR-parity.cjs [--audit-copies]
 *
 * --audit-copies: lista (sem falhar) strings ainda identicas ao ingles,
 *   util na revisao final (Task 7). Nao falha porque nomes proprios, CLIs
 *   e comandos ficam propositalmente em ingles.
 *
 * Segue o mesmo espirito de test/arabic-ui.test.cjs e
 * test/i18n-god-name.test.cjs, mas focado no par en/pt-BR.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN_PATH = path.join(ROOT, 'src', 'renderer', 'src', 'i18n', 'locales', 'en.json');
const PT_PATH = path.join(ROOT, 'src', 'renderer', 'src', 'i18n', 'locales', 'pt-BR.json');

const AUDIT_COPIES = process.argv.includes('--audit-copies');

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Achata objeto em mapa caminho -> valor-folha. Arrays viram `chave.indice`. */
function flatten(node, prefix, out) {
  if (typeof node === 'string' || typeof node !== 'object' || node === null) {
    out.set(prefix, node);
    return out;
  }
  const entries = Array.isArray(node)
    ? node.map((v, i) => [String(i), v])
    : Object.entries(node);
  for (const [k, v] of entries) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/** Extrai placeholders `{{nome}}` de uma string, como conjunto ordenado. */
function placeholders(s) {
  const found = s.match(/\{\{[^}]+\}\}/g) || [];
  return [...new Set(found)].sort();
}

function main() {
  const en = flatten(load(EN_PATH), '', new Map());
  const pt = flatten(load(PT_PATH), '', new Map());

  const missing = [...en.keys()].filter((k) => !pt.has(k)).sort();
  const orphan = [...pt.keys()].filter((k) => !en.has(k)).sort();

  const placeholderBreaks = [];
  const typeBreaks = [];
  for (const [k, enVal] of en) {
    if (!pt.has(k)) continue;
    const ptVal = pt.get(k);
    if (typeof enVal !== typeof ptVal) {
      typeBreaks.push(`${k} (en: ${typeof enVal}, pt-BR: ${typeof ptVal})`);
      continue;
    }
    if (typeof enVal === 'string') {
      const a = placeholders(enVal);
      const b = placeholders(ptVal);
      if (a.join('|') !== b.join('|')) {
        placeholderBreaks.push(`${k} (en: ${a.join(', ') || '—'} | pt-BR: ${b.join(', ') || '—'})`);
      }
    }
  }

  let failed = false;
  const report = (title, items) => {
    if (!items.length) return;
    failed = true;
    console.error(`\n${title} (${items.length}):`);
    for (const i of items) console.error(`  - ${i}`);
  };

  report('CHAVES AUSENTES em pt-BR.json (cairiam p/ ingles em silencio)', missing);
  report('CHAVES ORFAS em pt-BR.json (nao existem em en.json)', orphan);
  report('PLACEHOLDERS DIVERGENTES (ex. {{godName}} quebrado)', placeholderBreaks);
  report('TIPOS DIVERGENTES', typeBreaks);

  if (AUDIT_COPIES) {
    const copies = [...en.entries()]
      .filter(([k, v]) => typeof v === 'string' && pt.get(k) === v)
      .map(([k]) => k)
      .sort();
    console.log(`\nStrings ainda identicas ao ingles: ${copies.length}/${en.size}`);
    for (const k of copies.slice(0, 50)) console.log(`  = ${k}`);
    if (copies.length > 50) console.log(`  ... e mais ${copies.length - 50}`);
  }

  if (failed) {
    console.error('\nPARIDADE FALHOU. Traduza as chaves listadas e rode de novo.');
    process.exit(1);
  }
  console.log(`Paridade OK: ${pt.size} chaves, 0 ausentes, 0 orfas, placeholders intactos.`);
}

main();
