// export_publication.js — Exporte une publication multilingue (catalogue, brochure…) dans toutes ses versions
// (langue × variante × support), avec la bonne référence imprimée, le bon nom de fichier et le titre du PDF.
//
// UTILISATION (poste de travail, sans Claude)
//   1. Ouvrir dans Affinity un fichier de la publication (BASE.af, FR.af…).
//   2. Bibliothèque de scripts > « Export publication » (ou ouvrir ce fichier dans l'éditeur de script) > Exécuter.
//   Le dossier est retrouvé à partir du document ouvert : projet.json (ou l'ancien catalogue.json) à côté du
//   document ou un dossier au-dessus. Les fichiers de langue sont ouverts, exportés puis refermés SANS être
//   enregistrés ; un fichier ouvert avec des modifications non enregistrées est ignoré (l'enregistrer d'abord).
//   Prérequis (une fois par poste) : Réglages > Exécution de scripts : exécution activée, « Accéder au système de
//   fichiers » coché et le dossier du projet (ou un dossier parent) ajouté à la liste.
//
// PARAMÈTRES (projet.json) : projet.version, projet.prefixe, projet.annee, titres, variantes, elements, supports,
//   exports, reference, nom_fichier, sortie — voir _Outils_Affinity/modeles/projet.catalogue.json.
//   Monter la version : projet.version (ex. "1.1") — ou python3 python/projet.py version <dossier> 1.1 — puis relancer.
//
// RÉSULTAT : <sortie>/<nom_fichier>, ex. EXPORTS/WEB_FR_AP_BRO_RIV_38_2026_V1.0.pdf
//   - avant chaque export : éléments variables affichés / masqués selon la variante (calques nommés ou objets dont
//     le nom contient un motif), référence imprimée remplacée (motif reference.motif) ;
//   - titre, sujet, auteur du PDF écrits par mise à jour incrémentale (le contenu n'est pas réécrit) ;
//   - journal : <sortie>/export_log.txt.
// PRÉRÉGLAGES : pour chaque support, le premier préréglage EXISTANT de sa liste "prereglages".
//
// Lancé par Claude (_Outils_Affinity/bin/affinity_run.sh), les paramètres facultatifs de run/args.json sont lus :
//   { "dossier": "<dossier du projet>", "langues": ["FR"], "variantes": ["AP"], "supports": ["WEB"], "sortie": "<dossier>" }
const { Document, FileExportOptions, FileExportArea } = require('/document.js'); const fs = require('/fs.js');
const C = require('/commands.js'); const { Selection, TextSelection } = require('/selections.js');
const { StoryRange, StoryIoFormat } = require('/story.js'); const { Size } = require('/geometry.js');

const tag = n => Object.prototype.toString.call(n).slice(8, -1); const nm = n => { try { return String(n.description || ''); } catch (e) { return ''; } };
const lire = p => { const u = new Uint8Array(fs.File.readAll(p).buffer); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); try { return decodeURIComponent(escape(s)); } catch (e) { return s; } };
const existe = p => { try { return fs.exists(p); } catch (e) { return false; } };
const OUT = '__OUTILS__'; const PAR_CLAUDE = OUT.charAt(0) === '/';
const ARGS = (() => { if (!PAR_CLAUDE) return {}; try { return JSON.parse(lire(OUT + 'run/args.json')); } catch (e) { return {}; } })();
const log = []; const t0 = Date.now(); let JOURNAL = null;
function journal(finir) {
  const t = new Date().toISOString() + '\n' + log.join('\n') + '\n';
  if (JOURNAL) { try { const f = fs.File.create(JOURNAL, 'wb'); f.writeStringAsUtf8(t); f.close(); } catch (e) { } }
  if (finir && PAR_CLAUDE) { try { const f = fs.File.create(OUT + 'run/out_run.txt', 'ab'); f.writeStringAsUtf8(log.join('\n') + '\nFIN\n'); f.close(); } catch (e) { } }
}
function arreter(msg) { log.push(msg); journal(true); console.log(log.join('\n')); throw new Error(msg); }

