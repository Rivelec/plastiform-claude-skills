# SDK JavaScript d'Affinity — l'essentiel vérifié

Affinity by Canva, version « Mid October '26 (4940) », vérifié du 08 au 15/10/2026. Référence en ligne (signatures
seules) : https://sdk.affinity.studio/latest/js/ — documentation et exemples par le MCP (`list_sdk_documentation`,
`read_sdk_documentation_topic`, dossier `tests/` utile mais parfois périmé). Les fonctions de
`lib/affinity_lib.js` (préfixe `L.`) encapsulent ce qui suit.

Sommaire : 1. Modules — 2. Documents — 3. Planches et nœuds — 4. Commandes — 5. Textes — 6. Tableaux, épinglés,
champs — 7. Maquettes — 8. Images et documents liés — 9. Export — 10. Polices et couleurs — 11. Fichiers —
12. Bibliothèque `L.`

## 1. Modules
```js
const { Document, FileExportOptions, FileExportArea, NewDocumentOptions, ImagePlacement } = require('/document.js');
const C = require('/commands.js');            // DocumentCommand, AddChildNodesCommandBuilder, NodeChildType, NodeMoveType, UnitType
const N = require('/nodes.js');               // ImageNodeDefinition, RasterFormat, NodeChildrenOnly, NodeChildType…
const { Selection, TextSelection } = require('/selections.js');
const { StoryRange, StoryIoFormat, HardBreakType } = require('/story.js');
const { StoryDelta } = require('/storydelta.js');
const { Size, Transform } = require('/geometry.js');
const { Font, FontFamily } = require('/fonts.js');
const { ColourProfile, RasterFormat } = require('/colours.js');
const { LTRB } = require('/documentproperties.js');
const { Bitmap } = require('/rasterobject.js');
const fs = require('/fs.js');
const { app } = require('/application.js');   // app.documents.current
```
Énumérations : propriétés `keys`, `values`, `entries` (pas des méthodes) ; valeur numérique : `.value`.
Lister les commandes : `Object.getOwnPropertyNames(C.DocumentCommand).filter(n => /^create/.test(n))` (372).

