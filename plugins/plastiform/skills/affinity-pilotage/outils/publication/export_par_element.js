// export_par_element.js — Un PDF par élément (fiche produit, chapitre…) et par langue, d'après le texte des pages :
// un élément commence à chaque page qui contient un titre repère (ex. « Informations Clés ») et va jusqu'au suivant.
//
// UTILISATION (poste de travail, sans Claude)
//   1. Ouvrir dans Affinity un fichier du projet (FR, EN ou BASE).
//   2. Bibliothèque de scripts > « Export par élément » (ou ouvrir ce fichier dans l'éditeur de script) > Exécuter.
//   Toutes les langues présentes à côté du document sont exportées (fichiers jamais enregistrés).
//   Prérequis : Réglages > Exécution de scripts : exécution activée, « Accéder au système de fichiers » et dossier ajouté.
//
// PARAMÈTRES : section "decoupage" de projet.json (voir _Outils_Affinity/modeles/projet.fiches.json) :
//   debut (titre repère, expression régulière), reference (référence imprimée), produit (nom court dans la référence),
//   version / version_datee, noms (nom affiché par produit), titres / titres_dates (titre du PDF par langue),
//   page_precedente (produits dont la 1re page doit être exportée avec la précédente, voir ci-dessous),
//   sortie ("PDF/Fiches/{langue}/"), nom_fichier ("{ref}_{version_fichier}.pdf"), prereglages.
//   Sans projet.json, les réglages des fiches techniques Rivelec (TEC_FTE_RIV_…) s'appliquent.
//
// RÉSULTAT : <sortie>/<nom_fichier>, titre du PDF écrit, journal <dossier de sortie racine>/export_log.txt.
//   Un élément sans référence ou sans version n'est pas exporté (signalé). Pages vides de fin retirées.
// PAGE PRÉCÉDENTE (bug Affinity constaté le 09/10/2026) : exportée seule, la 1re page de certaines fiches perd la BASE
//   liée ; exportée avec la page précédente de la même planche, elle sort bien : le script exporte à partir de la page
//   précédente puis retire cette page du PDF (mise à jour incrémentale de l'arbre des pages).
//
// Lancé par Claude (bin/affinity_run.sh) : run/args.json facultatif { "dossier", "langues": ["FR"], "sortie", "references": ["TEC_FTE_RIV_001_F20_FR"] }
const { Document, FileExportOptions, FileExportArea } = require('/document.js'); const fs = require('/fs.js');
const tag = n => Object.prototype.toString.call(n).slice(8, -1);
const lire = p => { const u = new Uint8Array(fs.File.readAll(p).buffer); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); try { return decodeURIComponent(escape(s)); } catch (e) { return s; } };
const existe = p => { try { return fs.exists(p); } catch (e) { return false; } };
const OUT = '__OUTILS__'; const PAR_CLAUDE = OUT.charAt(0) === '/';
const ARGS = (() => { if (!PAR_CLAUDE) return {}; try { return JSON.parse(lire(OUT + 'run/args.json')); } catch (e) { return {}; } })();
const log = []; const t0 = Date.now();
const remplir = (m, v) => String(m).replace(/\{(\w+)\}/g, (x, k) => v[k] !== undefined ? v[k] : x);

