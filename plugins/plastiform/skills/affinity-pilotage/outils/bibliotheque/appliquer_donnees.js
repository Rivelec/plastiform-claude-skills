// Appliquer les données — reporte les données centralisées (prix… : tarifs.json ou fichier de
// données du projet) dans tous les fichiers de langue, mise en forme conservée. Utilisation : enregistrer les
// valeurs dans le fichier de données, ouvrir un fichier du projet, puis Exécuter ; chaque langue est mise à jour,
// enregistrée et refermée. Puis relancer « Export publication ». Journal : EXPORTS/donnees_log.txt.
// Cette entrée charge la version à jour de Bureau/Cowork/_Outils_Affinity/publication/appliquer_donnees.js :
// mettre à jour les outils suffit, l'entrée de bibliothèque n'a pas à changer.
const fs = require('/fs.js');
const O = '/Users/tanguy.rivelec/Desktop/Cowork/_Outils_Affinity/';
const src = O + 'publication/appliquer_donnees.js', dst = O + 'run/bib_appliquer_donnees_' + Date.now() + '.js';
let u;
try { u = new Uint8Array(fs.File.readAll(src).buffer); }
catch (e) { console.log('Outils introuvables : ' + src + ' — installer _Outils_Affinity (Bureau > Cowork) et autoriser ce dossier dans Réglages > Exécution de scripts.'); throw e; }
const f = fs.File.create(dst, 'wb'); f.write(u.buffer, u.byteLength); f.close();
try { require(dst); } finally { try { fs.remove(dst); } catch (e) { } }
