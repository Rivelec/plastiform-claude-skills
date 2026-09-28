// One entry per genre: its form (sent to Gemini), the JSON schema it fills, the checks run on the
// answer, and the Markdown rendering. Only form: what the text says comes from the brief (content
// or sections), and no marketing device is added here. The common rule is references/rules.md.
const text = { type: 'string' };
const list = (items) => ({ type: 'array', items });
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

const words = (s) => String(s ?? '').split(/\s+/).filter(Boolean).length;
const chars = (s) => [...String(s ?? '')].length;
const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const range = (label, n, min, max, unit) => (n < min || n > max ? [`${label} : ${n} ${unit}, attendu ${min} à ${max}.`] : []);
const H = { fr: { subject: 'Objet', specs: 'Caractéristiques' }, en: { subject: 'Subject', specs: 'Specifications' } };
const h = (brief) => H[brief.language] ?? H.en;

// A section is a heading and blocks; a block is a paragraph, followed by a list when it has one.
const block = obj({ text, bullets: list(text) });
const section = obj({ heading: text, blocks: list(block) });
const sectionsForm = [
  "- sections : exactement une section par section du brief, dans le même ordre. heading : un intertitre court qui dit ce que contient la section, sans jeu de mots. blocks : des paragraphes d'une à quatre phrases ; bullets seulement pour des étapes ou des éléments vraiment parallèles, placés après le paragraphe qui les annonce, sinon liste vide.",
  "- Pas de section de conclusion qui résume : le texte s'arrête après la dernière section du brief.",
];
const sectionsChecks = (c, brief) => [
  ...(c.sections.length !== (brief.sections ?? []).length ? [`${c.sections.length} sections écrites pour ${(brief.sections ?? []).length} dans le brief : une par section, dans l'ordre.`] : []),
  ...c.sections.filter((s) => s.blocks.some((b) => b.bullets.length) && s.blocks.at(-1).text.trim().endsWith(':') && !s.blocks.at(-1).bullets.length).map((s) => `Section « ${s.heading} » : un paragraphe annonce une liste qui ne suit pas.`),
];
const sectionsText = (c) => c.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap((b) => [b.text, ...b.bullets])]);
const sectionsMarkdown = (c) => c.sections.map((s) => [`## ${s.heading}`, ...s.blocks.map((b) => [b.text, b.bullets.map((x) => `- ${x}`).join('\n')].filter(Boolean).join('\n\n'))].join('\n\n'));
const wordRange = (brief, label, body) => (brief.format?.minWords || brief.format?.maxWords ? range(label, words(body), brief.format.minWords ?? 0, brief.format.maxWords ?? Infinity, 'mots') : []);

