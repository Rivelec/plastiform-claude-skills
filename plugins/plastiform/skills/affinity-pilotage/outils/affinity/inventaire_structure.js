// inventaire_structure.js — structure d'un document : planches, pages, calques de premier niveau (nom, type,
// visibilité, nombre d'enfants), documents liés par planche (BASE), maquettes et leurs objets.
//
// Paramètres : { "docs": ["<chemin Mac>.af", …], "sortie": "<chemin Mac>.json" (défaut run/structure.json), "fermer": true }
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const sortie = A.sortie || L.RUN + 'structure.json'; const res = [];
  for (const p of A.docs || []) {
    const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
    const r = { doc: p, info: L.infoDoc(doc), planches: [], maquettes: [] };
    L.planches(doc).forEach((sp, si) => {
      const pl = { si, pages: [sp.firstPageIndex + 1, sp.firstPageIndex + sp.pageCount], calques: [], liens: [] };
      for (const c of L.enfants(sp, false)) {
        const e = { nom: L.nm(c), type: L.tag(c), visible: L.vis(c), enfants: L.enfants(c, false).length };
        if (L.estBase(c)) { const rs = L.ressource(c); e.fichier = rs.fichier; e.placement = rs.placement; pl.liens.push(rs.fichier); }
        pl.calques.push(e);
      }
      r.planches.push(pl);
    });
    for (const m of L.maquettes(doc)) r.maquettes.push({ nom: L.nm(m), objets: L.enfants(m, false).map(c => (L.nm(c) || L.tag(c))) });
    res.push(r);
    const noms = {}; for (const pl of r.planches) for (const c of pl.calques) noms[c.nom || c.type] = (noms[c.nom || c.type] || 0) + 1;
    const sansBase = r.planches.filter(pl => !pl.liens.length).map(pl => pl.si);
    L.log(p.replace(/^.*\//, '') + ' : ' + r.info.pages + ' pages, ' + r.planches.length + ' planches, ' + r.maquettes.length + ' maquette(s)');
    L.log('   calques de premier niveau : ' + Object.entries(noms).map(([k, v]) => k + '×' + v).join(', '));
    if (r.planches.some(pl => pl.liens.length)) L.log('   planches sans document lié : ' + (sansBase.length ? sansBase.join(',') : 'aucune'));
    for (const m of r.maquettes) L.log('   maquette « ' + m.nom + ' » : ' + m.objets.length + ' objet(s)');
    if (!deja && A.fermer !== false) doc.close();
  }
  L.ecrireJSON(sortie, res); L.log('détail : ' + sortie);
});
