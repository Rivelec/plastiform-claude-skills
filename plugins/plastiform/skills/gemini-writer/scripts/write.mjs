#!/usr/bin/env node
// Writes, with Gemini through OpenRouter, a text whose content is already decided in the brief:
// Gemini only writes it, as a Rivelec employee would (references/rules.md), in the form of its
// genre (types.mjs). Checks the answer and, when a check fails, asks Gemini once to fix only those
// points.
//
//   node write.mjs brief.json [--out <dir>] [--model <id>] [--no-repair]
//
// Prints the Markdown; with --out, also writes content.json (content, checks, cost) and content.md.
// Key: OPENROUTER_API_KEY, else ~/.config/openrouter/key.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPES } from './types.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const briefPath = args.find((a, i) => !a.startsWith('--') && !['--out', '--model'].includes(args[i - 1]));
if (!briefPath) { console.error('Usage: node write.mjs brief.json [--out <dir>] [--model <id>] [--no-repair]'); process.exit(2); }
const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
const type = TYPES[brief.type];
if (!type) { console.error(`type « ${brief.type} » inconnu : ${Object.keys(TYPES).join(', ')}`); process.exit(2); }
const given = brief[type.input];
if (!Array.isArray(given) || !given.length) {
  console.error(type.input === 'sections'
    ? 'brief.sections : les sections décidées, dans l\'ordre, chacune { "heading": "sujet", "points": ["ce qu\'elle dit"] }'
    : 'brief.content : les points à dire, dans l\'ordre');
  process.exit(2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULES = fs.readFileSync(path.join(HERE, '../references/rules.md'), 'utf8').trim();
const MODEL = opt('--model') ?? process.env.GEMINI_WRITER_MODEL ?? 'google/gemini-3.1-pro-preview';
const keyFile = path.join(os.homedir(), '.config/openrouter/key');
const KEY = process.env.OPENROUTER_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '');
if (!KEY) { console.error(`Pas de clé OpenRouter : OPENROUTER_API_KEY ou ${keyFile}`); process.exit(2); }

const system = [RULES, '', type.prompt(brief), '', `Écris dans la langue dont le code ISO 639-1 est « ${brief.language ?? 'fr'} ».`].join('\n');
const { type: _t, ...data } = brief;
const messages = [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(data, null, 1) }];

let cost = 0;
const ask = async () => {
  // ponytail: two tries on an empty or failed answer (Google returns 502 inside a 200 now and then).
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, messages, max_tokens: 16000,
        reasoning: { effort: 'high' },
        provider: { require_parameters: true },
        response_format: { type: 'json_schema', json_schema: { name: brief.type.replace(/\W/g, '_'), strict: true, schema: type.schema } },
      }),
    });
    const body = await res.json().catch(() => ({}));
    cost += body.usage?.cost ?? 0;
    const choice = body.choices?.[0];
    if (res.ok && choice?.message?.content && choice.finish_reason !== 'error') return choice.message.content;
    const why = JSON.stringify(body.error ?? choice?.error ?? body).slice(0, 400);
    if (attempt >= 2 || res.status === 401 || res.status === 402 || res.status === 404) throw new Error(`OpenRouter ${res.status} : ${why}`);
  }
};

// Checks common to every type: machine tells, and numbers that come from nowhere.
const briefNumbers = new Set((JSON.stringify(brief).match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')));
const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const common = (c) => {
  const all = [type.body(c), ...Object.values(c).filter((v) => typeof v === 'string')].join('\n');
  const out = [];
  if (/—/.test(all)) out.push('Tiret long (—) : remplace-le par un point ou une virgule.');
  if (/\p{Extended_Pictographic}/u.test(all)) out.push('Emoji : aucun.');
  if (/\*\*/.test(type.body(c))) out.push('Gras (**) dans le texte : aucun.');
  if (/!/.test(type.body(c).replace(/https?:\/\/\S+/g, ''))) out.push("Point d'exclamation : aucun.");
  // ponytail: split on . ? ! followed by a space; a formula or a list item counts as a sentence.
  const long = type.body(c).split(/\n+|(?<=[.?!])\s+/).filter((x) => x.split(/\s+/).filter(Boolean).length > 30);
  if (long.length) out.push(`Phrases de plus de 30 mots, à couper : ${long.map((x) => '« ' + x.slice(0, 60) + '… »').join(' ; ')}`);
  // Three sentences in a row that open with the same word read like a form (« Vous… Vous… Vous… »).
  const firsts = type.body(c).split(/\n+|(?<=[.?!])\s+/).map((x) => fold(x.trim().split(/[\s,']+/)[0] ?? '')).filter(Boolean);
  const runs = [...new Set(firsts.filter((w, i) => i >= 2 && w === firsts[i - 1] && w === firsts[i - 2]))];
  if (runs.length) out.push(`Trois phrases de suite commencent par ${runs.map((w) => '« ' + w + ' »').join(', ')} : varie les débuts de phrase.`);
  const ai = all.match(/\b(crucia(?:l|le|les|ux)|essentiel(?:le)?s?|incontournables?|révolutionnaires?|optimis(?:er|ez|ation)|booster|tirer parti|plonger dans|delve|leverag(?:e|ing)|unlock|elevate|seamless(?:ly)?|game-changing|cutting-edge|robust)\b/giu);
  if (ai) out.push(`Vocabulaire d'IA : ${[...new Set(ai.map((w) => w.toLowerCase()))].join(', ')}.`);
  // ponytail: integers up to 10 pass (counts like « 3 étapes ») ; every other number must be in the brief.
  const invented = [...new Set((all.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')))].filter((n) => !briefNumbers.has(n) && !(Number.isInteger(+n) && +n <= 10));
  if (invented.length) out.push(`Chiffres absents du brief : ${invented.join(', ')}. Retire-les ou reprends ceux des faits.`);
  return out;
};
const check = (c) => [...common(c), ...type.checks(c, brief)];

let content = JSON.parse(await ask());
let problems = check(content);
let attempts = 1;
if (problems.length && !args.includes('--no-repair')) {
  messages.push({ role: 'assistant', content: JSON.stringify(content) });
  messages.push({ role: 'user', content: `Corrige seulement ces points et garde tout le reste tel quel :\n${problems.map((p) => '- ' + p).join('\n')}` });
  content = JSON.parse(await ask());
  problems = check(content);
  attempts = 2;
}

const markdown = type.render(content, brief);
process.stdout.write(markdown);
if (problems.length) console.error(`\nÀ vérifier :\n${problems.map((p) => '- ' + p).join('\n')}`);
console.error(`\n${MODEL}, ${attempts} passage${attempts > 1 ? 's' : ''}, $${cost.toFixed(3)}`);
const out = opt('--out');
if (out) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'content.json'), JSON.stringify({ type: brief.type, model: MODEL, attempts, cost, problems, content }, null, 2));
  fs.writeFileSync(path.join(out, 'content.md'), markdown);
}
