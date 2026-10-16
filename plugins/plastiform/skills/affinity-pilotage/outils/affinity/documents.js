// documents.js — documents ouverts dans Affinity ; ouvrir / fermer / enregistrer sur demande.
//
// Paramètres : { "ouvrir": ["<chemin Mac>.af", …], "fermer": ["<chemin Mac>.af" | "tous"], "enregistrer": ["<chemin Mac>.af"],
//                "forcer": false (fermer même un document modifié : ses modifications sont PERDUES) }
// Sans paramètre : liste des documents ouverts (chemin, pages, modifié ou non, planche courante).
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  for (const p of A.enregistrer || []) { const d = L.ouvert(p); if (!d) { L.log('pas ouvert : ' + p); continue; } if (L.estPackage(p)) { L.log('NON enregistré (.afpackage : enregistrer dans l\'interface, Cmd+S) : ' + p); continue; } d.save(); L.log('enregistré : ' + p); }
  const aFermer = (A.fermer || []).indexOf('tous') >= 0 ? [...L.Document.all].map(d => d.path) : (A.fermer || []);
  for (const p of aFermer) { const d = L.ouvert(p); if (!d) continue; if (d.isDirty && !A.forcer) { L.log('NON fermé (modifications non enregistrées) : ' + p); continue; } d.close(); L.log('fermé : ' + p); }
  for (const p of A.ouvrir || []) { try { L.ouvrir(p); L.log('ouvert : ' + p); } catch (e) { L.log('ERREUR ouverture ' + p + ' : ' + e.message); } }
  const docs = [...L.Document.all];
  L.log(docs.length + ' document(s) ouvert(s)');
  for (const d of docs) { let cur = -1; try { const c = d.currentSpread; cur = L.planches(d).findIndex(s => s.isSameNode(c)); } catch (e) { }
    L.log(' - ' + (d.path || '(sans nom) ' + d.title) + ' : ' + d.pageCount + ' p.' + (d.isDirty ? ', MODIFIÉ' : '') + (cur >= 0 ? ', planche courante ' + cur : '')); }
});
