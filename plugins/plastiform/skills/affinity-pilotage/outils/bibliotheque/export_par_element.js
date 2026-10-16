// Export par élément — un PDF par élément (fiche technique, chapitre…) et par langue, nommé d'après
// la référence imprimée et la version. Utilisation : ouvrir un fichier du projet (FR, EN ou BASE), puis Exécuter.
// Fichiers jamais enregistrés. Journal : export_log.txt dans le dossier de sortie (ex. PDF/Fiches/).
// Cette entrée charge la version à jour de Bureau/Cowork/_Outils_Affinity/publication/export_par_element.js :
// mettre à jour les outils suffit, l'entrée de bibliothèque n'a pas à changer.
const fs = require('/fs.js');
const O = '/Users/tanguy.rivelec/Desktop/Cowork/_Outils_Affinity/';
const src = O + 'publication/export_par_element.js', dst = O + 'run/bib_export_par_element_' + Date.now() + '.js';
let u;
try { u = new Uint8Array(fs.File.readAll(src).buffer); }
catch (e) { console.log('Outils introuvables : ' + src + ' — installer _Outils_Affinity (Bureau > Cowork) et autoriser ce dossier dans Réglages > Exécution de scripts.'); throw e; }
const f = fs.File.create(dst, 'wb'); f.write(u.buffer, u.byteLength); f.close();
try { require(dst); } finally { try { fs.remove(dst); } catch (e) { } }
