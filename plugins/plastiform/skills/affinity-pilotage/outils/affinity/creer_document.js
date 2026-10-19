// creer_document.js — crée un document Affinity configuré pour un projet multilingue à images LIÉES :
// placement des images « Lié » (toute image insérée ensuite est liée par défaut), unités, format, résolution,
// pages en vis-à-vis, fond perdu, profil couleur. Le document est enregistré au chemin demandé.
//
// Paramètres : { "chemin": "<chemin Mac>/BASE.af",
//   "format": [210, 297] (mm), "pages": 4, "vis_a_vis": true, "fond_perdu": 3 (mm), "ppp": 300,
//   "cmjn": true, "profil": "Coated FOGRA39 (ISO 12647-2:2004)" (défaut ; le profil CMJN par défaut d'Affinity est
//   « U.S. Web Coated (SWOP) v2 », américain : demander à l'imprimeur ; ex. « Coated FOGRA39 » = couché, Europe),
//   "marges": [15, 15, 15, 15] (mm : haut, droite, bas, gauche ; facultatif), "maquette": true,
//   "fermer": true, "ecraser": false }
const L = require('__OUTILS__lib/affinity_lib.js');
const { NewDocumentOptions, ImagePlacement } = require('/document.js');
const { ColourProfile, RasterFormat } = require('/colours.js');
const { LTRB } = require('/documentproperties.js');
L.job(A => {
  const p = A.chemin; if (!p) { L.log('paramètre « chemin » manquant'); return; }
  if (L.existe(p) && !A.ecraser) { L.log('ARRÊT : ' + p + ' existe déjà ("ecraser": true pour le remplacer)'); return; }
  if (L.existe(p)) { const d0 = L.ouvert(p); if (d0) d0.close(); L.supprimer(p); }
  const o = NewDocumentOptions.createDefault();
  const essai = (nom, f) => { try { f(); L.log('  ' + nom + ' : ok'); } catch (e) { L.log('  ' + nom + ' : NON appliqué (' + e.message + ')'); } };
  const [w, h] = A.format || [210, 297]; const ppp = A.ppp || 300;   // dimensions, fond perdu, marges : dans l'unité du document (mm)
  essai('unités mm', () => { o.units = L.C.UnitType.Millimetre; });
  essai('ppp ' + ppp, () => { o.dpi = ppp; });
  essai('format ' + w + '×' + h + ' mm', () => { o.width = w; o.height = h; });
  essai('multipage', () => { o.isMultiPage = true; });
  essai('pages ' + (A.pages || 1), () => { o.pageCount = A.pages || 1; });
  essai('vis-à-vis ' + (A.vis_a_vis !== false), () => { o.isFacing = A.vis_a_vis !== false; });
  const fp = A.fond_perdu === undefined ? 3 : A.fond_perdu;
  essai('fond perdu ' + fp + ' mm', () => { o.bleed = new LTRB(fp, fp, fp, fp); });
  essai('images LIÉES par défaut', () => { o.imagePlacement = ImagePlacement.Linked; });
  essai('maquette', () => { o.createMaster = A.maquette !== false; });
  if (A.cmjn !== false) {
    essai('format CMJN', () => { o.rasterFormat = RasterFormat.CMYKA8; });
    const nomProfil = A.profil || 'Coated FOGRA39 (ISO 12647-2:2004)';
    essai('profil ' + nomProfil, () => { const pr = [...ColourProfile.getProfilesForFormat(RasterFormat.CMYKA8)].find(x => String(x.name) === nomProfil) || (A.profil ? null : ColourProfile.getDefaultForFormat(RasterFormat.CMYKA8)); if (!pr) throw new Error('profil introuvable (liste : ColourProfile.getProfilesForFormat)'); o.colourProfile = pr; });
  }
  if (A.marges) essai('marges', () => { const [t, r, b, l] = A.marges; o.margins = new LTRB(l, t, r, b); o.marginsEnabled = true; });
  const doc = L.Document.create(o);
  const sp0 = L.planches(doc)[0]; const e0 = sp0.getSpreadExtents(); const eb = sp0.getSpreadExtents({ includeBleed: true });
  L.log('créé : ' + doc.pageCount + ' page(s), ' + doc.dpi + ' ppp, ' + L.planches(doc).length + ' planche(s) ; 1re planche ' + Math.round(e0.width) + '×' + Math.round(e0.height) + ' px (' + (e0.width / ppp * 25.4).toFixed(1) + '×' + (e0.height / ppp * 25.4).toFixed(1) + ' mm), avec fond perdu ' + Math.round(eb.width) + '×' + Math.round(eb.height) + ' px');
  L.mkdirs(L.dossierDe(p)); doc.saveAs(p); L.log('enregistré : ' + p + ' (' + (L.taille(p) / 1024).toFixed(0) + ' Ko)');
  L.log('Contrôle visuel conseillé : Fichier > Configuration du document > Placement des images = « Préférer lié » (le SDK ne relit pas ce réglage).');
  if (A.fermer !== false) doc.close();
});
