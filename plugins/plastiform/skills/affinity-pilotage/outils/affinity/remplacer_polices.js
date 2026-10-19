// remplacer_polices.js — remplace des polices (absentes ou à unifier) dans tous les textes d'un ou plusieurs documents,
// plage par plage : le reste de la mise en forme (corps, couleur, interlignage…) est conservé.
//
// Paramètres : { "docs": ["<chemin Mac>.af", …],
//   "correspondances": { "FuturaBT-Medium": "Futura-Medium", "MinionPro-Regular": "BT-BeauSans-Regular" },
//        clé = nom PostScript (ou nom de famille) actuel, valeur = nom PostScript de remplacement (doit être installé),
//   "mode": "simulation" (défaut) | "application", "maquettes": true (traiter aussi les maquettes, défaut true),
//   "enregistrer": true, "sortie": "<chemin Mac>.json" }
// Application : document ouvert par l'outil → enregistré et compacté ; déjà ouvert → enregistré. Refusée sur un
// .afpackage et sur un document déjà ouvert avec des modifications non enregistrées.
// Préparer les correspondances avec inventaire_polices.js (polices absentes et exemples de textes).
const L = require('__OUTILS__lib/affinity_lib.js');
const { Font } = require('/fonts.js');
L.job(A => {
  const appliquer = A.mode === 'application' || A.mode === 'apply'; const corr = A.correspondances || {};
  const installees = new Set(); try { for (const f of Font.all) installees.add(String(f.postscriptName)); } catch (e) { }
  const cibles = [...new Set(Object.values(corr))]; const absentes = cibles.filter(c => installees.size && !installees.has(c));
  if (absentes.length) { L.log('ARRÊT : police(s) de remplacement non installée(s) : ' + absentes.join(', ')); return; }
  const res = { mode: appliquer ? 'application' : 'simulation', docs: [] };
  for (const p of A.docs || []) {
    if (appliquer && L.estPackage(p)) { const m = L.interditModifier(null, p, false); L.log('ARRÊT ' + L.nomDe(p) + ' : ' + m); res.docs.push({ doc: p, plages: 0, caracteres: 0, parPolice: {}, erreurs: [m] }); continue; }   // sans l'ouvrir
    const deja = !!L.ouvert(p); const doc = L.ouvrir(p); const r = { doc: p, plages: 0, caracteres: 0, parPolice: {}, erreurs: [] };
    const refus = L.interditModifier(doc, p, deja);
    if (appliquer && refus) { L.log('ARRÊT ' + L.nomDe(p) + ' : ' + refus); r.erreurs.push(refus); res.docs.push(r); if (!deja && A.fermer !== false) doc.close(); continue; }
    const racines = L.planches(doc).map((sp, si) => ({ sp, nom: 'p' + (sp.firstPageIndex + 1) }));
    if (A.maquettes !== false) L.maquettes(doc).forEach((m, i) => racines.push({ sp: m, nom: 'maquette ' + (L.nm(m) || i) }));
    for (const R of racines) {
      const noeuds = []; L.parcourir(R.sp, c => { if (L.estInstance(c)) return false; if (c.isTextNode) noeuds.push(c); });
      for (const n of noeuds) {
        const plages = L.plagesPolice(n).filter(g => g.fin > g.debut && (corr[g.ps] || corr[g.famille]));
        for (const g of plages.reverse()) {
          const cible = corr[g.ps] || corr[g.famille]; const k = (g.ps || g.famille) + ' → ' + cible;
          r.parPolice[k] = (r.parPolice[k] || 0) + (g.fin - g.debut); r.plages++; r.caracteres += g.fin - g.debut;
          if (!appliquer) continue;
          try { L.formaterPlage(doc, R.sp, n, g.debut, g.fin, L.StoryDelta.createPostscriptName(cible)); }
          catch (e) { r.erreurs.push(R.nom + ' : ' + e.message); }
        }
      }
    }
    res.docs.push(r);
    L.log(L.nomDe(p) + ' : ' + r.plages + ' plage(s), ' + r.caracteres + ' caractère(s) ' + JSON.stringify(r.parPolice) + (r.erreurs.length ? ' ; ' + r.erreurs.length + ' erreur(s) : ' + r.erreurs.slice(0, 3).join(' | ') : ''));
    const modifie = appliquer && r.plages;
    if (modifie && A.enregistrer !== false) { if (deja) { doc.save(); L.log('   enregistré'); } else L.log('   ' + L.enregistrerCompact(doc, p)); }
    else if (!modifie && !deja && A.fermer !== false) doc.close();
  }
  if (!appliquer) L.log('SIMULATION : rien n\'est modifié. Relancer avec "mode": "application".');
  L.ecrireJSON(A.sortie || L.RUN + 'remplacer_polices.json', res);
});
