# Retours d'expérience (mesurés)

## Catalogue Plastiform 2026 — BRO_RIV_38-46 (réorganisation du 15/10/2026)
- Avant : 4 fichiers de langue complets (FR, EN, ES, DE), images liées vers d'anciens dossiers ou incorporées,
  polices absentes, 2,9 Go de dossier. Après : `BASE.af` + `FR/EN/ES/DE.af`, `Images/` (214 fichiers), 887 Mo dont
  621 Mo de PDF ; fichiers .af : 10,6 + 13,9 + 9,2 + 8,7 + 8,8 Mo après compactage.
- Images : 149 ramenées à 300 ppp effectifs (taille physique conservée), TIFF Photoshop aplatis (8 bits, ZIP) :
  1,3 Go → 168 Mo sans perte visible ; 4 images incorporées récupérées depuis le cache (`saveOriginalFile`) et liées.
- Calques pixel peints → images liées : 7 dans la BASE, 1 portrait par langue, poster EN/ES ; poster DE manquant
  (lien vers un .af disparu, de plus dans le calque PRIX donc absent de l'export sans prix) remplacé par un TIFF rendu
  depuis le cache d'Affinity.
- Polices absentes remplacées par celles qu'Affinity utilisait déjà (rendu identique au pixel) : Minion Pro →
  Helvetica, Futura BT Bold → Helvetica Bold, Futura Lt BT → Helvetica Light.
- Maquettes inutilisées supprimées (4 par fichier de langue). Tarifs centralisés : `tarifs.json` (93 tableaux).
- Exports par script : 13 PDF (langue × variante × support), référence imprimée et titre du PDF corrigés (une
  référence ES était celle du DE ; une pastille « AP » apparaissait en SP). ~17 min.
- Contrôle : 13 PDF réexportés comparés aux précédents : textes identiques, rendus identiques hors corrections.
- Trouvés en testant les outils de revue (15/10/2026, non corrigés) : index DE p. 51 « (??????) ( A SUPPRIMER) » ;
  renvoi « voir page 50 » (FR) / « siehe Seite 46 » (DE) p. 36 ; 26 images sous 250 ppp effectifs (5 sous 100 ppp,
  ex. `F20_101_tiny.JPG` à 60 ppp p. 56) ; PDF WEB réductibles de 30 à 9 Mo (`compresser_pdf.py`).

## Fiches techniques Plastiform — TEC_FTE_RIV_08-10-26 (08-12/10/2026)
- Avant : un `.afpackage` unique FR/EN, textes dans des maquettes, données importées d'Excel (fusion qui affichait
  sur les fiches F50 à F85 XL les valeurs de la F85 XL). Après : BASE (.afpackage) + FR, EN, DE, ES (.af) ; textes au
  niveau des pages ; données en dur vérifiées (264 valeurs) ; FDS faisant foi.
- Corrections typographiques par règles (FR 274, EN 75, BASE 9) ; espace insécable avant « : » (436) ; anglais relu
  par QCM (102 règles) ; allemand : lexique définitif appliqué (DE-001 à DE-154).
- PDF par fiche et par langue (23 fiches × 4 langues, ~1,5 Mo) ; préréglage « PDF Fiches techniques web » (225 ppp,
  JPEG 85) ; bug des fiches XL contourné (page précédente).
- Restait à faire au 12/10 : textes espagnols coupés par la mise en page (détecteur au 15/10 : 256 cadres débordent
  dans ES), relecture native DE/ES des textes traduits par Claude, QR code F04 manquant.
