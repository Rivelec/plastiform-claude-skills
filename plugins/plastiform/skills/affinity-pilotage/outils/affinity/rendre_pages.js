// rendre_pages.js — exporte des pages en PNG (contrôle visuel avant/après une opération).
// Les polices et les liens sont d'abord « échauffés » (rendu minuscule de chaque planche concernée).
//
// Paramètres : { "doc": "<chemin Mac>.af", "dossier": "<chemin Mac>/rendus/avant/", "pages": [1, 2, 36] ou "toutes",
//                "largeur": 1240, "prefixe": "p", "fermer": true }
// Résultat : <dossier>/<prefixe><page>_1.png (Affinity ajoute « _1 ») : noms identiques d'une série à l'autre → comparer_rendus.py.
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const dir = A.dossier.replace(/\/?$/, '/'); L.mkdirs(dir); const pre = A.prefixe || 'p'; const larg = A.largeur || 1240;
  const pages = (!A.pages || A.pages === 'toutes') ? Array.from({ length: doc.pageCount }, (_, i) => i + 1) : A.pages;
  const sps = L.planches(doc); const idx = new Set();
  for (const pg of pages) sps.forEach((sp, i) => { if (pg >= sp.firstPageIndex + 1 && pg <= sp.firstPageIndex + sp.pageCount) idx.add(i); });
  L.echauffer(doc, [...idx]);
  let n = 0; for (const pg of pages) { try { L.rendrePages(doc, dir + pre + pg + '.png', String(pg), larg); n++; } catch (e) { L.log('page ' + pg + ' : ' + e.message); } }
  L.log(n + ' page(s) rendue(s) dans ' + dir);
  if (!deja && A.fermer !== false) doc.close();
});