// ---------- 1. Réglages ----------
const DEFAUT = {   // fiches techniques Rivelec (TEC_FTE_RIV), utilisés sans projet.json
  debut: '^(Informations Clés|Key information|Wichtige Informationen|Información clave)\\s*$',
  reference: '^(TEC_FTE_RIV_\\d{3}_\\S+)$', produit: '^TEC_FTE_RIV_\\d{3}_(.+)_[A-Z]{2}$',
  version: '^Versi[oó]n (\\d+)\\.(\\d+)$', version_datee: '^(?:Version (?:du|of the|dated|vom|del)|Versión del|Stand vom) (\\d\\d)[\\/.](\\d\\d)[\\/.](\\d\\d)$',
  noms: { F30Visual: 'F30 Visual', F30M: 'F30 Max', P80Ra: 'P80 Ra', P51SD: 'P51 SD', M80Lp: 'M80 Lp', M80TLp: 'M80 TLp', F20XL: 'F20 XL', F30XL: 'F30 XL', F50XL: 'F50 XL', F85XL: 'F85 XL', F04PROTECT: 'F04 PROTECT', F50XLM72: 'F50XL M72' },
  page_precedente: '^(F20XL|F30XL|F50XL|F85XL)$',
  titres: { FR: 'Fiche technique Plastiform {produit} – Version {version}', EN: 'Plastiform {produit} technical data sheet – Version {version}', DE: 'Technisches Datenblatt Plastiform {produit} – Version {version}', ES: 'Ficha técnica Plastiform {produit} – Versión {version}' },
  titres_dates: { FR: 'Fiche technique Plastiform {produit} – Version du {date}', EN: 'Plastiform {produit} technical data sheet – Version dated {date}', DE: 'Technisches Datenblatt Plastiform {produit} – Stand vom {date_points}', ES: 'Ficha técnica Plastiform {produit} – Versión del {date}' },
  sortie: 'PDF/Fiches/{langue}/', nom_fichier: '{ref}_{version_fichier}.pdf', prereglages: ['PDF Fiches techniques web', 'PDF (numérique - haute qualité)'], auteur: 'Rivelec - Plastiform',
  langues: ['FR', 'EN', 'DE', 'ES', 'IT', 'PT', 'NL', 'PL'], modele_langue: null
};
let dossier = null, cfg = null;
const cands = []; if (ARGS.dossier) cands.push(ARGS.dossier.replace(/\/?$/, '/'));
for (const d of [...Document.all]) { const m = String(d.path || '').match(/^(.*\/)[^\/]+$/); if (m) { cands.push(m[1]); cands.push(m[1].replace(/[^\/]+\/$/, '')); } }
for (const c of cands) { if (existe(c + 'projet.json')) { const j = JSON.parse(lire(c + 'projet.json')); if (j.decoupage) { dossier = c; cfg = Object.assign({}, DEFAUT, j.decoupage, { auteur: (j.projet && j.projet.auteur) || DEFAUT.auteur, langues: Object.keys((j.fichiers && j.fichiers.langues) || {}).length ? Object.keys(j.fichiers.langues) : DEFAUT.langues, fichiers: (j.fichiers && j.fichiers.langues) || null, modele_langue: (j.fichiers && j.fichiers.modele_langue) || null }); break; } } }
let prefixe = null;
const chemins = [...Document.all].map(d => String(d.path || ''));
for (const c of cands) { try { for (const e of [...new fs.Directory(c).entries]) chemins.push(String(e.path)); } catch (e) { } }   // fichiers des dossiers candidats
if (!dossier) for (const ch of chemins) { const m = ch.match(/^(.*\/)(TEC_FTE_RIV_[^\/]+?)_(BASE|[A-Z]{2})\.(af|afpackage)$/); if (m) { dossier = m[1]; prefixe = m[2]; cfg = Object.assign({}, DEFAUT, { modele_langue: prefixe + '_{langue}.af' }); break; } }
if (!dossier) { console.log('Aucun projet trouvé : ouvrez un fichier du projet (projet.json avec une section "decoupage", ou fiches TEC_FTE_RIV_…) puis relancez.'); throw new Error('aucun projet'); }
const fichiers = {}; for (const LG of cfg.langues) { if (ARGS.langues && ARGS.langues.indexOf(LG) < 0) continue; const p = dossier + ((cfg.fichiers && cfg.fichiers[LG]) || remplir(cfg.modele_langue || '{langue}.af', { langue: LG })); if (existe(p)) fichiers[LG] = p; }
const racineSortie = ARGS.sortie ? ARGS.sortie.replace(/\/?$/, '/') : dossier + remplir(cfg.sortie, { langue: '' }).replace(/\/+$/, '/').replace(/\/$/, '/');
try { fs.createDirectories(racineSortie); } catch (e) { }
const presets = FileExportOptions.allPresetNames; const preset = cfg.prereglages.find(x => presets.indexOf(x) >= 0);
if (!preset) { console.log('Aucun préréglage disponible parmi ' + JSON.stringify(cfg.prereglages)); throw new Error('préréglage'); }
const opts = FileExportOptions.createWithPresetName(preset);
log.push('Dossier : ' + dossier + ' — langues : ' + Object.keys(fichiers).join(', ') + ' — préréglage : ' + preset + (preset !== cfg.prereglages[0] ? ' (« ' + cfg.prereglages[0] + ' » absent sur ce poste)' : ''));
const RE = { debut: new RegExp(cfg.debut, 'i'), ref: new RegExp(cfg.reference), prod: new RegExp(cfg.produit), ver: new RegExp(cfg.version), date: cfg.version_datee ? new RegExp(cfg.version_datee) : null, prec: cfg.page_precedente ? new RegExp(cfg.page_precedente) : null };

