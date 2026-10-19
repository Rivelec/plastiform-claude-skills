// inventaire_liens.js — images, documents liés et calques pixel d'un ou plusieurs documents.
// Pour chaque placement : fichier, liée / incorporée, présence du fichier, résolution effective (ppp), page, calques.
//
// Paramètres : { "docs": ["<chemin Mac>.af", …],
//                "dossier_images": "<chemin Mac>/Images/"   (défaut : <dossier du document>/Images/),
//                "sortie": "<chemin Mac>.json"              (défaut : run/inventaire_liens.json),
//                "fermer": true                              (refermer les documents ouverts par le script) }
// Résultat : JSON { docs: [{ doc, info, comptes, images[], documents[], rasters[] }], fichiers: { nom: {…} } }
// « manquant » = fichier introuvable dans Images/ ni à côté du document (le SDK ne donne que le nom du fichier) :
// confirmer dans Document > Gestionnaire de ressources (colonne État).
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const sortie = A.sortie || L.RUN + 'inventaire_liens.json';
  const tous = { date: new Date().toISOString(), docs: [], fichiers: {} };
  for (const p of A.docs || []) {
    const deja = !!L.ouvert(p); const doc = L.ouvrir(p); const dpi = doc.dpi || 300;
    const dossier = L.dossierDe(p); const dImg = A.dossier_images || dossier + 'Images/';
    const r = { doc: p, info: L.infoDoc(doc), comptes: { lie: 0, incorpore: 0, manquant: 0, raster: 0, documents: 0 }, images: [], documents: [], rasters: [] };
    L.planches(doc).forEach((sp, si) => L.parcourir(sp, (c, ch) => {
      const t = L.tag(c);
      if (t === 'ImageNode' || t === 'EmbeddedDocumentNode') {
        const rs = L.ressource(c);
        const e = { si, page: L.pageDe(sp, c), chemin: ch, calques: L.calques(c).join(' > '), visible: L.visibleEffectif(c), ...rs };
        if (t === 'ImageNode') e.ppi = Math.round(L.ppiEffectif(c, dpi));
        if (rs.placement === 'lie' && rs.fichier) e.manquant = !(L.existe(dImg + rs.fichier) || L.existe(dossier + rs.fichier));
        if (rs.placement === 'incorpore') r.comptes.incorpore++; else if (rs.placement === 'lie') r.comptes.lie++;
        if (e.manquant) r.comptes.manquant++;
        if (t === 'ImageNode') r.images.push(e); else { r.documents.push(e); r.comptes.documents++; }
        const k = rs.fichier || ('(incorporée sans nom) ' + p.replace(/^.*\//, '') + ' p' + e.page);
        const f = tous.fichiers[k] = tous.fichiers[k] || { fichier: rs.fichier, placements: 0, docs: [], pages: [], ppi_min: null, ppi_max: null, px: rs.px, dpi: rs.dpi, octets: rs.octets, placement: rs.placement, manquant: !!e.manquant, type: t };
        f.placements++; if (f.docs.indexOf(p) < 0) f.docs.push(p); if (f.pages.indexOf(e.page) < 0) f.pages.push(e.page);
        if (e.ppi) { f.ppi_min = f.ppi_min === null ? e.ppi : Math.min(f.ppi_min, e.ppi); f.ppi_max = f.ppi_max === null ? e.ppi : Math.max(f.ppi_max, e.ppi); }
      } else if (t === 'RasterNode') {
        let bb = null; try { const b = c.baseBox; bb = [b.x, b.y, b.width, b.height]; } catch (e) { }
        r.rasters.push({ si, page: L.pageDe(sp, c), chemin: ch, nom: L.nm(c), calques: L.calques(c).join(' > '), px: [c.rasterWidth, c.rasterHeight], contenu: bb, visible: L.visibleEffectif(c) });
        r.comptes.raster++;
      }
    }));
    tous.docs.push(r);
    L.log(p.replace(/^.*\//, '') + ' : ' + JSON.stringify(r.comptes));
    for (const e of r.images.filter(x => x.placement === 'incorpore').slice(0, 15)) L.log('   incorporée p' + e.page + ' ' + (e.fichier || '(sans nom)') + ' [' + e.calques + ']');
    for (const e of [...r.images, ...r.documents].filter(x => x.manquant).slice(0, 15)) L.log('   manquante ? p' + e.page + ' ' + e.fichier);
    for (const e of r.rasters.slice(0, 15)) L.log('   calque pixel p' + e.page + ' « ' + e.nom + ' » ' + e.px.join('×') + ' contenu ' + (e.contenu || []).map(Math.round).join(','));
    if (!deja && A.fermer !== false) doc.close();
  }
  const fs = Object.values(tous.fichiers).filter(f => f.ppi_min);
  L.log('fichiers images : ' + Object.keys(tous.fichiers).length + ' ; ppp effectif < 200 : ' + fs.filter(f => f.ppi_min < 200).length + ' ; > 600 : ' + fs.filter(f => f.ppi_min > 600).length);
  L.ecrireJSON(sortie, tous); L.log('détail : ' + sortie);
});
