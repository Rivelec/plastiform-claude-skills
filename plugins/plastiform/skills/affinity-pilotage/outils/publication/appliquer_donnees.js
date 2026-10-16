// appliquer_donnees.js — Reporte les données centralisées (prix, références…) d'un fichier JSON dans les tableaux et
// textes repérés de TOUS les fichiers de langue, en conservant la mise en forme. Données communes → une seule saisie.
//
// UTILISATION (poste de travail, sans Claude)
//   1. Modifier les valeurs dans le fichier de données (ex. tarifs.json, à côté des .af), enregistrer.
//   2. Ouvrir dans Affinity un fichier du projet, puis Bibliothèque de scripts > « Appliquer les données » > Exécuter.
//      Chaque fichier de langue est ouvert, mis à jour, ENREGISTRÉ (réécrit en entier : le fichier ne grossit pas) puis
//      refermé. Un fichier ouvert avec des modifications non enregistrées est ignoré (l'enregistrer d'abord).
//   3. Relancer l'export (export_publication.js) pour régénérer les PDF.
//
// PARAMÈTRES : projet.json → "donnees": { "fichier": "tarifs.json", "calque": "PRIX", "garde": "€", "tolerance": 8,
//   "langues": ["FR", "EN", "ES", "DE"] } (sans projet.json : tarifs.json, calque PRIX, garde €, langues FR EN ES DE).
//   Fichier de données : { "tableaux": [{ "page", "planche", "x", "y", "contexte", "valeurs" | "prix" | "lignes": [{ "prix" }] }] }
// RÈGLES
//   - un bloc est retrouvé par sa planche et sa position (x, y à ±tolerance px) parmi les textes du calque indiqué ;
//   - segments : cellules pour un tableau (glyphe de saut « TableCell » : un paragraphe DANS une cellule ne compte
//     pas), paragraphes pour un cadre de texte ; nombre de segments différent → bloc ignoré et signalé ;
//   - seuls les segments qui changent sont réécrits ; un segment qui ne contient pas le texte « garde » (ex. « € »)
//     n'est jamais écrasé (ex. « Contáctenos » en ES) ;
//   - compte rendu : <sortie>/donnees_log.txt (EXPORTS/ par défaut).
// Lancé par Claude (bin/affinity_run.sh) : run/args.json facultatif { "dossier", "langues", "simulation": true }
const { Document } = require('/document.js'); const fs = require('/fs.js');
const C = require('/commands.js'); const { Selection, TextSelection } = require('/selections.js');
const { StoryRange, StoryIoFormat, HardBreakType } = require('/story.js');
const tag = n => Object.prototype.toString.call(n).slice(8, -1); const nm = n => { try { return String(n.description || ''); } catch (e) { return ''; } };
const lire = p => { const u = new Uint8Array(fs.File.readAll(p).buffer); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); try { return decodeURIComponent(escape(s)); } catch (e) { return s; } };
const existe = p => { try { return fs.exists(p); } catch (e) { return false; } };
const OUT = '__OUTILS__'; const PAR_CLAUDE = OUT.charAt(0) === '/';
const ARGS = (() => { if (!PAR_CLAUDE) return {}; try { return JSON.parse(lire(OUT + 'run/args.json')); } catch (e) { return {}; } })();
const SIMULATION = !!ARGS.simulation; const log = []; const t0 = Date.now(); let JOURNAL = null;
function journal(finir) {
  const t = new Date().toISOString() + (SIMULATION ? ' (SIMULATION)' : '') + '\n' + log.join('\n') + '\n';
  if (JOURNAL) { try { const f = fs.File.create(JOURNAL, 'wb'); f.writeStringAsUtf8(t); f.close(); } catch (e) { } }
  if (finir && PAR_CLAUDE) { try { const f = fs.File.create(OUT + 'run/out_run.txt', 'ab'); f.writeStringAsUtf8(log.join('\n') + '\nFIN\n'); f.close(); } catch (e) { } }
}

