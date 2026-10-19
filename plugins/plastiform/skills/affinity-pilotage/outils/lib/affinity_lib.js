// affinity_lib.js — bibliothèque commune des scripts de travail Affinity pilotés par Claude (_Outils_Affinity).
//
// Chargement dans un script de travail :  const L = require('__OUTILS__lib/affinity_lib.js');
// bin/affinity_run.sh remplace « __OUTILS__ » par le chemin Mac des outils et copie cette bibliothèque sous un nom
// unique (Affinity garde les modules en cache par chemin). Les scripts « utilisateur » de publication/ n'utilisent
// PAS cette bibliothèque : ils restent autonomes pour fonctionner sans Claude.
//
// Compte rendu : L.log(...) accumule des lignes ; L.job(fn) exécute fn(paramètres), attrape les exceptions, écrit
// à la fin de run/out_run.txt un bloc terminé par la ligne « FIN » (lue par bin/affinity_wait.sh), et l'affiche dans la console
// (sortie renvoyée par l'outil MCP execute_script). Les gros résultats vont dans des fichiers JSON (L.ecrireJSON).
//
// Règles du SDK (vérifiées 08-15/10/2026, Affinity by Canva) :
//  - une commande ne s'applique qu'à la planche COURANTE : L.focus(doc, planche) avant executeCommand
//    (et ne pas la redéfinir si elle l'est déjà : cela vide la sélection) ;
//  - setText() sur un nœud entier perd la mise en forme : remplacer des PLAGES (L.remplacerPlage), de la fin
//    vers le début ; les positions se calculent sur le texte BRUT (L.brut) ;
//  - cellules de tableau : séparateur = glyphe de saut « TableCell » (L.cellules), PAS chaque U+2029 ;
//  - rendu / export juste après Document.load : documents liés rendus d'après leur aperçu flou, polices pas encore
//    chargées → L.echauffer(doc) avant (getSpreads() sur chaque document lié + petits rendus) ;
//  - jamais d'enregistrement pendant un export ; un seul gros document ouvert à la fois.
'use strict';
const { Document, FileExportOptions, FileExportArea } = require('/document.js');
const fs = require('/fs.js');
const C = require('/commands.js');
const { Selection, TextSelection } = require('/selections.js');
const { StoryRange, StoryIoFormat, HardBreakType } = require('/story.js');
const { Size, Transform } = require('/geometry.js');
const N = require('/nodes.js');
let StoryDelta = null; try { ({ StoryDelta } = require('/storydelta.js')); } catch (e) { }

const OUTILS = '__OUTILS__';            // remplacé par bin/affinity_run.sh (chemin Mac, terminé par « / »)
const RUN = OUTILS + 'run/';

// ---------- Nœuds ----------
const tag = n => Object.prototype.toString.call(n).slice(8, -1);
const nm = n => { try { return String(n.description || ''); } catch (e) { return ''; } };
/** Texte lisible (les champs apparaissent par leur description). */
const txt = n => { try { return String(n.story.getText()); } catch (e) { return ''; } };
/** Texte brut : 1 caractère = 1 glyphe → positions utilisables pour StoryRange. */
const brut = n => { try { return String(n.story.getText(0, -1, StoryIoFormat.Raw)); } catch (e) { return txt(n); } };
const vis = n => { try { return n.isVisible !== false; } catch (e) { return true; } };
const boite = n => { try { const b = n.spreadBaseBox; return [b.x, b.y, b.width, b.height]; } catch (e) { return null; } };
const arrondi = (a, d = 1) => a ? a.map(v => Math.round(v * Math.pow(10, d)) / Math.pow(10, d)) : a;
const estBase = n => tag(n) === 'EmbeddedDocumentNode';
const estInstance = n => tag(n) === 'PhysicalNode';   // instance de maquette sur une page

