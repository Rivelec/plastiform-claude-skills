// donnees_extraire.js — extrait les données répétées d'un document (prix, références, valeurs techniques) vers un
// fichier JSON central, pour les maintenir à un seul endroit et les réappliquer ensuite à toutes les langues
// (publication/appliquer_donnees.js). Repérage : planche + position (x, y) de chaque bloc de texte.
//
// Paramètres : { "doc": "<chemin Mac>/FR.af", "calque": "PRIX" (ancêtre de premier niveau ainsi nommé ; facultatif),
//   "garde": "€" (ne retenir que les segments qui contiennent ce texte ; facultatif),
//   "sortie": "<chemin Mac>/donnees.json", "contexte": true (texte voisin à gauche pour se repérer) }
// Segments : cellules pour un tableau (glyphes de saut « TableCell »), paragraphes pour un cadre de texte.
// Résultat : { _lisezmoi, calque, garde, tolerance: 8, tableaux: [{ page, planche, x, y, type, contexte, valeurs[] }] }
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const res = { _lisezmoi: ['Données centralisées extraites de ' + L.nomDe(p) + ' le ' + new Date().toISOString().slice(0, 10) + '.',
    'Modifier uniquement « valeurs » (une par segment, au format affiché), puis lancer publication/appliquer_donnees.js.',
    'page, planche, x, y servent au repérage (±tolerance px) : ne pas les modifier.'], calque: A.calque || null, garde: A.garde || null, tolerance: 8, tableaux: [] };
  const tous = L.textes(doc);
  for (const t of tous) {
    if (A.calque && t.calques[0] !== A.calque) continue;
    const segs = t.type === 'TableTextNode' ? L.cellules(t.n) : (() => { const b = L.brut(t.n); const r = []; let d = 0; for (let i = 0; i <= b.length; i++) if (i === b.length || b.charCodeAt(i) === 0x2029) { r.push({ texte: b.slice(d, i) }); d = i + 1; } return r; })();
    const valeurs = segs.map(s => s.texte);
    if (A.garde && !valeurs.some(v => v.indexOf(A.garde) >= 0)) continue;
    const e = { page: t.page, planche: t.si, x: Math.round(t.boite[0]), y: Math.round(t.boite[1]), type: t.type, valeurs };
    if (A.contexte !== false) { const voisins = tous.filter(u => u.si === t.si && u !== t && Math.abs(u.boite[1] - t.boite[1]) < 40 && u.boite[0] < t.boite[0]).sort((a, b) => b.boite[0] - a.boite[0]); if (voisins[0]) e.contexte = voisins[0].texte.replace(/\s+/g, ' ').slice(0, 60); }
    res.tableaux.push(e);
  }
  const sortie = A.sortie || L.dossierDe(p) + 'donnees.json';
  L.ecrireJSON(sortie, res);
  L.log(res.tableaux.length + ' bloc(s) de données, ' + res.tableaux.reduce((s, x) => s + x.valeurs.length, 0) + ' valeur(s) → ' + sortie);
  if (!deja && A.fermer !== false) doc.close();
});
