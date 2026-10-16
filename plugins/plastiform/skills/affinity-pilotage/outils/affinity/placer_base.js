// placer_base.js — place la BASE (document Affinity LIÉ, graphisme commun aux langues) au fond de chaque planche
// d'un fichier de langue, la planche N de la BASE sur la planche N du fichier, calée sur les bords de la planche
// (ou du fond perdu, si la BASE y a été étendue : détecté d'après la taille de la graine).
//
// Préalable (une seule fois, à la main) : dans le fichier de langue, Fichier > Insérer… la BASE.af (en LIEN, pas
// incorporée) sur n'importe quelle planche → « graine ». Le script la duplique sur toutes les planches.
// Paramètres : { "doc": "<chemin Mac>.af", "base": "BASE" (texte contenu dans le nom du fichier lié),
//   "mode": "simulation" (défaut) | "application", "enregistrer": true, "fermer": true }
// Application : document ouvert par l'outil → enregistré et compacté ; déjà ouvert → enregistré. Refusée sur un
// .afpackage et sur un document déjà ouvert avec des modifications non enregistrées.
// Contrôle : chaque instance doit coïncider avec la planche (±0,5 px) et afficher la planche de même rang.
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const p = A.doc; const appliquer = A.mode === 'application';
  if (appliquer && L.estPackage(p)) { L.log('ARRÊT : ' + L.interditModifier(null, p, false)); return; }   // sans l'ouvrir (lent)
  const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const fermer = () => { if (!deja && A.fermer !== false) doc.close(); };
  const refus = L.interditModifier(doc, p, deja);
  if (appliquer && refus) { L.log('ARRÊT : ' + refus); fermer(); return; }
  const motif = A.base || 'BASE'; const SP = () => L.planches(doc);
  const estB = c => L.estBase(c) && String(L.ressource(c).fichier).indexOf(motif) >= 0;
  const box = r => (r && r.x !== undefined) ? r : { x: r[0], y: r[1], width: r[2], height: r[3] };
  const toutes = []; SP().forEach((sp, i) => { for (const c of L.enfants(sp, false)) if (estB(c)) toutes.push([i, c]); });
  L.log('instances de « ' + motif + ' » : ' + toutes.length + ' (planches ' + toutes.map(x => x[0]).join(',') + ') sur ' + SP().length + ' planches');
  if (!toutes.length) { L.log('aucune graine : insérer la BASE en lien sur une planche (Fichier > Insérer…) puis relancer'); fermer(); return; }
  const deja1 = SP().map((sp, i) => toutes.filter(x => x[0] === i).length);
  if (!appliquer) { L.log('SIMULATION : planches sans BASE : ' + (deja1.map((k, i) => k ? null : i).filter(x => x !== null).join(',') || 'aucune') + ' ; en double : ' + (deja1.map((k, i) => k > 1 ? i : null).filter(x => x !== null).join(',') || 'aucune') + (refus ? ' ; NB : application impossible en l\'état — ' + refus : '')); fermer(); return; }
  const seedSp = toutes[0][0]; const seed = toutes[0][1];
  for (const [i, c] of toutes.slice(1)) { L.focus(doc, i); doc.executeCommand(L.C.DocumentCommand.createDeleteSelection(L.sel(doc, c))); }
  const ids = seed.getSpreads(false); const n = SP().length; let ok = 0; const bad = [];
  if (ids.length < n) L.log('ATTENTION : la BASE a ' + ids.length + ' planches, le fichier ' + n);
  function caler(i, node) {
    L.focus(doc, i); if (ids[i]) doc.executeCommand(L.C.DocumentCommand.createSetEmbeddedDocumentSelectedSpreadID(L.sel(doc, node), ids[i].spreadID));
    // cible = planche seule, ou planche + fond perdu si la BASE a été étendue au fond perdu (taille la plus proche)
    const e0 = box(SP()[i].getSpreadExtents()); const e1 = box(SP()[i].getSpreadExtents({ includeBleed: true })); const b = box(node.spreadBaseBox);
    const e = Math.abs(b.width - e1.width) + Math.abs(b.height - e1.height) < Math.abs(b.width - e0.width) + Math.abs(b.height - e0.height) ? e1 : e0;
    const dx = e.x - b.x, dy = e.y - b.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) doc.executeCommand(L.C.DocumentCommand.createTransform(L.sel(doc, node), L.Transform.createTranslate(dx, dy)));
    const b2 = box(node.spreadBaseBox); if ([b2.x - e.x, b2.y - e.y, b2.width - e.width, b2.height - e.height].some(v => Math.abs(v) > 0.5)) bad.push(i + ' : boîte ' + L.arrondi([b2.x, b2.y, b2.width, b2.height]).join(',') + ' ≠ planche ' + L.arrondi([e.x, e.y, e.width, e.height]).join(',')); else ok++;
  }
  for (let i = 0; i < n; i++) {
    if (i === seedSp) continue; L.focus(doc, seedSp); const dup = seed.duplicate();
    try { doc.executeCommand(L.C.DocumentCommand.createMoveNodes(L.sel(doc, dup), SP()[i].firstChild, L.C.NodeMoveType.Before, L.C.NodeChildType.Main)); }
    catch (e) { bad.push(i + ' : déplacement ' + e.message); try { dup.delete(); } catch (e2) { } continue; }
    const d2 = SP()[i].firstChild; if (!estB(d2)) { bad.push(i + ' : copie introuvable'); continue; } caler(i, d2);
  }
  L.focus(doc, seedSp); const fc = SP()[seedSp].firstChild; if (!fc.isSameNode(seed)) doc.executeCommand(L.C.DocumentCommand.createMoveNodes(L.sel(doc, seed), fc, L.C.NodeMoveType.Before, L.C.NodeChildType.Main));
  caler(seedSp, SP()[seedSp].firstChild);
  L.log('BASE calée sur ' + ok + '/' + n + ' planches' + (bad.length ? ' ; anomalies : ' + bad.slice(0, 10).join(' | ') : ''));
  if (A.enregistrer !== false) { if (deja) { doc.save(); L.log('enregistré'); } else L.log(L.enregistrerCompact(doc, p)); }
});