// ---------- 1. Projet ----------
function trouverDossier() {
  const cands = []; if (ARGS.dossier) cands.push(ARGS.dossier.replace(/\/?$/, '/'));
  for (const d of [...Document.all]) { const m = String(d.path || '').match(/^(.*\/)[^\/]+$/); if (m) { cands.push(m[1]); cands.push(m[1].replace(/[^\/]+\/$/, '')); } }
  for (const c of cands) if (existe(c + 'projet.json') || existe(c + 'catalogue.json')) return c;
  return null;
}
const dossier = trouverDossier();
if (!dossier) arreter('Aucun projet trouvé : ouvrez un fichier de la publication (projet.json ou catalogue.json à côté) puis relancez.');
function charger() {
  if (existe(dossier + 'projet.json')) {
    const j = JSON.parse(lire(dossier + 'projet.json')); const pj = j.projet || {};
    return { prefixe: pj.prefixe, annee: String(pj.annee || ''), version: String(pj.version), auteur: pj.auteur || '', titres: j.titres || {},
      langues: (j.fichiers && j.fichiers.langues) || null, modeleLangue: (j.fichiers && j.fichiers.modele_langue) || '{langue}.af',
      variantes: j.variantes || {}, elements: j.elements || {}, supports: j.supports || {}, exports: j.exports || [],
      reference: j.reference || {}, nomFichier: j.nom_fichier || '{support}_{langue}_{variante}_{ref}.pdf', sortie: (j.fichiers && j.fichiers.exports) || 'EXPORTS/' };
  }
  const c = JSON.parse(lire(dossier + 'catalogue.json'));   // ancien format (catalogue 2026)
  const variantes = {}; for (const [k, v] of Object.entries(c.variantes || {})) variantes[k] = { libelle: v.libelle, afficher: [v.prix ? 'PRIX' : null, v.unceta ? 'UNCETA' : null].filter(Boolean), masquer: [v.prix ? null : 'PRIX', v.unceta ? null : 'UNCETA'].filter(Boolean) };
  return { prefixe: c.prefixe, annee: String(c.annee), version: String(c.version), auteur: 'Rivelec - Plastiform', titres: c.titres || {}, langues: null, modeleLangue: '{langue}.af',
    variantes, elements: { PRIX: { calque: 'PRIX' }, UNCETA: { motif: 'unceta' } }, supports: c.supports, exports: c.exports, reference: {}, nomFichier: '{support}_{langue}_{variante}_{ref}.pdf', sortie: 'EXPORTS/' };
}
const cfg = charger();
const remplir = (m, v) => String(m).replace(/\{(\w+)\}/g, (x, k) => v[k] !== undefined ? v[k] : x);
const modeleRef = cfg.reference.modele || '{prefixe}_{numero}_{annee}_V{version}';
const REF = new RegExp(cfg.reference.motif || (cfg.prefixe + '_\\d+_\\d{4}_V\\d+(?:\\.\\d+)*'));
const SORTIE = (ARGS.sortie ? ARGS.sortie.replace(/\/?$/, '/') : dossier + cfg.sortie.replace(/\/?$/, '/')); JOURNAL = SORTIE + 'export_log.txt';
try { if (!existe(SORTIE)) fs.createDirectories(SORTIE); } catch (e) { try { fs.createDirectory(SORTIE); } catch (e2) { } }
log.push('Projet : ' + dossier + ' — version ' + cfg.version + (existe(dossier + 'projet.json') ? '' : ' (catalogue.json, ancien format)'));
const presets = FileExportOptions.allPresetNames; const opt = {};
for (const s of Object.keys(cfg.supports)) { const p = (cfg.supports[s].prereglages || []).find(x => presets.indexOf(x) >= 0); if (!p) { log.push('Support ' + s + ' : AUCUN préréglage disponible parmi ' + JSON.stringify(cfg.supports[s].prereglages)); continue; } opt[s] = FileExportOptions.createWithPresetName(p); log.push('Support ' + s + ' : préréglage « ' + p + ' »'); }

