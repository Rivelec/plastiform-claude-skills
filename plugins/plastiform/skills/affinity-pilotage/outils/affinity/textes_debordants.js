// textes_debordants.js — repère les cadres de texte dont le texte DÉBORDE (texte caché en bas du cadre), fréquent
// après traduction (allemand, espagnol plus longs que le français).
//
// Méthode (vérifiée le 15/10/2026) : pour chaque cadre, hauteur de l'encre (getExactSpreadVisibleBox), puis cadre
// étiré ×6 vers le bas (le texte se recompose, les glyphes ne sont pas agrandis), nouvelle hauteur, annulation
// (doc.undo). Du texte était caché si la hauteur augmente ET dépasse la hauteur du cadre. Cadres en colonnes ou tournés :
// classés « douteux » (faux positifs possibles).
// ~60 cadres/s. Le document n'est PAS enregistré ; s'il a été ouvert par le script, il est refermé sans enregistrer.
// Un document déjà ouvert reste marqué « modifié » (contenu identique : annulations) : le fermer sans enregistrer.
//
// Paramètres : { "doc": "<chemin Mac>.af", "planches": [0, 1] (facultatif), "tolerance": 2 (px), "fermer": true,
//                "sortie": "<chemin Mac>.json" (défaut run/textes_debordants_<document>.json) }
// Résultat : { doc, debordants: [{ si, page, chemin, cadre[x,y,l,h], visible_h, etire_h, debut }] } + compte rendu.
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  if (deja && doc.isDirty) { L.log('ARRÊT : document ouvert avec des modifications non enregistrées'); return; }
  const tol = A.tolerance || 2; const res = { doc: p, date: new Date().toISOString(), debordants: [], douteux: [], sondes: 0, erreurs: 0 };
  L.planches(doc).forEach((sp, si) => {
    if (A.planches && A.planches.indexOf(si) < 0) return;
    const cadres = []; L.parcourir(sp, (c, ch) => { if (L.estInstance(c)) return false; if (L.tag(c) === 'FrameTextNode') cadres.push([c, ch]); });
    if (!cadres.length) return; L.focus(doc, sp);
    for (const [c, ch] of cadres) {
      if (!L.visibleEffectif(c) || !L.txt(c).trim()) continue;
      res.sondes++;
      try {
        const v1 = c.getExactSpreadVisibleBox(true, false); const b = c.spreadBaseBox;
        const T = new L.Transform(); const d = [1, 0, 0, 0, 6, -5 * b.y]; for (let i = 0; i < 6; i++) T.data[i] = d[i];
        doc.executeCommand(L.C.DocumentCommand.createTransform(L.sel(doc, c), T));
        const v2 = c.getExactSpreadVisibleBox(true, false);
        doc.undo();
        // caché seulement si le texte étiré dépasse AUSSI le cadre (sinon le cadre laisse déjà voir son débordement) ;
        // cadre en colonnes : à l'étirement tout passe dans la 1re colonne (largeur d'encre divisée) → faux positif ;
        // cadre tourné : l'étirement se fait le long du texte → faux positif.
        if (v2.height > v1.height + tol && v2.height > b.height + tol) {
          const e = { si, page: L.pageDe(sp, c), chemin: ch, cadre: L.arrondi([b.x, b.y, b.width, b.height], 0), visible_h: Math.round(v1.height), etire_h: Math.round(v2.height), debut: L.txt(c).replace(/\s+/g, ' ').slice(0, 80) };
          const tr = c.baseToSpreadTransform.data;
          if (Math.abs(tr[1]) > 1e-3 || Math.abs(tr[3]) > 1e-3) e.douteux = 'cadre tourné';
          else if (v2.width < 0.75 * v1.width) e.douteux = 'colonnes probables';
          (e.douteux ? res.douteux : res.debordants).push(e);
        }
      } catch (e) { res.erreurs++; }
    }
  });
  L.ecrireJSON(A.sortie || L.RUN + 'textes_debordants_' + L.nomDe(p).replace(/\.\w+$/, '') + '.json', res);
  L.log(L.nomDe(p) + ' : ' + res.sondes + ' cadres sondés, ' + res.debordants.length + ' débordent' + (res.douteux.length ? ', ' + res.douteux.length + ' douteux (colonnes / rotation : vérifier à l\'écran)' : '') + (res.erreurs ? ', ' + res.erreurs + ' erreur(s)' : ''));
  for (const e of res.debordants.slice(0, 40)) L.log('  p' + e.page + ' +' + Math.round(100 * (e.etire_h - e.visible_h) / Math.max(1, e.visible_h)) + ' % « ' + e.debut.slice(0, 60) + ' »');
  if (res.debordants.length > 40) L.log('  … (' + (res.debordants.length - 40) + ' autres dans le JSON)');
  if (!deja && A.fermer !== false) doc.close(); else L.log('document laissé ouvert, marqué modifié (annulations) : le fermer sans enregistrer');
});
