// dump_sdk.js — copie le code des modules du SDK d'Affinity dans run/sdk/ (pour retrouver une API quand le MCP
// d'Affinity, qui donne la documentation, est injoignable). Paramètres : { "modules": ["/document.js", …] } (facultatif).
const L = require('__OUTILS__lib/affinity_lib.js');
L.job(A => {
  const mods = A.modules || ['/document.js', '/nodes.js', '/commands.js', '/selections.js', '/story.js', '/storydelta.js',
    '/geometry.js', '/fs.js', '/rasterobject.js', '/rasterinterface.js', '/imageresourceinterface.js', '/colours.js', '/fonts.js',
    '/glyphatts.js', '/textattributes.js', '/paragraphatts.js', '/buffer.js', '/units.js', '/application.js', '/app.js',
    '/textframeinterface.js', '/artboardinterface.js', '/physicalrootinterface.js', '/collection.js', '/handleobject.js',
    '/datamerge.js', '/resources.js', '/preferences.js', '/history.js', '/console.js', '/os.js', '/path.js', '/ui.js'];
  const dir = L.RUN + 'sdk/'; L.mkdirs(dir); let ok = 0;
  for (const m of mods) {
    let M; try { M = require(m); } catch (e) { L.log(m + ' : absent'); continue; }
    const lignes = [];
    for (const k of Object.keys(M)) { const v = M[k]; lignes.push('// --- ' + k); if (typeof v === 'function') { try { lignes.push(Function.prototype.toString.call(v)); } catch (e) { } } else { try { lignes.push(JSON.stringify(v)); } catch (e) { lignes.push(String(v)); } } }
    L.ecrire(dir + m.replace(/\//g, ''), lignes.join('\n')); L.log(m + ' : ' + Object.keys(M).length + ' exports'); ok++;
  }
  L.log(ok + ' modules copiés dans run/sdk/');
});