/** Enfants d'un nœud, y compris les objets épinglés dans un texte (NodeChildType.StoryPin) si pins = true. */
function enfants(x, pins = true) {
  const a = []; try { for (const c of x.children) a.push(c); } catch (e) { }
  if (pins) { try { for (const p of new N.NodeChildrenOnly(x.handle, C.NodeChildType.StoryPin, false)) a.push(p); } catch (e) { } }
  return a;
}
/**
 * Parcours en profondeur : fn(nœud, chemin, parent) ; renvoyer false pour ne pas descendre dans ce nœud.
 * opts.base (défaut false) : descendre dans les documents liés ; opts.instances (défaut true) : descendre dans les
 * instances de maquette ; opts.pins (défaut true) : inclure les objets épinglés.
 */
function parcourir(racine, fn, opts = {}, chemin = '') {
  enfants(racine, opts.pins !== false).forEach((c, i) => {
    const ch = chemin + '/' + i; const r = fn(c, ch, racine);
    if (r === false) return;
    if (estBase(c) && !opts.base) return;
    if (estInstance(c) && opts.instances === false) return;
    parcourir(c, fn, opts, ch);
  });
}
/** Noms des ancêtres d'un nœud jusqu'à la planche (calques, groupes), du plus haut au plus bas. */
function calques(n) { const a = []; try { let p = n.parent; while (p && !p.isSpreadNode) { a.unshift(nm(p) || tag(p)); p = p.parent; } } catch (e) { } return a; }
/** Visible effectivement : le nœud et tous ses ancêtres sont visibles. */
function visibleEffectif(n) { let p = n; try { while (p && !p.isSpreadNode) { if (!vis(p)) return false; p = p.parent; } } catch (e) { } return true; }

// ---------- Fichiers ----------
const existe = p => { try { return fs.exists(p); } catch (e) { return false; } };
function u8(p) { return new Uint8Array(fs.File.readAll(p).buffer); }
function decodeUtf8(a) { let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); try { return decodeURIComponent(escape(s)); } catch (e) { return s; } }
const lire = p => decodeUtf8(u8(p));
const lireJSON = p => JSON.parse(lire(p));
function ecrire(p, s) { const f = fs.File.create(p, 'wb'); f.writeStringAsUtf8(String(s)); f.close(); }
function ajouter(p, s) { const f = fs.File.create(p, 'ab'); f.writeStringAsUtf8(String(s)); f.close(); }
const ecrireJSON = (p, o) => { mkdirs(dossierDe(p)); ecrire(p, JSON.stringify(o, null, 1)); };
/** Écrit des octets bruts (Uint8Array) : File.write(arrayBuffer, longueur) — vérifié le 15/10/2026. */
function ecrireBin(p, a) { const f = fs.File.create(p, 'wb'); const ab = a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength); f.write(ab, ab.byteLength); f.close(); }
function mkdirs(p) { try { if (!existe(p)) fs.createDirectories(p); } catch (e) { try { fs.createDirectory(p); } catch (e2) { } } }
function supprimer(p) { try { if (existe(p)) fs.remove(p); } catch (e) { } }
const taille = p => { try { return fs.getFileSize(p); } catch (e) { return -1; } };
const dossierDe = p => String(p).replace(/[^\/]*$/, '');
const nomDe = p => String(p).replace(/\/+$/, '').replace(/^.*\//, '');   // « …/X.afpackage/ » → « X.afpackage »

// ---------- Compte rendu ----------
const _out = [];
const log = (...a) => { _out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); };
function fin() { const t = _out.join('\n') + '\nFIN\n'; try { ajouter(RUN + 'out_run.txt', t); } catch (e) { } try { console.log(t); } catch (e) { } }
function args() { try { return lireJSON(RUN + 'args.json'); } catch (e) { return {}; } }
/** Exécute fn(paramètres) ; toute exception est journalisée ; le compte rendu est toujours écrit (avec FIN). */
function job(fn) { const t0 = Date.now(); try { fn(args()); } catch (e) { log('EXC ' + (e && e.message) + '\n' + ((e && e.stack) || '')); } log('durée ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s'); fin(); }