// ---------- 1. Projet et données ----------
let dossier = null, P = null;
const cands = []; if (ARGS.dossier) cands.push(ARGS.dossier.replace(/\/?$/, '/'));
for (const d of [...Document.all]) { const m = String(d.path || '').match(/^(.*\/)[^\/]+$/); if (m) { cands.push(m[1]); cands.push(m[1].replace(/[^\/]+\/$/, '')); } }
for (const c of cands) {
  if (existe(c + 'projet.json')) { const j = JSON.parse(lire(c + 'projet.json')); if (j.donnees) { dossier = c; P = Object.assign({ calque: null, garde: null, tolerance: 8 }, j.donnees); P.langues = P.langues || Object.keys((j.fichiers && j.fichiers.langues) || {}); P.fichiersLangue = (j.fichiers && j.fichiers.langues) || null; P.modele = (j.fichiers && j.fichiers.modele_langue) || '{langue}.af'; P.sortie = (j.fichiers && j.fichiers.exports) || 'EXPORTS/'; break; } }
  if (existe(c + 'tarifs.json')) { dossier = c; P = { fichier: 'tarifs.json', calque: 'PRIX', garde: '€', tolerance: 8, langues: ['FR', 'EN', 'ES', 'DE'], modele: '{langue}.af', sortie: 'EXPORTS/' }; break; }
}
if (!dossier) { console.log('Aucun projet trouvé : ouvrez un fichier du projet (projet.json avec une section "donnees", ou tarifs.json à côté).'); throw new Error('aucun projet'); }
JOURNAL = dossier + P.sortie.replace(/\/?$/, '/') + 'donnees_log.txt'; try { fs.createDirectories(dossier + P.sortie); } catch (e) { }
const D = JSON.parse(lire(dossier + P.fichier));
const blocs = (D.tableaux || []).map(t => ({ ...t, valeurs: (t.valeurs || t.prix || (t.lignes || []).map(l => l.prix || l.valeur)).map(String) }));
const calque = D.calque !== undefined && D.calque !== null ? D.calque : P.calque; const garde = D.garde !== undefined && D.garde !== null ? D.garde : P.garde; const TOL = D.tolerance || P.tolerance || 8;
log.push('Données : ' + dossier + P.fichier + ' — ' + blocs.length + ' bloc(s) ; calque ' + (calque || '(tous)') + ' ; garde ' + (garde || '(aucune)') + (SIMULATION ? ' ; SIMULATION' : ''));

