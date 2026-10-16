// extraire_ressources.js — enregistre le fichier d'origine des images INCORPORÉES d'un document dans un dossier
// (imageResourceInterface.saveOriginalFile), pour les relier ensuite depuis Images/ (Document > Gestionnaire de
// ressources > Remplacer / Rendre lié). Les images déjà liées ne sont pas touchées.
//
// Paramètres : { "doc": "<chemin Mac>.af", "dossier": "<chemin Mac>/Images/_extraites/", "ecraser": false }
// Résultat : fichiers <nom d'origine> (ou <doc>_p<page>_<n>.<ext> s'il n'a pas de nom) + extraites.json (page, calques, ppp).
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p); const dpi = doc.dpi || 300;
  const dir = (A.dossier || L.dossierDe(p) + 'Images/_extraites/').replace(/\/?$/, '/'); L.mkdirs(dir);
  const vus = {}; const res = []; let n = 0, k = 0;
  L.planches(doc).forEach((sp, si) => L.parcourir(sp, (c, ch) => {
    const t = L.tag(c); if (t !== 'ImageNode' && t !== 'EmbeddedDocumentNode') return;
    const rs = L.ressource(c); if (rs.placement !== 'incorpore') return;
    const page = L.pageDe(sp, c); const ext = ((rs.fichier.match(/\.\w+$/) || [])[0]) || ('.' + (rs.type || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4));
    const nom = (rs.fichier || (L.nomDe(p).replace(/\.\w+$/, '') + '_p' + page + '_' + (++k) + ext)).replace(/[\/:]/g, '_');
    const e = { page, si, chemin: ch, calques: L.calques(c).join(' > '), fichier: nom, px: rs.px, ppi: t === 'ImageNode' ? Math.round(L.ppiEffectif(c, dpi)) : null };
    if (!vus[nom]) {
      const cible = dir + nom; vus[nom] = true;
      if (L.existe(cible) && !A.ecraser) e.etat = 'existe déjà';
      else { try { c.imageResourceInterface.saveOriginalFile(cible); e.etat = L.existe(cible) ? 'extrait (' + (L.taille(cible) / 1048576).toFixed(2) + ' Mo)' : 'échec (fichier absent)'; n++; } catch (x) { e.etat = 'ERREUR ' + x.message; } }
    } else e.etat = 'même fichier qu\'un placement précédent';
    res.push(e);
  }));
  L.ecrireJSON(dir + 'extraites.json', res);
  for (const e of res.slice(0, 40)) L.log('p' + e.page + ' ' + e.fichier + ' : ' + e.etat + (e.ppi ? ' (' + e.ppi + ' ppp effectifs)' : ''));
  L.log(res.length + ' placement(s) incorporé(s), ' + n + ' fichier(s) extrait(s) dans ' + dir);
  if (!deja && A.fermer !== false) doc.close();
});