// ---------- Documents ----------
const ouvert = p => [...Document.all].find(d => d.path === p) || null;
/** Document déjà ouvert, sinon chargé (Document.load : il apparaît aussi dans l'interface). */
function ouvrir(p) { const d = ouvert(p); if (d) return d; if (!existe(p)) throw new Error('fichier introuvable : ' + p); return Document.load(p); }
/**
 * Enregistre puis COMPACTE un document chargé par script : doc.save() ajoute au fichier (il grossit) ; on le réécrit
 * entier sous un nom temporaire (saveAs) puis on remplace l'original (fs.rename). Le document est refermé.
 * Renvoie un message d'état. Ne pas utiliser sur un document que l'utilisateur a ouvert (il serait fermé).
 */
function enregistrerCompact(doc, chemin) {
  chemin = chemin || doc.path;
  if (estPackage(chemin)) return 'NON enregistré : ' + nomDe(chemin) + ' est un .afpackage (enregistrement par script non pris en charge) — document laissé ouvert : vérifier puis enregistrer dans l\'interface (Cmd+S)';
  doc.save();
  const tmp = chemin.replace(/\.af$/, '') + '_compact_' + Date.now() + '.af', bak = chemin + '.avant_compactage';
  try { doc.saveAs(tmp); doc.close(); } catch (e) { try { doc.close(); } catch (e2) { } return 'enregistré (non compacté : ' + e.message + ')'; }
  try {
    if (!existe(tmp) || taille(tmp) < 1024) throw new Error('fichier compact vide');
    fs.rename(chemin, bak); fs.rename(tmp, chemin); fs.remove(bak); return 'enregistré et compacté (' + (taille(chemin) / 1048576).toFixed(1) + ' Mo)';
  } catch (e) {
    try { if (!existe(chemin) && existe(bak)) fs.rename(bak, chemin); } catch (e2) { }
    return 'enregistré (non compacté : ' + e.message + ' ; copie compacte : ' + tmp + ')';
  }
}
const estPackage = p => /\.afpackage\/*$/i.test(String(p || ''));   // un package est un dossier : « …/X.afpackage/ » aussi
/**
 * Raison de NE PAS modifier un document par script (null si rien ne s'y oppose), à tester AVANT toute modification :
 *  - .afpackage : save()/saveAs par script peuvent corrompre un package (pieges.md) → corriger dans l'interface ;
 *  - document ouvert par l'utilisateur (deja) avec des modifications non enregistrées : l'outil les enregistrerait
 *    avec les siennes → demander d'enregistrer d'abord (Affinity marque souvent un fichier de langue « modifié » dès
 *    l'ouverture, à cause du lien vers la BASE : un Cmd+S suffit).
 */
function interditModifier(doc, chemin, deja) {
  if (estPackage(chemin || (doc && doc.path))) return nomDe(chemin || doc.path) + ' est un .afpackage : modification par script non prise en charge (risque de corruption à l\'enregistrement) — faire la correction dans l\'interface, ou convertir le projet en .af';
  if (deja) { let sale = false; try { sale = !!doc.isDirty; } catch (e) { } if (sale) return nomDe(chemin || doc.path) + ' est ouvert avec des modifications non enregistrées : l\'enregistrer (Cmd+S) puis relancer'; }
  return null;
}
function fermerTout(sauf) { for (const d of [...Document.all]) { if (sauf && d.path === sauf) continue; try { d.close(); } catch (e) { } } }
const planches = doc => [...doc.spreads];
/** Rend une planche courante (indispensable avant une commande sur ses nœuds). sp = index ou nœud de planche. */
function focus(doc, sp) {
  const s = typeof sp === 'number' ? planches(doc)[sp] : sp;
  let deja = false; try { deja = !!doc.currentSpread && doc.currentSpread.isSameNode(s); } catch (e) { }
  if (!deja) doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(s));
  return s;
}
const sel = (doc, nodes) => Selection.create(doc, nodes);
/** Index de la planche qui contient un nœud (-1 si introuvable). */
function plancheDe(doc, n) { let p = n; while (p && !p.isSpreadNode) p = p.parent; const sps = planches(doc); for (let i = 0; i < sps.length; i++) if (p && sps[i].isSameNode(p)) return i; return -1; }
/** Numéro de page (1..N) qui contient la boîte d'un nœud, ou -1. */
function pageDe(sp, n) { try { return sp.getPageIndexOfBox(n.spreadBaseBox) + 1; } catch (e) { return -1; } }
function infoDoc(doc) { const r = { chemin: doc.path, pages: doc.pageCount, planches: planches(doc).length }; try { r.dpi = doc.dpi; } catch (e) { } try { r.profil = doc.colourProfile && String(doc.colourProfile.name || doc.colourProfile); } catch (e) { } try { r.modifie = doc.isDirty; } catch (e) { } return r; }
/** Maquettes du document (planches maîtresses). */
function maquettes(doc) { try { return [...new N.NodeChildrenOnly(doc.rootNode.handle, N.NodeChildType.MasterSpread, false)]; } catch (e) { return []; } }

