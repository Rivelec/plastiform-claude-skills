// compacter.js — compacte des documents : un enregistrement par script (doc.save) AJOUTE au fichier, qui grossit ;
// « enregistrer sous » un nouveau nom réécrit tout. Le script enregistre <dossier>/_c_<nom>.af à côté de l'original ;
// bin/compacter_finaliser.sh remplace ensuite les originaux (après contrôle des tailles).
//
// Paramètres : { "docs": ["<chemin Mac>.af", …] }  — aucun de ces documents ne doit avoir de modifications non
// enregistrées (sinon il est ignoré). Les documents liés (BASE) gardent leur nom : les liens restent valables.
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  for (const p of A.docs || []) {
    try {
      if (L.estPackage(p)) { L.log(p + ' : .afpackage, ignoré (compactage par script non vérifié sur les packages)'); continue; }
      const d0 = L.ouvert(p); if (d0 && d0.isDirty) { L.log(p + ' : modifié non enregistré, ignoré'); continue; }
      if (d0) d0.close();
      const doc = L.Document.load(p); const cible = L.dossierDe(p) + '_c_' + L.nomDe(p);
      L.supprimer(cible); doc.saveAs(cible); doc.close();
      L.log(L.nomDe(p) + ' : ' + (L.taille(p) / 1048576).toFixed(1) + ' Mo → ' + (L.taille(cible) / 1048576).toFixed(1) + ' Mo (' + L.nomDe(cible) + ')');
    } catch (e) { L.log(p + ' : ERREUR ' + e.message); }
  }
  L.log('Ensuite : bin/compacter_finaliser.sh <dossier> (remplace les originaux par les _c_*.af)');
});
