// ping.js — test du lanceur et de la bibliothèque : liste les documents ouverts et les préréglages d'export.
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  L.log('lanceur OK — outils : ' + L.OUTILS);
  const docs = [...L.Document.all];
  L.log(docs.length + ' document(s) ouvert(s)'); for (const d of docs) L.log('  ' + d.path + (d.isDirty ? '  (modifié)' : ''));
  L.log('préréglages : ' + L.prereglages().join(' | '));
  if (A.echo) L.log('paramètres : ' + JSON.stringify(A));
});