// ---------- 2. PDF : titre et retrait de la 1re page (mises à jour incrémentales, xref classique) ----------
const latin1 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return s; };
const utf8len = s => { let n = 0; for (const ch of s) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };
const hex16 = s => { let h = 'FEFF'; for (let i = 0; i < s.length; i++) h += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4); return '<' + h + '>'; };
const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function lireTrailer(s) { const sx = s.lastIndexOf('startxref'); const prev = parseInt(s.slice(sx + 9).trim(), 10); const tr = s.lastIndexOf('trailer'); if (tr < 0 || tr > sx) throw new Error('table xref compressée'); const t = s.slice(tr, sx); const g = re => { const m = t.match(re); return m ? m[1] : null; }; return { prev, size: g(/\/Size\s+(\d+)/), root: g(/\/Root\s+(\d+)\s+0\s+R/), info: g(/\/Info\s+(\d+)\s+0\s+R/), id: g(/(\/ID\s*\[[^\]]*\])/) }; }
const objet = (s, n) => { const i = s.lastIndexOf('\n' + n + ' 0 obj'); if (i < 0) return null; const j = s.indexOf('endobj', i); return s.slice(s.indexOf('obj', i) + 3, j).trim(); };
function titrerPdf(chemin, titre, sujet) {
  const s = latin1(fs.File.readAll(chemin).buffer); const base = s.length; const T = lireTrailer(s);
  const cat = objet(s, T.root); const meta = cat && (cat.match(/\/Metadata\s+(\d+)\s+0\s+R/) || [])[1];
  const infoNum = T.info ? parseInt(T.info, 10) : parseInt(T.size, 10), metaNum = meta ? parseInt(meta, 10) : null;
  let dict = (T.info && objet(s, T.info)) || '<<>>'; dict = dict.replace(/\/(Title|Author|Subject)\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>)/g, '');
  dict = dict.replace(/>>\s*$/, '/Title' + hex16(titre) + '/Subject' + hex16(sujet) + '/Author' + hex16(cfg.auteur) + '>>');
  const date = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const xmp = '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">'
    + '<dc:format>application/pdf</dc:format><dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + xml(titre) + '</rdf:li></rdf:Alt></dc:title>'
    + '<dc:description><rdf:Alt><rdf:li xml:lang="x-default">' + xml(sujet) + '</rdf:li></rdf:Alt></dc:description>'
    + '<dc:creator><rdf:Seq><rdf:li>' + xml(cfg.auteur) + '</rdf:li></rdf:Seq></dc:creator>'
    + '<xmp:CreatorTool>Affinity</xmp:CreatorTool><xmp:ModifyDate>' + date + '</xmp:ModifyDate><xmp:MetadataDate>' + date + '</xmp:MetadataDate>'
    + '</rdf:Description></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>';
  const parts = []; const offs = {}; let pos = base; const ajout = (txt, u) => { parts.push([txt, u]); pos += u ? utf8len(txt) : txt.length; };
  ajout('\n'); offs[infoNum] = pos; ajout(infoNum + ' 0 obj\n' + dict + '\nendobj\n');
  if (metaNum !== null) { offs[metaNum] = pos; ajout(metaNum + ' 0 obj\n<</Type/Metadata/Subtype/XML/Length ' + utf8len(xmp) + '>>\nstream\n'); ajout(xmp, true); ajout('\nendstream\nendobj\n'); }
  const xref = pos; let x = 'xref\n'; for (const n of Object.keys(offs).map(Number).sort((a, b) => a - b)) x += n + ' 1\n' + ('000000000' + offs[n]).slice(-10) + ' 00000 n \n';
  x += 'trailer\n<</Size ' + Math.max(parseInt(T.size, 10), infoNum + 1, (metaNum || 0) + 1) + '/Root ' + T.root + ' 0 R/Info ' + infoNum + ' 0 R' + (T.id || '') + '/Prev ' + T.prev + '>>\nstartxref\n' + xref + '\n%%EOF\n';
  ajout(x); const f = fs.File.create(chemin, 'ab'); for (const [txt, u] of parts) { if (u) f.writeStringAsUtf8(txt); else f.writeString(txt); } f.close();
}
function retirerPremierePage(chemin) {
  const s = latin1(fs.File.readAll(chemin).buffer); const base = s.length; const T = lireTrailer(s);
  const pagesNum = ((objet(s, T.root) || '').match(/\/Pages\s+(\d+)\s+0\s+R/) || [])[1]; const pd = pagesNum && objet(s, pagesNum);
  const km = pd && pd.match(/\/Kids\s*\[([^\]]*)\]/); const kids = km ? (km[1].match(/\d+\s+0\s+R/g) || []) : [];
  if (kids.length < 2) throw new Error('arbre des pages inattendu');
  if (/\/Type\s*\/Pages\b/.test(objet(s, parseInt(kids[0], 10)) || '')) throw new Error('arbre des pages imbriqué');
  const nd = pd.replace(km[0], '/Kids[' + kids.slice(1).join(' ') + ']').replace(/\/Count\s+\d+/, '/Count ' + (kids.length - 1));
  const obj = '\n' + pagesNum + ' 0 obj\n' + nd + '\nendobj\n'; const xref = base + obj.length;
  const x = 'xref\n' + pagesNum + ' 1\n' + ('000000000' + (base + 1)).slice(-10) + ' 00000 n \ntrailer\n<</Size ' + T.size + '/Root ' + T.root + ' 0 R' + (T.info ? '/Info ' + T.info + ' 0 R' : '') + (T.id || '') + '/Prev ' + T.prev + '>>\nstartxref\n' + xref + '\n%%EOF\n';
  const f = fs.File.create(chemin, 'ab'); f.writeString(obj + x); f.close();
}