## 2. Documents
- `[...Document.all]` (documents ouverts), `Document.load(chemin)` (ouvre aussi dans l'interface), `doc.close()`
  (sans enregistrer), `doc.save()`, `doc.saveAs(chemin)`, `doc.isDirty`, `doc.path`, `doc.pageCount`, `doc.dpi`,
  `doc.spreads`, `doc.currentSpread`, `doc.undo()`, `doc.format` (4 = CMJN), `doc.colourProfile.name`,
  `doc.getFontNames()`.
- `doc.save()` par script **ajoute** au fichier (il grossit) ; « enregistrer sous » vers un nouveau nom réécrit tout
  (compactage). `saveAs` vers son propre chemin courant : BACKING_DATA_LOST. Package (.afpackage) : `saveAs` tout de
  suite après `load`, réessayer une fois en cas de BAD_FILE_DESCRIPTOR, contrôler la taille écrite.
- Un fichier de langue fraîchement chargé est souvent déjà `isDirty` (rafraîchissement du lien vers la BASE).
- Création : `NewDocumentOptions.createDefault()` puis `units = C.UnitType.Millimetre` (singulier) ; **largeur,
  hauteur, fond perdu, marges en mm** ; `bleed` et `margins` = `new LTRB(gauche, haut, droite, bas)` ;
  `imagePlacement = ImagePlacement.Linked` ; `isMultiPage`, `pageCount`, `isFacing`, `createMaster`, `dpi`,
  `rasterFormat = RasterFormat.CMYKA8`, `colourProfile` (`ColourProfile.getProfilesForFormat(RasterFormat.CMYKA8)`) ;
  `Document.create(o)`. `DocumentProperties.create(doc)` ne LIT PAS un document (valeurs par défaut) : ne pas
  s'en servir pour modifier un document existant.

## 3. Planches et nœuds
- Planche : `sp.firstPageIndex` (0…), `sp.pageCount`, `sp.getPageIndexOfBox(boite)`, `sp.getSpreadExtents()` et
  `getSpreadExtents({ includeBleed: true })`. Coordonnées en **px du document**, propres à chaque planche, origine en
  haut à gauche.
- Nœud : `n.children` (ordre bas → haut), `n.parent`, `n.firstChild`, `n.description` (nom du calque),
  `n.isVisible`, `n.isTextNode`, `n.spreadBaseBox` (boîte en coordonnées planche), `n.baseBox` (locale),
  `n.baseToSpreadTransform.data`, `n.getExactSpreadVisibleBox(true, false)` (encre réellement rendue),
  `n.isSameNode(m)`, `n.duplicate()`, `n.delete()`.
- Type : `Object.prototype.toString.call(n).slice(8, -1)` → `FrameTextNode`, `ArtTextNode`, `TableTextNode`,
  `ImageNode`, `EmbeddedDocumentNode` (document lié ou PDF), `RasterNode` (calque pixel), `PhysicalNode` (instance de
  maquette sur une page), `ContainerNode`, `GroupNode`, `ShapeNode`, `PolyCurveNode`…
- Enfants cachés : objets épinglés dans un texte et planches maîtresses ne sont PAS dans `children` :
  `new N.NodeChildrenOnly(x.handle, C.NodeChildType.StoryPin, false)` ; `…(doc.rootNode.handle,
  NodeChildType.MasterSpread, false)`. Clés : Main, Enclosure, MasterSpread, WrapShape, StoryPin.
- Transformations : `Transform.data = [a, b, tx, c, d, ty]` (x' = a·x + b·y + tx). `Transform.createTranslate(dx, dy)`,
  `createScale`, ou `const T = new Transform(); for (i…) T.data[i] = …`. Échelles d'un nœud : `hypot(d[0], d[3])`,
  `hypot(d[1], d[4])`.

## 4. Commandes
Toujours : planche du nœud rendue courante d'abord (`createSetCurrentSpread`), **sauf si elle l'est déjà** (sinon la
sélection est vidée). Une commande sur une planche non courante échoue en silence.
```js
doc.executeCommand(C.DocumentCommand.createSetCurrentSpread(sp));
const S = Selection.create(doc, noeud);                       // ou un tableau de nœuds de la même planche
doc.executeCommand(C.DocumentCommand.createSetVisibility(S, false));
doc.executeCommand(C.DocumentCommand.createTransform(S, T));  // { duplicateNodes: true } en 3e argument = copie
doc.executeCommand(C.DocumentCommand.createMoveNodes(S, cible, C.NodeMoveType.Before|After, C.NodeChildType.Main));
doc.executeCommand(C.DocumentCommand.createDeleteSelection(S));
doc.executeCommand(C.DocumentCommand.createSetDescription(S, 'nom'));
doc.executeCommand(C.DocumentCommand.createSetSelection(S));  // sélection visible dans l'interface
```
Raccourcis : `doc.setVisible(v, n)`, `doc.unlockSelection(n)`, `doc.deleteSelection(n)`,
`doc.rasteriseObjects(S, false, false)`. Ajouter : `const b = C.AddChildNodesCommandBuilder.create();
b.setInsertionTarget(sp); b.addNode(def); doc.executeCommand(b.createCommand(false, C.NodeChildType.Main))` — le
nouveau nœud est l'enfant qui n'existait pas avant (comparer avec `isSameNode`). `doc.addNode(def, cible)` crée le
nœud DANS la cible si c'est un RasterNode ou un EmbeddedDocumentNode.

## 5. Textes
- `n.story.getText()` = texte « lisible » (champs par leur description) ; positions : **texte brut**
  `n.story.getText(0, -1, StoryIoFormat.Raw)` (1 caractère = 1 glyphe). Cadres chaînés : `story` = toute l'histoire,
  `n.storyRange {begin, end}` = la part du cadre.
- Remplacer une plage en gardant la mise en forme (celle du 1er caractère) ; de la FIN vers le début :
  ```js
  const S = Selection.create(doc, n); S.addSubSelectionForNode(n, TextSelection.create(new StoryRange(a, b)));
  doc.executeCommand(C.DocumentCommand.createSetText(S, 'nouveau'));
  ```
  Sans sous-sélection de texte, `createSetText` AJOUTE au texte. `n.setText()` remplace tout et perd le gras.
  `createSetText` sur plusieurs paragraphes peut propager les attributs du 1er paragraphe aux suivants.
- Mise en forme d'une plage : `createFormatText(S, StoryDelta.createPostscriptName('BT-BeauSans-Bold'))`,
  `StoryDelta.createFromGlyphAtts(atts)`, `createFromParagraphAtts(atts)`, `createGlyphDouble(...)`.
- Plages : `n.story.glyphAttRuns` (`begin`, `end`, `glyphAtts.font.postscriptName`, `glyphAtts.height`…),
  `paragraphAttRuns`, `story.getParagraphAtts(pos)`, `story.getParagraphRange(pos)` (avancer à `range.end + 1`).
- **Unités** : les getters de tailles (corps, retraits, espaces) sont divisés par dpi/72 ; les setters des StoryDelta
  attendent la valeur MULTIPLIÉE par dpi/72 — mais un cadre avec sa propre échelle stocke tel quel (facteur 1).
  Étalonner par cadre (écrire la valeur lue, relire, en déduire k) et toujours relire après écriture.
- Débordement : voir `textes_debordants.js` (étirement ×6 puis `doc.undo()`), pas d'API « overflow ».

## 6. Tableaux, objets épinglés, champs
- Tableau = nœud texte dont les cellules sont séparées par des glyphes `story.getHardBreakType(i)` égal à
  `HardBreakType.TableCell` ; en texte brut ces séparateurs sont U+2029, **comme les sauts de paragraphe dans une
  cellule** : ne jamais découper sur tous les U+2029 (`L.cellules(n)`). Un U+2029 littéral dans une expression
  régulière casse le script : écrire `\u2029` (séquence d'échappement ASCII) ou comparer `charCodeAt`.
- Objets épinglés (ancrés) : invisibles dans `children` (voir § 3) ; `pinnedNode.parent` = le cadre ;
  `storyInterface.pinGlyphs` n'en donne pas le nœud.
- Champs de fusion de données : `story.dataMergeFieldGlyphs` (`fieldName`, glyphe unique) → remplacer [pos, pos+1[
  pour écrire la valeur en dur.

## 7. Maquettes
- Instance de maquette sur une page = `PhysicalNode`. Ses enfants ne sont ni sélectionnables ni modifiables par
  script (commandes « OK » sans effet) tant que l'interface n'est pas en mode **Calque > Maquette > Modifier élément
  détaché** (Maj+Cmd+D) ; session à terminer par « Terminer ». Une session par niveau d'instance imbriquée.
- Supprimer un objet de maquette partout : planche maîtresse courante, `doc.setVisible(true, n)`,
  `doc.unlockSelection(n)`, `doc.deleteSelection(n)`. Supprimer une maquette entière : panneau Pages (corbeille) —
  `createDeleteSelection` sur une planche maîtresse ne fait rien.
- Pas de « détacher de la maquette » : sortir le contenu (`createMoveNodes` après l'instance, en session détachée),
  puis supprimer l'instance vide.

## 8. Images et documents liés
- `n.imageResourceInterface` : `imageFilePath` (nom du fichier seul), `imagePlacement.value` (1 lié, 0 incorporé),
  `imageFileSize`, `originalSize`, `placedSize`, `originalDPI`, `fileTypeName`, `saveOriginalFile(chemin)`
  (récupère l'original, même d'un lien manquant depuis le cache).
- Résolution effective = `doc.dpi / max(échelles)` (= colonne du Gestionnaire de ressources).
- Créer une image : `ImageNodeDefinition.create(fmt)` + `def.setBitmap(Bitmap.loadFromFile(chemin, fmt))` →
  **incorporée** ; aucune commande ne crée un lien (Fichier > Insérer… par l'interface, ou Gestionnaire de
  ressources > Remplacer… pour transformer une incorporée en liée). Le SDK ne change pas le chemin d'un lien.
- Calque pixel : `RasterNode.createCompatibleBuffer(true).buffer` (canevas `rasterWidth × rasterHeight`, CMJNA 8 bits
  alpha non prémultiplié dans un document CMJN), `baseBox` = zone peinte en px du canevas ;
  `NodeRenderingEngine.createDefault(n, RasterFormat.CMYKA8)` rend un nœud (même un lien manquant, depuis le cache).
- Document lié (`EmbeddedDocumentNode`) : `getSpreads(false)` (et `enumerateSpreads(false, (nom, id) => …)`),
  `selectedSpreadId`, `createSetEmbeddedDocumentSelectedSpreadID(S, id)` (change la planche affichée et redimensionne),
  `layerVisibilities` / `createSetEmbeddedDocumentLayerVisibility(S, index, v)`, `PDFPassthrough`, `rasterDPI`.
  **Juste après `Document.load`, un document lié est rendu d'après un aperçu flou** : `getSpreads(false)` sur chaque
  instance force son chargement (`L.chargerLiens`, inclus dans `L.echauffer`).

## 9. Export
```js
const o = FileExportOptions.createWithPresetName('PDF (Imprimerie)');        // FileExportOptions.allPresetNames
doc.export(chemin, o, FileExportArea.createForPages('1-' + doc.pageCount));  // ou createForSpreads
doc.export(base + '.png', FileExportOptions.createWithPresetName('PNG'), FileExportArea.createForPages('3'), new Size(1240, 1754));
```
- Les réglages d'un préréglage (ppp, JPEG) ne sont pas modifiables par script : créer un préréglage dans
  l'interface. PNG de plusieurs pages : un fichier par page `<base>_<n>.png` ; Size = boîte d'ajustement (déforme si
  le rapport diffère). `doc.export` renvoie des enregistrements (avertissements).
- Échauffer avant d'exporter : `L.echauffer(doc)` (documents liés + petits rendus pour charger les polices).
- PDF : le préréglage « PPP au-delà de » ne réduit pas les images d'une BASE liée ; les SVG placés DANS un document
  lié peuvent sortir rastérisés à leur taille native. Titre du PDF : mise à jour incrémentale (export_publication.js).

## 10. Polices et couleurs
`Font.all` (installées ; `postscriptName`, `isValid`), `FontFamily.all`, `Font.create(famille, FontWeight.Bold,
italique, FontWidth.Normal)` (énumérations, pas 700). Profils CMJN disponibles : Coated FOGRA39, FOGRA27, ISO…, SWOP
(défaut). Le premier accès aux polices peut dépasser 60 s.

## 11. Fichiers (`/fs.js`)
`fs.exists(p)`, `fs.File.readAll(p).buffer` (décoder l'UTF-8 : `decodeURIComponent(escape(binaire))`),
`fs.File.create(p, 'wb'|'ab')` + `writeStringAsUtf8(s)` / `writeString(s)` (latin-1) / `write(arrayBuffer, longueur)`
(binaire : la longueur est obligatoire), `fs.remove(p)`, `fs.createDirectories(p)`, `new fs.Directory(p).entries`,
`fs.getFileSize(p)`, `fs.rename(a, b)`, `fs.copyFile(a, b)`. Accès limité aux dossiers autorisés dans Réglages > Exécution de scripts (sinon NOT_ALLOWED /
PERMISSION_DENIED).

## 12. Bibliothèque `L.` (lib/affinity_lib.js)
Nœuds : `tag nm txt brut vis visibleEffectif boite arrondi estBase estInstance enfants(x, pins) parcourir(racine, fn,
{base, instances, pins}) calques`. Fichiers : `existe lire lireJSON ecrire ajouter ecrireJSON ecrireBin mkdirs
supprimer taille dossierDe nomDe` (`ecrireJSON` crée le dossier). Journal : `log fin args job`. Documents : `ouvert
ouvrir fermerTout enregistrerCompact estPackage interditModifier planches focus sel plancheDe pageDe infoDoc
maquettes` — `interditModifier(doc, chemin, deja)` renvoie la raison de ne pas modifier (package, ou document ouvert
par l'utilisateur avec des modifications non enregistrées), à tester avant toute modification. Textes : `textes(doc, {planches}) remplacerPlage formaterPlage
plagesPolice cellules`. Divers : `visibilite ressource echelle ppiEffectif png chargerLiens echauffer rendrePages
exporterPDF prereglages`. Constantes : `L.RUN`, `L.OUTILS`, modules `L.C`, `L.N`, `L.Document`, `L.Transform`,
`L.StoryDelta`…