// Enregistrement compact : doc.save() par script AJOUTE au fichier (qui grossit à chaque passage) ; on réécrit donc le
// fichier entier sous un nom temporaire puis on le remet à sa place (l'original est gardé jusqu'au bout).
function enregistrerCompact(doc, chemin) {
  if (/\.afpackage\/*$/i.test(chemin)) return 'NON enregistré (.afpackage : enregistrer dans l\'interface après vérification)';
  doc.save();
  const tmp = chemin.replace(/\.af$/, '') + '_compact_' + Date.now() + '.af', bak = chemin + '.avant_compactage';
  try { doc.saveAs(tmp); doc.close(); } catch (e) { try { doc.close(); } catch (e2) { } return 'enregistré (non compacté : ' + e.message + ')'; }
  try {
    if (!existe(tmp) || fs.getFileSize(tmp) < 1024) throw new Error('fichier compact vide');
    fs.rename(chemin, bak); fs.rename(tmp, chemin); fs.remove(bak); return 'enregistré et compacté';
  } catch (e) {
    try { if (!existe(chemin) && existe(bak)) fs.rename(bak, chemin); } catch (e2) { }
    return 'enregistré (non compacté : ' + e.message + ' ; copie compacte : ' + tmp + ')';
  }
}

// ---------- 2. Repérage et segments ----------
const brut = c => String(c.story.getText(0, -1, StoryIoFormat.Raw));
function segments(c, parCellule) {
  const t = brut(c); const r = []; let d = 0; const st = c.story;
  for (let i = 0; i < t.length; i++) {
    if (t.charCodeAt(i) !== 0x2029) continue;
    let coupe = true; if (parCellule) { try { const hb = st.getHardBreakType(i); coupe = !!hb && (hb.equals ? hb.equals(HardBreakType.TableCell) : hb === HardBreakType.TableCell); } catch (e) { coupe = true; } }
    if (coupe) { r.push({ a: d, b: i, t: t.slice(d, i) }); d = i + 1; }
  }
  r.push({ a: d, b: t.length, t: t.slice(d) }); return r;
}
function textesRepere(doc) {
  const res = [];
  [...doc.spreads].forEach((sp, si) => { for (const top of sp.children) { if (calque && nm(top) !== calque) continue;
    const f = x => { if (x.isTextNode) { const b = x.spreadBaseBox; res.push({ sp, si, c: x, x: b.x, y: b.y }); } for (const c of x.children) { const t = tag(c); if (t !== 'EmbeddedDocumentNode' && t !== 'PhysicalNode') f(c); } };
    f(top); } });
  return res;
}

// ---------- 3. Application par langue ----------
for (const LG of (ARGS.langues || P.langues)) {
  const chemin = dossier + ((P.fichiersLangue && P.fichiersLangue[LG]) || P.modele.replace('{langue}', LG));
  if (!existe(chemin)) { log.push(LG + ' : fichier absent ' + chemin); continue; }
  if (/\.afpackage\/*$/i.test(chemin) && !SIMULATION) { log.push(LG + ' : ' + chemin + ' est un .afpackage : mise à jour par script non prise en charge (risque de corruption), ignoré — reporter les valeurs dans l\'interface'); continue; }
  try {
    const deja = [...Document.all].find(d => d.path === chemin);
    if (deja && deja.isDirty) { log.push(LG + ' : ouvert avec des modifications non enregistrées, ignoré'); continue; }
    if (deja) deja.close();
    const doc = Document.load(chemin); const textes = textesRepere(doc); let nSeg = 0, nBloc = 0;
    for (const B of blocs) {
      const n = textes.find(t => t.si === B.planche && Math.abs(t.x - B.x) <= TOL && Math.abs(t.y - B.y) <= TOL);
      if (!n) { log.push(LG + ' : bloc introuvable p.' + B.page + ' (' + B.x + ', ' + B.y + ') ' + (B.contexte || '')); continue; }
      const estTableau = tag(n.c) === 'TableTextNode';
      let segs = segments(n.c, estTableau);
      if (segs.length !== B.valeurs.length && estTableau) { const s2 = segments(n.c, false); if (s2.length === B.valeurs.length) segs = s2; }
      if (segs.length !== B.valeurs.length) { log.push(LG + ' : p.' + B.page + ' ' + (B.contexte || '') + ' : ' + segs.length + ' segment(s) dans le document, ' + B.valeurs.length + ' dans les données — ignoré'); continue; }
      let modif = false;
      for (let i = segs.length - 1; i >= 0; i--) {
        const v = B.valeurs[i]; const s = segs[i];
        if (s.t === v || (garde && s.t.indexOf(garde) < 0)) continue;
        if (!SIMULATION) {
          try { if (!doc.currentSpread.isSameNode(n.sp)) doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(n.sp)); } catch (e) { doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(n.sp)); }
          const sel = Selection.create(doc, n.c); sel.addSubSelectionForNode(n.c, TextSelection.create(new StoryRange(s.a, s.b)));
          doc.executeCommand(C.DocumentCommand.createSetText(sel, v));
        }
        nSeg++; modif = true; log.push(LG + ' : p.' + B.page + ' ' + (B.contexte || '') + ' ligne ' + (i + 1) + ' : ' + s.t + ' → ' + v);
      }
      if (modif) nBloc++;
    }
    let etat = '';
    if (nSeg && !SIMULATION) etat = ', ' + enregistrerCompact(doc, chemin); else doc.close();
    if (deja) Document.load(chemin);
    log.push(LG + ' : ' + nSeg + ' segment(s) ' + (SIMULATION ? 'à modifier' : 'modifié(s)') + ' dans ' + nBloc + ' bloc(s) sur ' + blocs.length + etat);
  } catch (e) { log.push(LG + ' : ERREUR ' + e.message); }
  journal(false);
}
log.push('Terminé en ' + Math.round((Date.now() - t0) / 1000) + ' s' + (SIMULATION ? ' (simulation : rien n\'a été modifié)' : ''));
journal(true); console.log(log.join('\n'));
