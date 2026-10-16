// Export publication — exporte toutes les versions PDF d'une publication multilingue (catalogue,
// brochure…) d'après son projet.json : langues × variantes × supports, référence imprimée, nom de fichier, titre du PDF.
// Utilisation : ouvrir un fichier de la publication (BASE.af, FR.af…), puis Exécuter. Les fichiers de langue sont
// ouverts, exportés et refermés sans être enregistrés. Journal : EXPORTS/export_log.txt.
// Cette entrée charge la version à jour de Bureau/Cowork/_Outils_Affinity/publication/export_publication.js :
// mettre à jour les outils suffit, l'entrée de bibliothèque n'a pas à changer.
const fs = require('/fs.js');
const O = '/Users/tanguy.rivelec/Desktop/Cowork/_Outils_Affinity/';
const src = O + 'publication/export_publication.js', dst = O + 'run/bib_export_publication_' + Date.now() + '.js';
let u;
try { u = new Uint8Array(fs.File.readAll(src).buffer); }
catch (e) { console.log('Outils introuvables : ' + src + ' — installer _Outils_Affinity (Bureau > Cowork) et autoriser ce dossier dans Réglages > Exécution de scripts.'); throw e; }
const f = fs.File.create(dst, 'wb'); f.write(u.buffer, u.byteLength); f.close();
try { require(dst); } finally { try { fs.remove(dst); } catch (e) { } }