// ---------- 2. Titre du PDF (mise à jour incrémentale : dictionnaire Info + XMP ; xref classique ou flux) ----------
function majTitre(s, titre, sujet, auteur) {
  const base = s.length; const sx = s.lastIndexOf('startxref'); const prev = parseInt(s.slice(sx + 9).trim(), 10);
  const classique = s.slice(prev, prev + 4) === 'xref';
  const dictXref = classique ? s.slice(s.lastIndexOf('trailer'), sx) : s.slice(prev, s.indexOf('stream', prev));
  const g = re => { const m = dictXref.match(re); return m ? m[1] : null; };
  const size = parseInt(g(/\/Size\s+(\d+)/), 10), root = g(/\/Root\s+(\d+)\s+0\s+R/), info = g(/\/Info\s+(\d+)\s+0\s+R/), id = g(/(\/ID\s*\[[^\]]*\])/);
  const objet = n => { if (!n) return null; const re = new RegExp('(^|[\\r\\n])' + n + ' 0 obj', 'g'); let m, last = -1; while ((m = re.exec(s))) last = m.index; if (last < 0) return null; const a = s.indexOf('obj', last) + 3; return s.slice(a, s.indexOf('endobj', a)).trim(); };
  const ascii = t => t.replace(/[^\x20-\x7e]/g, c => '&#x' + c.codePointAt(0).toString(16) + ';');
  const hex16 = t => { let h = 'FEFF'; for (let i = 0; i < t.length; i++) h += ('000' + t.charCodeAt(i).toString(16).toUpperCase()).slice(-4); return '<' + h + '>'; };
  const xml = t => ascii(t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const cat = objet(root); const meta = cat && (cat.match(/\/Metadata\s+(\d+)\s+0\s+R/) || [])[1];
  let dict = objet(info); dict = (dict && /^<</.test(dict)) ? dict : '<<>>';
  dict = dict.replace(/\/(Title|Author|Subject)\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>)/g, '').replace(/>>\s*$/, '/Title' + hex16(titre) + '/Subject' + hex16(sujet) + '/Author' + hex16(auteur) + '>>');
  const infoNum = size; let next = size + 1; const metaNum = meta ? parseInt(meta, 10) : null;
  const date = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const xmp = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">'
    + '<dc:format>application/pdf</dc:format><dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + xml(titre) + '</rdf:li></rdf:Alt></dc:title>'
    + '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">' + xml(sujet) + '</rdf:li></rdf:Alt></dc:description>'
    + '<dc:creator><rdf:Seq><rdf:li>' + xml(auteur) + '</rdf:li></rdf:Seq></dc:creator>'
    + '<xmp:CreatorTool>Affinity</xmp:CreatorTool><xmp:ModifyDate>' + date + '</xmp:ModifyDate><xmp:MetadataDate>' + date + '</xmp:MetadataDate>'
    + '</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
  let out = '\n'; const offs = {};
  offs[infoNum] = base + out.length; out += infoNum + ' 0 obj\n' + dict + '\nendobj\n';
  if (metaNum !== null) { offs[metaNum] = base + out.length; out += metaNum + ' 0 obj\n<</Type/Metadata/Subtype/XML/Length ' + xmp.length + '>>\nstream\n' + xmp + '\nendstream\nendobj\n'; }
  const tail = '/Root ' + root + ' 0 R/Info ' + infoNum + ' 0 R' + (id || '') + '/Prev ' + prev;
  if (classique) {
    const xref = base + out.length; out += 'xref\n'; for (const n of Object.keys(offs).map(Number).sort((a, b) => a - b)) out += n + ' 1\n' + ('000000000' + offs[n]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<</Size ' + Math.max(next, (metaNum || 0) + 1) + tail + '>>\nstartxref\n' + xref + '\n%%EOF\n';
  } else {
    const xrefNum = next++; const xref = base + out.length; offs[xrefNum] = xref;
    const nums = Object.keys(offs).map(Number).sort((a, b) => a - b); let idx = '', data = '';
    for (const n of nums) { idx += n + ' 1 '; data += '01' + ('0000000' + offs[n].toString(16)).slice(-8).toUpperCase() + '0000'; }
    data += '>';
    out += xrefNum + ' 0 obj\n<</Type/XRef/Size ' + Math.max(next, (metaNum || 0) + 1) + tail + '/W[1 4 2]/Index[' + idx.trim() + ']/Filter/ASCIIHexDecode/Length ' + data.length + '>>\nstream\n' + data + '\nendstream\nendobj\nstartxref\n' + xref + '\n%%EOF\n';
  }
  return out;
}
const latin1 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return s; };
function titrerPdf(chemin, titre, sujet) { const ajout = majTitre(latin1(fs.File.readAll(chemin).buffer), titre, sujet, cfg.auteur || ''); const f = fs.File.create(chemin, 'ab'); f.writeString(ajout); f.close(); }

