// corrections_textes.js — rechercher / remplacer dans les textes d'un document en CONSERVANT la mise en forme
// (remplacement de plages, de la fin vers le début), avec simulation obligatoire avant application.
//
// Paramètres : {
//   "doc": "<chemin Mac>.af",
//   "regles": "<chemin Mac>/regles_EN.json"  ou  [ {règle}, … ],
//   "mode": "simulation" (défaut) | "application",
//   "enregistrer": true          (application : document ouvert par l'outil → enregistré ET compacté puis refermé ;
//                                 déjà ouvert → enregistré, laissé ouvert),
//   "fermer": true               (simulation : refermer le document s'il a été ouvert par l'outil),
//   "maquettes": false           (true : traiter aussi les textes des maquettes, qui valent pour toutes leurs pages),
//   "polices": { "normal": "BT-BeauSans-Regular", "gras": "BT-BeauSans-Bold" }  (pour le balisage **gras**),
//   "sortie": "<chemin Mac>.json" (défaut run/corrections_<doc>_<mode>.json) }
//
// Règle : {
//   "f": "texte cherché"            (littéral)          OU  "re": "expression régulière JS", "flags": "i",
//   "r": "remplacement"             ($1… avec "re" ; **mots** = gras ; "" = suppression),
//   "exact": 1   le texte ENTIER du bloc (espaces normalisés) vaut f → tout le bloc est remplacé,
//   "pre": 1     le texte du bloc commence par f → tout le bloc est remplacé,
//   "s": 12 | [12, 13]  planche(s) (index 0…) ; "pages": [36] ; "calque": "PRIX" (ancêtre ainsi nommé),
//   "attendu": 3  nombre d'occurrences attendu : si différent, la règle n'est PAS appliquée (signalée),
//   "normal" / "gras": polices PostScript propres à la règle, "note": "…" }
// Les textes dans les instances de maquette (PhysicalNode) ne sont jamais modifiés ici : ils sont signalés.
// Application refusée (ARRÊT) sur un .afpackage, ou sur un document déjà ouvert avec des modifications non enregistrées.
const L = require('__OUTILS__lib/affinity_lib.js');
const { Font } = require('/fonts.js');
L.job(A => {
  const p = A.doc; const appliquer = A.mode === 'application' || A.mode === 'apply';
  if (appliquer && L.estPackage(p)) { L.log('ARRÊT : ' + L.interditModifier(null, p, false)); return; }   // sans l'ouvrir (lent)
  const deja = !!L.ouvert(p); const doc = L.ouvrir(p);
  const refus = L.interditModifier(doc, p, deja);
  if (appliquer && refus) { L.log('ARRÊT : ' + refus); if (!deja && A.fermer !== false) doc.close(); return; }
  if (refus) L.log('NB : application impossible en l\'état — ' + refus);
  const regles = (typeof A.regles === 'string' ? L.lireJSON(A.regles) : A.regles || []).map((r, k) => ({ ...r, k }));
  const sortie = A.sortie || L.RUN + 'corrections_' + L.nomDe(p).replace(/\.\w+$/, '') + '_' + (appliquer ? 'application' : 'simulation') + '.json';
  let installees = null; const estInstallee = ps => { if (!installees) { installees = new Set(); try { for (const f of Font.all) installees.add(String(f.postscriptName)); } catch (e) { } } return !installees.size || installees.has(ps); };
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const planchesDe = r => r.s === undefined || r.s === -1 ? null : [].concat(r.s);

  // 1. Racines : planches (+ maquettes si demandé)
  const racines = L.planches(doc).map((sp, si) => ({ sp, si, nom: 'p' + (sp.firstPageIndex + 1) }));
  if (A.maquettes) L.maquettes(doc).forEach((m, i) => racines.push({ sp: m, si: 'M' + i, nom: 'maquette « ' + (L.nm(m) || i) + ' »', maquette: true }));

  // 2. Recherche de toutes les occurrences (positions sur le texte BRUT)
  const occ = []; const signales = []; const compte = regles.map(() => 0);
  for (const R of racines) {
    const blocs = [];
    L.parcourir(R.sp, (c, ch) => {
      if (L.estInstance(c)) { blocs.push({ instance: true, c }); return false; }
      if (c.isTextNode) blocs.push({ c, ch });
    });
    for (const b of blocs) {
      if (b.instance) continue;
      const n = b.c; const brut = L.brut(n); const lisible = norm(L.txt(n)); const page = R.maquette ? R.nom : L.pageDe(R.sp, n);
      const anc = L.calques(n);
      for (const r of regles) {
        const pl = planchesDe(r); if (pl && pl.indexOf(R.si) < 0) continue;
        if (r.pages && r.pages.indexOf(page) < 0) continue;
        if (r.calque && anc.indexOf(r.calque) < 0) continue;
        if (r.exact || r.pre) {
          if (r.exact ? lisible !== norm(r.f) : lisible.indexOf(norm(r.f)) !== 0) continue;
          occ.push({ r, R, n, page, a: 0, b: brut.length, rempl: r.r, ctx: lisible.slice(0, 80) }); compte[r.k]++; continue;
        }
        if (r.re) {
          const re = new RegExp(r.re, 'g' + (r.flags || '').replace('g', '')); let m;
          while ((m = re.exec(brut))) { if (!m[0].length) { re.lastIndex++; continue; }
            const rempl = String(r.r).replace(/\$(\d+|&)/g, (x, k) => k === '&' ? m[0] : (m[+k] !== undefined ? m[+k] : ''));   // $1… $& (sûr avec les lookbehind)
            occ.push({ r, R, n, page, a: m.index, b: m.index + m[0].length, rempl, ctx: brut.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20) }); compte[r.k]++; }
          continue;
        }
        if (!r.f) continue;
        let i = brut.indexOf(r.f);
        while (i >= 0) { occ.push({ r, R, n, page, a: i, b: i + r.f.length, rempl: r.r, ctx: brut.slice(Math.max(0, i - 30), i + r.f.length + 20) }); compte[r.k]++; i = brut.indexOf(r.f, i + Math.max(1, r.f.length)); }
      }
    }
    // textes des instances de maquette : signalés seulement
    for (const b of blocs.filter(x => x.instance)) L.parcourir(b.c, c => { if (!c.isTextNode) return; const t = L.brut(c);
      for (const r of regles) { if (r.f && !r.exact && !r.pre && t.indexOf(r.f) >= 0) signales.push(R.nom + ' : « ' + r.f.slice(0, 40) + ' » dans une instance de maquette (corriger la maquette : maquettes=true)'); } });
  }

  // 3. Règles dont le nombre d'occurrences ne correspond pas à « attendu »
  const bloquees = new Set(); for (const r of regles) if (r.attendu !== undefined && compte[r.k] !== r.attendu) bloquees.add(r.k);

  // 4. Application : par bloc, de la fin vers le début, sans chevauchement
  const res = { doc: p, mode: appliquer ? 'application' : 'simulation', date: new Date().toISOString(), regles: [], occurrences: [], signales, erreurs: [] };
  const parNoeud = new Map(); for (const o of occ) { if (bloquees.has(o.r.k)) continue; const k = o.n; if (!parNoeud.has(k)) parNoeud.set(k, []); parNoeud.get(k).push(o); }
  let nAppl = 0;
  for (const [n, liste] of parNoeud) {
    liste.sort((x, y) => y.a - x.a || y.b - x.b);
    const garde = []; for (const o of liste) { if (garde.length && o.b > garde[garde.length - 1].a) { o.ignore = 'chevauche une autre correction'; continue; } garde.push(o); }
    for (const o of liste) {
      res.occurrences.push({ regle: o.r.k, page: o.page, avant: o.ctx, remplacement: String(o.rempl).slice(0, 120), ignore: o.ignore || undefined });
      if (!appliquer || o.ignore) continue;
      try { appliquerUne(o); nAppl++; } catch (e) { res.erreurs.push('p' + o.page + ' règle ' + o.r.k + ' : ' + e.message); }
    }
  }
  function appliquerUne(o) {
    const n = o.n; const sp = o.R.sp; const t = String(o.rempl);
    if (t.indexOf('**') < 0) { L.remplacerPlage(doc, sp, n, o.a, o.b, t); return; }
    const plages = L.plagesPolice(n); const ps = plages.map(g => g.ps);
    const normal = o.r.normal || (A.polices && A.polices.normal) || ps.find(f => !/Bold|Black|Heavy|Semi|Demi|Medium/i.test(f)) || ps[0];
    let gras = o.r.gras || (A.polices && A.polices.gras) || ps.find(f => /Bold$|-Bold/i.test(f));
    if (!gras && normal) { const g = normal.replace(/-(Regular|Roman|Book|Light|Normal)$/i, '-Bold'); if (g !== normal && estInstallee(g)) gras = g; }
    if (!gras) throw new Error('police grasse introuvable pour le balisage ** (préciser "gras")');
    const plain = t.split('**').join(''); L.remplacerPlage(doc, sp, n, o.a, o.b, plain);
    if (!plain.length || !L.StoryDelta) return;
    L.formaterPlage(doc, sp, n, o.a, o.a + plain.length, L.StoryDelta.createPostscriptName(normal));
    let pos = o.a; t.split('**').forEach((morceau, k) => { if (k % 2 === 1 && morceau.length) L.formaterPlage(doc, sp, n, pos, pos + morceau.length, L.StoryDelta.createPostscriptName(gras)); pos += morceau.length; });
  }
  for (const r of regles) {
    const e = { regle: r.k, f: r.f || r.re, r: r.r, trouve: compte[r.k], attendu: r.attendu, bloquee: bloquees.has(r.k) || undefined, note: r.note };
    res.regles.push(e);
    L.log((bloquees.has(r.k) ? 'NON APPLIQUÉE ' : '') + compte[r.k] + (r.attendu !== undefined ? '/' + r.attendu : '') + ' × ' + JSON.stringify(String(r.f || r.re)).slice(0, 70) + ' → ' + JSON.stringify(String(r.r)).slice(0, 50));
  }
  for (const s of signales.slice(0, 20)) L.log('   ' + s);
  for (const s of res.erreurs.slice(0, 20)) L.log('   ERREUR ' + s);
  L.log((appliquer ? nAppl + ' remplacement(s) appliqué(s)' : 'SIMULATION : ' + occ.length + ' occurrence(s), rien n\'est modifié') + ' ; règles sans occurrence : ' + regles.filter(r => !compte[r.k]).length + ' ; détail : ' + sortie);
  L.ecrireJSON(sortie, res);
  const modifie = appliquer && nAppl;
  if (modifie && A.enregistrer !== false) {   // ouvert par le script : enregistré et compacté ; ouvert par l'utilisateur : enregistré
    if (deja) { doc.save(); L.log('enregistré (document ouvert par l\'utilisateur, laissé ouvert : compacter.js en fin de série)'); } else L.log(L.enregistrerCompact(doc, p));
  } else if (!modifie && !deja && A.fermer !== false) doc.close();
});
