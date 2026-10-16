// placer_image.js — place un fichier image dans une planche, à une boîte précise, éventuellement juste au-dessus d'un
// objet de référence (qu'il peut remplacer). Sert à remplacer un calque pixel ou une image incorporée par le fichier
// de Images/, au même endroit et dans le même ordre d'empilement.
//
// ATTENTION : une image créée par script est INCORPORÉE (le SDK ne sait pas créer de lien). Pour la lier ensuite :
// Document > Gestionnaire de ressources > sélectionner l'image > « Remplacer… » > choisir le MÊME fichier dans Images/
// → elle devient liée (ne pas utiliser « Lier… », qui crée un fichier sans extension « _1 »). Contrôle : inventaire_liens.js.
// Alternative tout interface : Fichier > Insérer… (lié) puis positionner.js.
//
// Paramètres : { "doc": "<chemin Mac>.af", "planche": 3, "fichier": "<chemin Mac>/Images/photo.tif",
//   "boite": [x, y, largeur, hauteur] (coordonnées planche, px du document ; défaut : boîte de la référence),
//   "proportions": true, "au_dessus_de": "/2/0" (chemin du nœud de référence, cf. inventaires),
//   "supprimer_reference": false, "nom": "photo" (nom du calque ; défaut : nom du fichier), "enregistrer": false }
const L = require('__OUTILS__lib/affinity_lib.js');
const { Bitmap } = require('/rasterobject.js');
L.job(A => {
  const p = A.doc;
  if (A.enregistrer && L.estPackage(p)) { L.log('ARRÊT : ' + L.interditModifier(null, p, false)); return; }   // sans l'ouvrir (lent)
  const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  if (A.enregistrer) { const refus = L.interditModifier(doc, p, deja); if (refus) { L.log('ARRÊT : ' + refus); return; } }
  if (!L.existe(A.fichier)) { L.log('fichier introuvable : ' + A.fichier); return; }
  const sp = L.focus(doc, A.planche || 0);
  let ref = null; if (A.au_dessus_de) { ref = sp; for (const i of A.au_dessus_de.split('/').filter(Boolean).map(Number)) ref = ref && L.enfants(ref)[i]; if (!ref) { L.log('référence introuvable : ' + A.au_dessus_de); return; } }
  const RF = L.N.RasterFormat; const v = x => (x && x.value !== undefined) ? x.value : x;
  const fmt = v(doc.format) === v(RF.CMYKA8) ? RF.CMYKA8 : RF.RGBA8;   // format du document (CMJN ou RVB)
  const bm = Bitmap.loadFromFile(A.fichier, fmt);
  const def = L.N.ImageNodeDefinition.create(fmt); def.setBitmap(bm);
  const avant = L.enfants(sp, false);
  const b = L.C.AddChildNodesCommandBuilder.create(); b.setInsertionTarget(sp); b.addNode(def);
  doc.executeCommand(b.createCommand(false, L.C.NodeChildType.Main));
  const n = L.enfants(sp, false).find(c => !avant.some(a => a.isSameNode(c)));
  if (!n || L.tag(n) !== 'ImageNode') { L.log('image créée introuvable'); return; }
  const cible = A.boite || (ref ? L.boite(ref) : null);
  if (cible) {
    const bb = n.spreadBaseBox; let [x, y, w, h] = cible; let sx = w / bb.width, sy = h / bb.height, ox = x, oy = y;
    if (A.proportions !== false) { const s = Math.min(sx, sy); sx = sy = s; ox = x + (w - bb.width * s) / 2; oy = y + (h - bb.height * s) / 2; }
    const T = new L.Transform(); const d = [sx, 0, ox - bb.x * sx, 0, sy, oy - bb.y * sy]; for (let i = 0; i < 6; i++) T.data[i] = d[i];
    doc.executeCommand(L.C.DocumentCommand.createTransform(L.sel(doc, n), T));
  }
  try { doc.executeCommand(L.C.DocumentCommand.createSetDescription(L.sel(doc, n), A.nom || L.nomDe(A.fichier))); } catch (e) { }
  if (ref) {
    doc.executeCommand(L.C.DocumentCommand.createMoveNodes(L.sel(doc, n), ref, L.C.NodeMoveType.After, L.C.NodeChildType.Main));
    if (A.supprimer_reference) doc.executeCommand(L.C.DocumentCommand.createDeleteSelection(L.sel(doc, ref)));
  }
  const b2 = n.spreadBaseBox; const rs = L.ressource(n);
  L.log('image placée p' + L.pageDe(sp, n) + ' : ' + L.arrondi([b2.x, b2.y, b2.width, b2.height]).join(', ') + ' ; ' + Math.round(L.ppiEffectif(n, doc.dpi)) + ' ppp effectifs ; placement ' + rs.placement + (ref ? ' ; au-dessus de « ' + (L.nm(ref) || L.tag(ref)) + ' »' + (A.supprimer_reference ? ' (supprimée)' : '') : ''));
  L.log('À LIER : Gestionnaire de ressources > « ' + L.nomDe(A.fichier) + ' » > Remplacer… > même fichier dans Images/');
  if (A.enregistrer) { doc.save(); L.log('enregistré'); }
});