// ---------- Textes ----------
/** Nœuds texte (hors BASE liée) : [{ si, page, chemin, calques, type, boite, visible, texte, n }] */
function textes(doc, opts = {}) {
  const r = []; planches(doc).forEach((sp, si) => {
    if (opts.planches && opts.planches.indexOf(si) < 0) return;
    parcourir(sp, (c, ch) => { if (c.isTextNode) r.push({ si, page: pageDe(sp, c), chemin: ch, calques: calques(c), type: tag(c), boite: arrondi(boite(c)), visible: visibleEffectif(c), texte: txt(c), n: c }); }, opts);
  });
  return r;
}
/** Remplace la plage [a, b[ (positions du texte BRUT) par s ; la mise en forme du 1er caractère est conservée. */
function remplacerPlage(doc, sp, n, a, b, s) { focus(doc, sp); const S = Selection.create(doc, n); S.addSubSelectionForNode(n, TextSelection.create(new StoryRange(a, b))); doc.executeCommand(C.DocumentCommand.createSetText(S, s)); }
/** Applique un StoryDelta (ex. StoryDelta.createPostscriptName('Helvetica')) à la plage [a, b[. */
function formaterPlage(doc, sp, n, a, b, delta) { focus(doc, sp); const S = Selection.create(doc, n); S.addSubSelectionForNode(n, TextSelection.create(new StoryRange(a, b))); doc.executeCommand(C.DocumentCommand.createFormatText(S, delta)); }
/** Plages de police d'un nœud : [{ debut, fin, ps, famille, valide }] */
function plagesPolice(n) { const r = []; try { for (const g of n.story.glyphAttRuns) { const f = g.glyphAtts.font; r.push({ debut: g.begin, fin: g.end, ps: String(f.postscriptName || ''), famille: String(f.familyName || ''), valide: !!f.isValid }); } } catch (e) { } return r; }
/**
 * Cellules d'un tableau (TableTextNode) : [{ debut, fin, texte }] en positions brutes. Les séparateurs sont les
 * glyphes de saut « TableCell » ; un U+2029 qui n'en est pas un reste DANS la cellule (paragraphe interne).
 */
function cellules(n) {
  const t = brut(n); const st = n.story; const r = []; let d = 0;
  for (let i = 0; i < t.length; i++) {
    if (t.charCodeAt(i) !== 0x2029) continue;
    let estCellule = true; try { const hb = st.getHardBreakType(i); estCellule = hb && (hb.equals ? hb.equals(HardBreakType.TableCell) : hb === HardBreakType.TableCell); } catch (e) { }
    if (estCellule) { r.push({ debut: d, fin: i, texte: t.slice(d, i) }); d = i + 1; }
  }
  r.push({ debut: d, fin: t.length, texte: t.slice(d) });
  return r;
}

// ---------- Visibilité ----------
function visibilite(doc, sp, nodes, v) { const a = nodes.filter(c => vis(c) !== v); if (!a.length) return 0; focus(doc, sp); for (const c of a) doc.executeCommand(C.DocumentCommand.createSetVisibility(Selection.create(doc, c), v)); return a.length; }