export const TYPES = {
  mail: {
    input: 'content',
    prompt: (brief) => [
      'Genre : mail.',
      "- subject : l'objet, 3 à 7 mots, qui dit simplement de quoi parle le mail.",
      "- greeting : la formule d'appel de sa langue (« Bonjour » en français) et le prénom s'il est connu, suivie d'une virgule ; aucune civilité devinée d'après le prénom.",
      `- paragraphs : le corps, en paragraphes courts d'une à trois phrases (il sera souvent lu sur un téléphone) ; des points liés vont dans le même paragraphe. ${brief.format?.maxWords ?? 125} mots au plus en tout.`,
      '- closing : une formule de fin très courte ou une chaîne vide.',
      "- Aucune signature, ni nom ni fonction : la messagerie l'ajoute.",
      "- S'il répond à un message (context), il y répond sans le reformuler.",
      "- Pas de relance qui quémande (« avez-vous bien reçu mon mail ? », « je voulais juste savoir si… »).",
    ].join('\n'),
    schema: obj({ subject: text, greeting: text, paragraphs: list(text), closing: text }),
    body: (c) => [c.greeting, ...c.paragraphs, c.closing].join('\n\n'),
    checks: (c, brief) => {
      const author = String(brief.author ?? '').split(',')[0].trim();
      return [
        ...range('Longueur du mail', words([c.greeting, ...c.paragraphs, c.closing].join(' ')), 1, brief.format?.maxWords ?? 125, 'mots'),
        ...range("Longueur de l'objet", words(c.subject), 2, 8, 'mots'),
        ...(author && fold([...c.paragraphs, c.closing].join(' ')).includes(fold(author)) ? [`Le mail est signé (${author}) : la messagerie ajoute la signature.`] : []),
      ];
    },
    render: (c, brief) => `**${h(brief).subject} :** ${c.subject}\n\n${[c.greeting, ...c.paragraphs, c.closing].filter((p) => p.trim()).join('\n\n')}\n`,
  },

  blog: {
    input: 'sections',
    prompt: () => [
      'Genre : article de blog.',
      "- title : 4 à 10 mots, 70 caractères au plus ; il dit de quoi parle l'article, sans jeu de mots, sans question ni point d'exclamation.",
      "- intro : le chapô, 50 mots au plus, qui donne l'essentiel de ce que contient l'article ; le reste détaille.",
      '- Des dates absolues (« en mars 2026 ») plutôt que « récemment » ou « le mois prochain ».',
      ...sectionsForm,
    ].join('\n'),
    schema: obj({ title: text, intro: text, sections: list(section) }),
    body: (c) => [c.intro, ...sectionsText(c)].join('\n\n'),
    checks: (c, brief) => [
      ...range('Longueur du titre', chars(c.title), 1, 70, 'caractères'),
      ...range('Longueur du titre', words(c.title), 4, 10, 'mots'),
      ...range('Longueur du chapô', words(c.intro), 1, 50, 'mots'),
      ...sectionsChecks(c, brief),
      ...c.sections.filter((s) => /^(en )?conclusion|^in conclusion|^pour conclure|^en résumé|^fazit/i.test(s.heading.trim()) && !(brief.sections ?? []).some((b) => fold(b.heading ?? '').includes('conclusion'))).map((s) => `Section « ${s.heading} » : pas de conclusion qui résume.`),
      ...wordRange(brief, "Longueur de l'article", [c.intro, ...sectionsText(c)].join(' ')),
    ],
    render: (c) => [`# ${c.title}`, c.intro, ...sectionsMarkdown(c)].join('\n\n') + '\n',
  },

  'product-page': {
    input: 'sections',
    prompt: () => [
      'Genre : page produit.',
      '- title : le nom du produit exactement comme dans les faits.',
      "- summary : une ou deux phrases qui disent ce qu'est le produit et à quoi il sert.",
      ...sectionsForm,
      "- specs : les caractéristiques données dans les faits, chaque value recopiée telle quelle ; liste vide s'il n'y en a pas.",
      "- Un ton factuel, au présent : ce que fait le produit, sur quoi, avec quelles valeurs. Chaque affirmation repose sur un fait du brief.",
      "- Des phrases où le produit ou l'utilisateur agit (sujet, verbe, résultat), plutôt que des « permet de » enchaînés ou des tournures passives.",
    ].join('\n'),
    schema: obj({ title: text, summary: text, sections: list(section), specs: list(obj({ label: text, value: text })) }),
    body: (c) => [c.summary, ...sectionsText(c)].join('\n\n'),
    checks: (c, brief) => {
      const facts = fold(JSON.stringify(brief.facts ?? []));
      const squash = (s) => fold(s).replace(/[\s ]/g, '');
      return [
        ...(facts.includes(fold(c.title)) ? [] : [`Le nom « ${c.title} » ne figure pas dans les faits.`]),
        ...range('Longueur du résumé', words(c.summary), 1, 50, 'mots'),
        ...sectionsChecks(c, brief),
        ...c.specs.filter((s) => !squash(facts).includes(squash(s.value))).map((s) => `Caractéristique « ${s.label} : ${s.value} » absente des faits.`),
        ...wordRange(brief, 'Longueur de la page', [c.summary, ...sectionsText(c)].join(' ')),
      ];
    },
    render: (c, brief) => [
      `# ${c.title}`, c.summary, ...sectionsMarkdown(c),
      ...(c.specs.length ? [`## ${h(brief).specs}`, ['| | |', '|---|---|', ...c.specs.map((s) => `| ${s.label} | ${s.value} |`)].join('\n')] : []),
    ].join('\n\n') + '\n',
  },

  linkedin: {
    input: 'content',
    prompt: (brief) => [
      "Genre : post LinkedIn, à la première personne, écrit par l'auteur.",
      `- text : des paragraphes d'une à trois phrases séparés par une ligne vide, ${brief.format?.maxChars ?? 1300} caractères au plus ; la longueur vient du contenu, un contenu court donne un post court.`,
      "- La première ligne est courte et dit le premier point du contenu, simplement, sans formule d'accroche.",
      '- Écrit pour le téléphone : des blocs courts et de l\'espace, mais jamais de retour à la ligne au milieu d\'une phrase. Il parle au lecteur en « vous ».',
      '- hashtags : seulement ceux du brief (hashtags), sans le #, sinon liste vide.',
      '- Pas de flèches, de puces décoratives ni de lignes d\'une seule expression.',
    ].join('\n'),
    schema: obj({ text, hashtags: list(text) }),
    body: (c) => c.text,
    checks: (c, brief) => {
      const allowed = (brief.hashtags ?? []).map((t) => fold(t.replace(/^#/, '')));
      return [
        ...range('Longueur du post', chars(c.text), brief.format?.minChars ?? 1, brief.format?.maxChars ?? 1300, 'caractères'),
        ...c.hashtags.filter((t) => !allowed.includes(fold(t.replace(/^#/, '')))).map((t) => `Hashtag « ${t} » absent du brief.`),
        ...(/#\p{L}/u.test(c.text) ? ['Hashtags dans le texte : seulement ceux du brief, à la fin.'] : []),
        ...c.text.split(/\n\s*\n/).filter((p) => chars(p) > 350).map((p) => `Paragraphe trop long (${chars(p)} caractères) : « ${p.slice(0, 50)}… »`),
      ];
    },
    render: (c) => `${c.text}${c.hashtags.length ? '\n\n' + c.hashtags.map((t) => '#' + t.replace(/^#/, '')).join(' ') : ''}\n`,
  },
};
