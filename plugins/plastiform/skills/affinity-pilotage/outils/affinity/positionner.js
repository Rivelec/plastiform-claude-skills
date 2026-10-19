// positionner.js — ajuste l'objet SÉLECTIONNÉ dans Affinity (typiquement une image tout juste insérée par
// Fichier > Insérer…, en lien) à une boîte cible, et le range éventuellement juste au-dessus d'un objet de référence.
// Sert à remplacer un calque pixel ou une image incorporée par une image liée « au même endroit ».
//
// Paramètres : { "doc": "<chemin Mac>.af" (défaut : document courant),
//   "boite": [x, y, largeur, hauteur]  (coordonnées planche, comme inventaire_*.json / extraire_pixels .json),
//   "proportions": true   (conserver les proportions : ajustement « contenir », centré),
//   "au_dessus_de": "/3/0/2"  (facultatif : chemin du nœud de référence dans la planche courante, cf. inventaires),
//   "supprimer_reference": false,  "nom": "photo-xyz" (facultatif : nom du calque) }
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  let courant = null; try { courant = require('/application.js').app.documents.current; } catch (e) { }
  const doc = A.doc ? L.ouvert(A.doc) : courant || [...L.Document.all][0];
  if (!doc) { L.log('aucun document ouvert'); return; }
  const nodes = [...doc.selection.nodes]; if (nodes.length !== 1) { L.log('sélectionner exactement UN objet (sélection : ' + nodes.length + ')'); return; }
  const n = nodes[0]; const sp = doc.currentSpread; const b = n.spreadBaseBox; const [x, y, w, h] = A.boite;
  let sx = w / b.width, sy = h / b.height; let ox = x, oy = y;
  if (A.proportions !== false) { const s = Math.min(sx, sy); sx = sy = s; ox = x + (w - b.width * s) / 2; oy = y + (h - b.height * s) / 2; }
  // échelle autour de l'origine de la planche puis translation : x' = sx*x + tx
  const T = new L.Transform(); const d = [sx, 0, ox - b.x * sx, 0, sy, oy - b.y * sy]; for (let i = 0; i < 6; i++) T.data[i] = d[i];
  doc.executeCommand(L.C.DocumentCommand.createTransform(L.sel(doc, n), T));
  const b2 = n.spreadBaseBox; L.log('objet placé : ' + L.arrondi([b2.x, b2.y, b2.width, b2.height]).join(', ') + ' (cible ' + L.arrondi(A.boite).join(', ') + ')');
  if (A.nom) { try { doc.executeCommand(L.C.DocumentCommand.createSetDescription(L.sel(doc, n), A.nom)); } catch (e) { L.log('nom non appliqué : ' + e.message); } }
  if (A.au_dessus_de) {
    let ref = sp; for (const i of A.au_dessus_de.split('/').filter(Boolean).map(Number)) ref = L.enfants(ref)[i];
    if (!ref) { L.log('référence introuvable : ' + A.au_dessus_de); return; }
    doc.executeCommand(L.C.DocumentCommand.createMoveNodes(L.sel(doc, n), ref, L.C.NodeMoveType.After, L.C.NodeChildType.Main));
    L.log('rangé au-dessus de « ' + (L.nm(ref) || L.tag(ref)) + ' »');
    if (A.supprimer_reference) { doc.executeCommand(L.C.DocumentCommand.createDeleteSelection(L.sel(doc, ref))); L.log('référence supprimée'); }
  }
  L.log('document NON enregistré : vérifier à l\'écran puis Cmd+S (ou enregistrer par script)');
});