// ---------- 3. Fichier de langue : éléments variables, référence, échauffement ----------
function regler(doc, cle, visible) {
  const def = cfg.elements[cle]; if (!def) { log.push('   élément « ' + cle + ' » non défini dans elements'); return 0; }
  const motif = def.motif ? new RegExp(def.motif, 'i') : null; let n = 0;
  for (const sp of [...doc.spreads]) {
    const sel = [];
    if (def.calque) { for (const c of sp.children) if (nm(c) === def.calque) sel.push(c); }
    else if (motif) (function w(x) { for (const c of x.children) { if (tag(c) === 'EmbeddedDocumentNode') continue; if (motif.test(nm(c))) sel.push(c); else if (tag(c) !== 'PhysicalNode') w(c); } })(sp);
    const a = sel.filter(c => { try { return c.isVisible !== visible; } catch (e) { return true; } }); if (!a.length) continue;
    doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(sp));
    for (const c of a) doc.executeCommand(C.DocumentCommand.createSetVisibility(Selection.create(doc, c), visible)); n += a.length;
  }
  return n;
}
const brut = c => String(c.story.getText(0, -1, StoryIoFormat.Raw));
function poserReference(doc, ref) {
  let n = 0;
  for (const sp of [...doc.spreads]) (function w(x) { for (const c of x.children) { if (tag(c) === 'EmbeddedDocumentNode' || tag(c) === 'PhysicalNode') continue;
    try { if (c.isTextNode) { const t = brut(c); const m = t.match(REF); if (m) { n++; if (m[0] !== ref) { doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(sp)); const s = Selection.create(doc, c); s.addSubSelectionForNode(c, TextSelection.create(new StoryRange(m.index, m.index + m[0].length))); doc.executeCommand(C.DocumentCommand.createSetText(s, ref)); } } } } catch (e) { }
    w(c); } })(sp);
  return n;
}
function echauffer(doc) {   // documents liés : getSpreads() force leur chargement (sinon aperçu flou) ; puis petits rendus (polices)
  for (const sp of [...doc.spreads]) (function w(x) { for (const c of x.children) { if (tag(c) === 'EmbeddedDocumentNode') { try { c.getSpreads(false); } catch (e) { } continue; } if (tag(c) !== 'PhysicalNode') w(c); } })(sp);
  const tmp = SORTIE + '_echauffement/'; try { if (!existe(tmp)) fs.createDirectory(tmp); } catch (e) { }
  const png = FileExportOptions.createWithPresetName('PNG');
  for (const sp of doc.spreads) { try { doc.export(tmp + 'p.png', png, FileExportArea.createForPages(String(sp.firstPageIndex + 1)), new Size(124, 175)); } catch (e) { } }
  try { for (const e of [...new fs.Directory(tmp).entries]) fs.remove(e.path); fs.remove(tmp); } catch (e) { }
}

