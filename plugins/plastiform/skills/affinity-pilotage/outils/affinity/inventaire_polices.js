// inventaire_polices.js — polices utilisées par les textes (planches et maquettes, hors BASE liée) et polices
// absentes du Mac (comparées à la liste des polices installées, Font.all).
//
// Paramètres : { "docs": ["<chemin Mac>.af", …], "sortie": "<chemin Mac>.json" (défaut run/inventaire_polices.json),
//                "fermer": true }
// Résultat : JSON { installees: n, docs: [{ doc, polices: { ps: { famille, caracteres, absente, exemples[] } } }] }
// Note : la 1re énumération des polices peut dépasser 60 s (cache) : relire le compte rendu avec affinity_wait.sh.
const L = require('__OUTILS__lib/affinity_lib.js');
const { Font } = require('/fonts.js');
L.job(A => {
  const sortie = A.sortie || L.RUN + 'inventaire_polices.json';
  const installees = new Set(); try { for (const f of Font.all) installees.add(String(f.postscriptName)); } catch (e) { L.log('liste des polices installées indisponible : ' + e.message); }
  const res = { date: new Date().toISOString(), installees: installees.size, docs: [] };
  for (const p of A.docs || []) {
    const deja = !!L.ouvert(p); const doc = L.ouvrir(p); const pol = {};
    const racines = [...L.planches(doc).map((s, i) => ['planche ' + i, s]), ...L.maquettes(doc).map((m, i) => ['maquette ' + (L.nm(m) || i), m])];
    for (const [ou, rac] of racines) L.parcourir(rac, c => {
      if (!c.isTextNode) return; const t = L.txt(c);
      for (const g of L.plagesPolice(c)) {
        const k = g.ps || g.famille || '?'; const e = pol[k] = pol[k] || { famille: g.famille, caracteres: 0, absente: installees.size ? !installees.has(g.ps) : !g.valide, exemples: [] };
        e.caracteres += g.fin - g.debut;
        const extrait = t.slice(g.debut, g.fin).replace(/\s+/g, ' ').trim();
        if (e.exemples.length < 5 && /\S/.test(extrait)) e.exemples.push(ou + ' : ' + extrait.slice(0, 50) + (L.visibleEffectif(c) ? '' : ' (masqué)'));
      }
    });
    res.docs.push({ doc: p, polices: pol });
    const abs = Object.entries(pol).filter(([, e]) => e.absente);
    L.log(p.replace(/^.*\//, '') + ' : ' + Object.keys(pol).length + ' polices, ' + abs.length + ' absente(s)');
    for (const [k, e] of abs) L.log('   ABSENTE ' + k + ' (' + e.caracteres + ' car.) ex. ' + e.exemples.slice(0, 2).join(' | '));
    if (!deja && A.fermer !== false) doc.close();
  }
  L.ecrireJSON(sortie, res); L.log('détail : ' + sortie);
});