// ---------- 3. Export ----------
for (const LG of Object.keys(fichiers)) {
  const P = fichiers[LG]; let doc = [...Document.all].find(d => d.path === P); const charge = !doc; if (!doc) doc = Document.load(P);
  // documents liés (BASE) : getSpreads() force leur chargement complet, sinon ils peuvent sortir d'après leur aperçu
  for (const sp of [...doc.spreads]) (function w(x) { for (const c of x.children) { if (tag(c) === 'EmbeddedDocumentNode') { try { c.getSpreads(false); } catch (e) { } continue; } if (tag(c) !== 'PhysicalNode') w(c); } })(sp);
  const pages = {};
  [...doc.spreads].forEach(sp => (function w(x) { for (const c of x.children) { if (tag(c) === 'EmbeddedDocumentNode') continue; if (c.isTextNode) { try { let v = true; try { v = c.isVisible; } catch (e) { } if (v) { const pg = sp.getPageIndexOfBox(c.spreadBaseBox); const t = String(c.story.getText()).trim(); if (t) (pages[pg] = pages[pg] || []).push(t); } } catch (e) { } } w(c); } })(sp));
  const nPages = doc.pageCount || Math.max(...Object.keys(pages).map(Number)) + 1;
  const debuts = Object.keys(pages).map(Number).filter(pg => pages[pg].some(t => RE.debut.test(t))).sort((a, b) => a - b);
  const dir = ARGS.sortie ? racineSortie + LG + '/' : dossier + remplir(cfg.sortie, { langue: LG }).replace(/\/?$/, '/'); try { fs.createDirectories(dir); } catch (e) { } let nOk = 0;
  debuts.forEach((d, i) => {
    let f = (i + 1 < debuts.length ? debuts[i + 1] : nPages) - 1; while (f > d && !(pages[f] && pages[f].length)) f--;
    let ref = null, verF = null, verTxt = null, numerotee = false;
    for (let pg = d; pg <= f; pg++) for (const t of pages[pg] || []) {
      const m = t.match(RE.ref); if (m) ref = m[1];
      const v = RE.date && t.match(RE.date); if (v) { verF = v[1] + v[2] + v[3]; verTxt = v[1] + '/' + v[2] + '/' + v[3]; }
      const vn = t.match(RE.ver); if (vn) { verF = 'V' + vn[1] + '-' + vn[2]; verTxt = vn[1] + '.' + vn[2]; numerotee = true; } }
    const plage = (d + 1) + '-' + (f + 1);
    if (!ref || !verF) { log.push(LG + ' p' + plage + ' : NON exportée (référence ' + (ref || 'absente') + ', version ' + (verF || 'absente') + ')'); return; }
    if (ARGS.references && ARGS.references.indexOf(ref) < 0) return;
    const prod = (ref.match(RE.prod) || [])[1] || ref; const nomProd = (cfg.noms || {})[prod] || prod;
    const nom = remplir(cfg.nom_fichier, { ref, version_fichier: verF, langue: LG, produit: prod }); const chemin = dir + nom;
    const modele = numerotee ? (cfg.titres[LG] || 'Plastiform {produit} – Version {version}') : ((cfg.titres_dates || {})[LG] || 'Plastiform {produit} – {date}');
    const titre = remplir(modele, { produit: nomProd, version: verTxt, date: verTxt, date_points: String(verTxt).split('/').join('.') });
    const avecPrec = RE.prec && RE.prec.test(prod) && d > 0;
    try { if (existe(chemin)) fs.remove(chemin); doc.export(chemin, opts, FileExportArea.createForPages(avecPrec ? d + '-' + (f + 1) : plage)); if (avecPrec) retirerPremierePage(chemin); nOk++; }
    catch (e) { log.push(LG + ' p' + plage + ' : ERREUR export ' + e.message); return; }
    try { titrerPdf(chemin, titre, ref); log.push(LG + ' p' + plage + ' -> ' + nom + ' — « ' + titre + ' »'); }
    catch (e) { log.push(LG + ' p' + plage + ' -> ' + nom + ' (titre non modifié : ' + e.message + ')'); }
  });
  log.push(LG + ' : ' + nOk + ' / ' + debuts.length + ' élément(s) exporté(s) → ' + dir);
  if (charge) { try { doc.close(); } catch (e) { } }
}
log.push('Durée ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
try { const fo = fs.File.create(racineSortie + 'export_log.txt', 'wb'); fo.writeStringAsUtf8(new Date().toISOString() + '\n' + log.join('\n') + '\n'); fo.close(); } catch (e) { }
if (PAR_CLAUDE) { try { const f = fs.File.create(OUT + 'run/out_run.txt', 'ab'); f.writeStringAsUtf8(log.join('\n') + '\nFIN\n'); f.close(); } catch (e) { } }
console.log(log.join('\n'));