// ---------- 4. Export ----------
const garde = (liste, v) => !liste || liste.indexOf(v) >= 0;
const exportsAFaire = cfg.exports.filter(e => garde(ARGS.langues, e.langue) && garde(ARGS.variantes, e.variante));
const langues = []; for (const e of exportsAFaire) if (langues.indexOf(e.langue) < 0) langues.push(e.langue);
let nOk = 0, nKo = 0;
for (const LG of langues) {
  const P = dossier + ((cfg.langues && cfg.langues[LG]) || remplir(cfg.modeleLangue, { langue: LG, prefixe: cfg.prefixe, annee: cfg.annee }));
  if (!existe(P)) { log.push(LG + ' : fichier absent ' + P); nKo++; continue; }
  let doc = [...Document.all].find(d => d.path === P); const dejaOuvert = !!doc;
  if (doc && doc.isDirty) { log.push(LG + ' : ignoré, ouvert avec des modifications non enregistrées (enregistrez-le puis relancez ; Affinity marque souvent un fichier de langue « modifié » dès l\'ouverture : pour lancer l\'export, ouvrir plutôt la BASE)'); nKo++; continue; }
  if (!doc) doc = Document.load(P);
  try { echauffer(doc); } catch (e) { log.push(LG + ' : échauffement ' + e.message); }
  for (const e of exportsAFaire.filter(x => x.langue === LG)) {
    const v = cfg.variantes[e.variante] || { afficher: [], masquer: [] };
    const ref = remplir(modeleRef, { prefixe: cfg.prefixe, numero: e.numero, annee: cfg.annee, version: cfg.version, langue: LG, variante: e.variante });
    try {
      for (const k of v.masquer || []) regler(doc, k, false); for (const k of v.afficher || []) regler(doc, k, true);
      const nr = poserReference(doc, ref); if (!nr) log.push(LG + ' ' + e.variante + ' : référence (motif ' + REF.source + ') introuvable dans le document');
      for (const s of (e.supports || []).filter(x => garde(ARGS.supports, x))) {
        if (!opt[s]) { log.push(LG + ' ' + e.variante + ' ' + s + ' : pas de préréglage, ignoré'); nKo++; continue; }
        const fichier = remplir(cfg.nomFichier, { support: s, langue: LG, variante: e.variante, ref, numero: e.numero, version: cfg.version, annee: cfg.annee, prefixe: cfg.prefixe });
        const chemin = SORTIE + fichier;
        try {
          if (existe(chemin)) fs.remove(chemin);
          doc.export(chemin, opt[s], FileExportArea.createForPages(e.pages || ('1-' + doc.pageCount)));
          try { titrerPdf(chemin, remplir((cfg.titres[LG] || cfg.prefixe + ' ' + cfg.annee) + ' – {ref}', { ref, annee: cfg.annee, version: cfg.version }), ref + ' – ' + e.variante + ' – ' + s); } catch (x) { log.push('   titre non écrit : ' + x.message); }
          log.push(fichier + ' — ' + (fs.getFileSize(chemin) / 1048576).toFixed(1) + ' Mo'); nOk++; journal(false);
        } catch (x) { log.push(fichier + ' : ERREUR ' + x.message); nKo++; }
      }
    } catch (x) { log.push(LG + ' ' + e.variante + ' : ERREUR ' + x.message); nKo++; }
  }
  try { doc.close(); } catch (x) { } if (dejaOuvert) { try { Document.load(P); } catch (x) { } }   // jamais enregistré
}
log.push(nOk + ' PDF exportés, ' + nKo + ' erreur(s) — ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s — ' + SORTIE);
journal(true);
console.log(log.join('\n'));
