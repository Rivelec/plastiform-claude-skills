// inventaire_textes.js — tous les textes d'un document (hors BASE liée), avec planche, page, calques, position,
// visibilité et cellules des tableaux. Sert aux relectures, aux comparaisons entre langues et aux données répétées.
//
// Paramètres : { "doc": "<chemin Mac>.af", "planches": [0, 18, …] (facultatif), "calque": "PRIX" (facultatif : ne
//                garder que les textes dont un ancêtre porte ce nom), "sortie": "<chemin Mac>.json"
//                (défaut run/textes_<nom>.json), "fermer": true }
// Résultat : JSON [{ si, page, chemin, calques[], type, boite[x,y,l,h], visible, texte, cellules? }]
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const sortie = A.sortie || L.RUN + 'textes_' + p.replace(/^.*\//, '').replace(/\.\w+$/, '') + '.json';
  const r = [];
  for (const t of L.textes(doc, { planches: A.planches })) {
    if (A.calque && t.calques.indexOf(A.calque) < 0) continue;
    const e = { si: t.si, page: t.page, chemin: t.chemin, calques: t.calques, type: t.type, boite: t.boite, visible: t.visible, texte: t.texte };
    if (t.type === 'TableTextNode') { try { e.cellules = L.cellules(t.n).map(c => c.texte); } catch (x) { } }
    r.push(e);
  }
  L.ecrireJSON(sortie, r);
  L.log(p.replace(/^.*\//, '') + ' : ' + r.length + ' textes (' + r.filter(x => !x.visible).length + ' masqués, ' + r.filter(x => x.cellules).length + ' tableaux) → ' + sortie);
  if (!deja && A.fermer !== false) doc.close();
});
