# projet.json — référence

Fichier unique de paramètres d'un projet (modèles commentés : `_Outils_Affinity/modeles/projet.catalogue.json`,
`projet.fiches.json`). Lu par `export_publication.js`, `export_par_element.js`, `appliquer_donnees.js`,
`projet.py`, `verif_pdfs.py`. Valider après chaque modification : `projet.py valider <dossier>`.

```json
{
 "projet": {"nom": "Catalogue Plastiform 2026", "type": "catalogue|fiches", "prefixe": "BRO_RIV", "annee": "2026",
            "version": "1.0", "etat": "non publiée|publiée", "publiee_le": "15/10/2026", "auteur": "Rivelec - Plastiform",
            "langue_reference": "FR"},
 "fichiers": {"base": "BASE.af", "langues": {"FR": "FR.af", "EN": "EN.af"}, "modele_langue": "{langue}.af",
              "images": "Images/", "exports": "EXPORTS/", "scripts": "Scripts/"},
 "titres": {"FR": "Plastiform – Catalogue {annee}", "EN": "Plastiform – Pricelist {annee}"},
 "reference": {"modele": "{prefixe}_{numero}_{annee}_V{version}", "motif": "BRO_RIV_\\d+_\\d{4}_V\\d+(?:\\.\\d+)*"},
 "elements": {"PRIX": {"calque": "PRIX"}, "UNCETA": {"motif": "unceta"}},
 "variantes": {"AP": {"libelle": "avec prix", "afficher": ["PRIX"], "masquer": ["UNCETA"]},
               "SP": {"libelle": "sans prix", "afficher": [], "masquer": ["PRIX", "UNCETA"]},
               "UNCETA_SP": {"libelle": "UNCETA, sans prix", "afficher": ["UNCETA"], "masquer": ["PRIX"]}},
 "supports": {"WEB": {"libelle": "écran", "prereglages": ["PDF Catalogue web", "PDF (numérique - haute qualité)"]},
              "IMP": {"libelle": "imprimeur, fond perdu 3 mm", "prereglages": ["PDF (Imprimerie)"]}},
 "exports": [{"langue": "FR", "variante": "AP", "numero": 38, "supports": ["WEB", "IMP"]},
             {"langue": "ES", "variante": "UNCETA_SP", "numero": 42, "supports": ["WEB"], "pages": "1-56"}],
 "nom_fichier": "{support}_{langue}_{variante}_{ref}.pdf",
 "donnees": {"fichier": "tarifs.json", "calque": "PRIX", "garde": "€", "tolerance": 8},
 "decoupage": { "...": "fiches : voir ci-dessous" },
 "verifications": {"pages": 56, "ppp_min": 150, "taille_max_mo": {"WEB": 40, "IMP": 120},
                   "fond_perdu_mm": {"WEB": 0, "IMP": 3}, "titre_contient_ref": true,
                   "variantes": {"AP": {"requis": ["€"]}, "SP": {"interdits": ["€"]}},
                   "requis": [], "interdits": [], "polices_autorisees": ["BeauSans", "Poppins", "Hind"]},
 "changelog": {"mode": "document|elements"}
}
```

## Détails
- **Placeholders** : `{prefixe} {numero} {annee} {version} {langue} {variante} {support} {ref}` (+ `{produit}`,
  `{version_fichier}`, `{date}` pour le découpage).
- **elements** : `calque` = calques de PREMIER niveau portant exactement ce nom ; `motif` = tout objet (hors BASE et
  instances de maquette) dont le nom contient le motif (insensible à la casse). Les variantes affichent/masquent ces
  éléments avant l'export ; le document n'est pas enregistré.
- **reference.motif** : expression régulière qui trouve la référence imprimée dans les textes (dos, pied de page) ;
  chaque occurrence est remplacée par `reference.modele` avant l'export de la variante.
- **exports[].pages** : plage facultative (ex. « 1-54 » pour une version sans les 2 dernières pages).
- **supports[].prereglages** : liste ordonnée ; le premier préréglage existant sur le poste est utilisé (journal).
- **donnees** : voir le skill `affinity-donnees-centralisees`.
- **verifications** : règles de `verif_pdfs.py` ; `titre_contient_ref` à false pour les fiches (titres sans
  référence).

## Section decoupage (fiches, un PDF par élément)
```json
"decoupage": {
 "debut": "^(Informations Clés|Key information|Wichtige Informationen|Información clave)\\s*$",
 "reference": "^(TEC_FTE_RIV_\\d{3}_\\S+)$", "produit": "^TEC_FTE_RIV_\\d{3}_(.+)_[A-Z]{2}$",
 "version": "^Versi[oó]n (\\d+)\\.(\\d+)$",
 "version_datee": "^(?:Version (?:du|of the|dated|vom|del)|Versión del|Stand vom) (\\d\\d)[\\/.](\\d\\d)[\\/.](\\d\\d)$",
 "noms": {"F30Visual": "F30 Visual", "F20XL": "F20 XL"},
 "page_precedente": "^(F20XL|F30XL|F50XL|F85XL)$",
 "titres": {"FR": "Fiche technique Plastiform {produit} – Version {version}"},
 "titres_dates": {"FR": "Fiche technique Plastiform {produit} – Version du {date}", "DE": "… Stand vom {date_points}"},
 "sortie": "PDF/Fiches/{langue}/", "nom_fichier": "{ref}_{version_fichier}.pdf",
 "prereglages": ["PDF Fiches techniques web", "PDF (numérique - haute qualité)"]
}
```
Un élément commence à chaque page où un texte correspond à `debut` et s'arrête avant le suivant (pages vides de fin
retirées) ; sans référence ou sans version lue dans ses pages, il n'est pas exporté (journal).

## Ancien format catalogue.json
Lu tel quel par `export_publication.js` (variantes `prix` / `unceta` → éléments PRIX / UNCETA). Conversion :
`projet.py convertir <dossier>` (catalogue.json conservé ; projet.json prioritaire ensuite).