// ---------- Ressources (images, documents liés) ----------
/** Ressource d'une image ou d'un document lié : { fichier, placement: 'lie'|'incorpore', octets, type, dpi, px } */
function ressource(n) {
  const r = { fichier: '', placement: '?', octets: -1, type: '' };
  try {
    const ir = n.imageResourceInterface; r.fichier = String(ir.imageFilePath || '');
    const p = ir.imagePlacement; r.placement = p && p.value === 1 ? 'lie' : (p && p.value === 0 ? 'incorpore' : String(p));
    try { r.octets = Number(ir.imageFileSize); } catch (e) { } try { r.type = String(ir.fileTypeName || ''); } catch (e) { }
    try { r.dpi = Number(ir.originalDPI); } catch (e) { } try { const o = ir.originalSize; r.px = [Math.round(o.width), Math.round(o.height)]; } catch (e) { }
  } catch (e) { r.erreur = e.message; }
  return r;
}
/** Échelle (unités de planche par unité locale, x et y) d'après baseToSpreadTransform (rotation comprise). */
function echelle(n) { try { const d = n.baseToSpreadTransform.data; return [Math.hypot(d[0], d[3]), Math.hypot(d[1], d[4])]; } catch (e) { return [1, 1]; } }
/** Résolution effective (ppp) d'une image placée = dpi du document / plus grande échelle (vérifié = Gestionnaire de ressources). */
function ppiEffectif(n, dpiDoc) { const e = echelle(n); const m = Math.max(e[0], e[1]); return m > 0 ? dpiDoc / m : 0; }

// ---------- Rendu et export ----------
function png() { return FileExportOptions.createWithPresetName('PNG'); }
/**
 * Force le chargement complet des documents liés (BASE, PDF placés) : juste après Document.load, une instance de
 * document lié est rendue d'après un APERÇU basse définition ; appeler getSpreads() sur l'instance charge le document
 * (vérifié le 15/10/2026 : rendu flou → net). Renvoie le nombre d'instances traitées.
 */
function chargerLiens(doc) { let n = 0; for (const sp of planches(doc)) parcourir(sp, c => { if (estBase(c)) { try { c.getSpreads(false); n++; } catch (e) { } return false; } }); return n; }
/** Charge liens et polices : chargerLiens, puis rend chaque planche (ou celles indiquées) en tout petit et efface ces rendus. */
function echauffer(doc, indices) {
  chargerLiens(doc);
  const d = RUN + '_echauffement/'; mkdirs(d); const o = png(); const sps = planches(doc);
  for (const i of (indices || sps.map((_, k) => k))) { const sp = sps[i]; if (!sp) continue; try { doc.export(d + 'p.png', o, FileExportArea.createForPages(String(sp.firstPageIndex + 1)), new Size(124, 175)); } catch (e) { } }
  try { for (const e of [...new fs.Directory(d).entries]) fs.remove(e.path); } catch (e) { }
}
/** Exporte des pages en PNG ; plusieurs pages → fichiers <base>_1.png, <base>_2.png… (Size = boîte d'ajustement). */
function rendrePages(doc, chemin, pages, largeur = 1240, hauteur) { const h = hauteur || Math.round(largeur * 1.4142); doc.export(chemin, png(), FileExportArea.createForPages(String(pages)), new Size(largeur, h)); }
function exporterPDF(doc, chemin, prereglage, pages) { const o = FileExportOptions.createWithPresetName(prereglage); doc.export(chemin, o, FileExportArea.createForPages(pages || ('1-' + doc.pageCount))); }
const prereglages = () => FileExportOptions.allPresetNames;

module.exports = {
  OUTILS, RUN, Document, FileExportOptions, FileExportArea, fs, C, N, Selection, TextSelection, StoryRange, StoryIoFormat, HardBreakType, StoryDelta, Size, Transform,
  tag, nm, txt, brut, vis, visibleEffectif, boite, arrondi, estBase, estInstance, enfants, parcourir, calques,
  existe, lire, lireJSON, ecrire, ajouter, ecrireJSON, ecrireBin, mkdirs, supprimer, taille, dossierDe, nomDe, u8, decodeUtf8,
  log, fin, args, job,
  ouvert, ouvrir, fermerTout, enregistrerCompact, estPackage, interditModifier, planches, focus, sel, plancheDe, pageDe, infoDoc, maquettes,
  textes, remplacerPlage, formaterPlage, plagesPolice, cellules, visibilite, ressource, echelle, ppiEffectif,
  png, chargerLiens, echauffer, rendrePages, exporterPDF, prereglages,
};
