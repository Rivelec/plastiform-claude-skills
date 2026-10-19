// extraire_pixels.js — sort les calques pixel (RasterNode) d'un document vers des fichiers, pour les remplacer par
// des images LIÉES (un calque pixel est stocké dans le .af et l'alourdit ; une image liée reste dans Images/).
//
// Paramètres : { "doc": "<chemin Mac>.af", "dossier": "<chemin Mac>/Images/_pixels/",
//                "planches": [3, 4] (facultatif), "min_px": 64 (ignorer les petits calques) }
// Résultat, pour chaque calque : <dossier>/<nom>.raw (octets bruts du canevas, format du calque) + <nom>.json
//   { doc, si, page, chemin, nom, calques, format, largeur, hauteur (canevas), local (zone peinte, px du canevas),
//     boite (même zone, coordonnées planche), transform }
// Puis, côté VM : python3 python/pixels_vers_fichiers.py <dossier VM>  → <nom>.tif (CMJN + alpha) ou .png (RVB)
// Puis, dans Affinity : Fichier > Insérer… (lié) sur la bonne planche et positionner.js pour l'ajuster à « boite ».
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const dir = (A.dossier || L.dossierDe(p) + 'Images/_pixels/').replace(/\/?$/, '/'); L.mkdirs(dir);
  const base = L.nomDe(p).replace(/\.\w+$/, ''); let n = 0;
  L.planches(doc).forEach((sp, si) => {
    if (A.planches && A.planches.indexOf(si) < 0) return;
    L.parcourir(sp, (c, ch) => {
      if (L.tag(c) !== 'RasterNode') return;
      const w = c.rasterWidth, h = c.rasterHeight; if (Math.min(w, h) < (A.min_px || 64)) return;
      const nom = (base + '_p' + L.pageDe(sp, c) + '_' + (L.nm(c) || 'pixel')).replace(/[^\w.-]+/g, '_') + '_' + (++n);
      try {
        const buf = c.createCompatibleBuffer(true); const ab = buf.buffer || buf;
        const u = ab instanceof ArrayBuffer ? new Uint8Array(ab) : new Uint8Array(ab.buffer || ab);
        L.ecrireBin(dir + nom + '.raw', u);
        let fmt = ''; try { fmt = String(c.rasterFormat && (c.rasterFormat.name || c.rasterFormat)); } catch (e) { }
        let tr = null; try { tr = [...c.baseToSpreadTransform.data]; } catch (e) { }
        // canevas du calque (largeur × hauteur px) ; « local » = zone peinte en coordonnées du canevas ; « boite » = la même zone
        // en coordonnées de planche : pixels_vers_fichiers.py recadre le canevas sur « local », l'image obtenue va dans « boite ».
        let bb = null, lb = null; try { const b = c.spreadBaseBox; bb = [b.x, b.y, b.width, b.height]; } catch (e) { } try { const b = c.baseBox; lb = [b.x, b.y, b.width, b.height]; } catch (e) { }
        L.ecrireJSON(dir + nom + '.json', { doc: p, si, page: L.pageDe(sp, c), chemin: ch, nom: L.nm(c), calques: L.calques(c), format: fmt, largeur: w, hauteur: h, octets: u.length, canaux: u.length / (w * h), local: lb, boite: bb, transform: tr, visible: L.visibleEffectif(c) });
        L.log('p' + L.pageDe(sp, c) + ' « ' + L.nm(c) + ' » ' + w + '×' + h + ' ' + fmt + ' → ' + nom + '.raw (' + (u.length / 1048576).toFixed(1) + ' Mo)');
      } catch (e) { L.log('p' + L.pageDe(sp, c) + ' « ' + L.nm(c) + ' » : ERREUR ' + e.message); }
    });
  });
  L.log(n + ' calque(s) pixel extrait(s) dans ' + dir + (n ? ' — ensuite : python3 python/pixels_vers_fichiers.py <dossier>' : ''));
  if (!deja && A.fermer !== false) doc.close();
});
