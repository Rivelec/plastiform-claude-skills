---
name: plastiform-site
description: Use when you need what www.plastiform.info says - a product page, blog or Help Center article, FAQ, image alt text, translation, technical data sheet or safety data sheet (MSDS). Reads the site's Markdown and JSON exports with few tokens. Use it before WebFetch, raw HTML, a browser or a PDF.
---

# Reading www.plastiform.info with few tokens

A product page weighs 255 KB as HTML, about 65,000 tokens. The site can serve it as Markdown (14 KB), and this skill's script returns only the outline or the section you need (often under 2 KB). A 22-page safety data sheet is 47 KB of text; its section 14 is 1.5 KB.

So the method is always the same: **locate, look at the outline, then read only what answers the question.**

The script is `scripts/plf.py` in this skill's directory (the base directory shown when the skill loads). Python 3, no dependency:

```bash
PLF="<this skill's directory>/scripts/plf.py"
```

## Pages

```bash
python3 $PLF urls --lang fr --match "produits/fluide"     # paths of a language's sitemap (en by default)
python3 $PLF page /fr/produits/fluide/f20/ --outline      # headings and the size of each section
python3 $PLF page /fr/produits/fluide/f20/ --section "Questions Fréquentes"
python3 $PLF page /en/products/fluid/f20/ --grep "shore|working time" -C 2
python3 $PLF page /fr/produits/fluide/f20/                # whole page, images left out
```

- `page` takes a path or a full URL, and several at once.
- The output opens with the canonical address, the language, the title and the meta description.
- `--alternates` adds the address of the page in every language. It is the cheapest way to find a translation, since slugs are translated (`/en/products/fluid/` becomes `/fr/produits/fluide/`).
- `--images` keeps the images with their alt text, where they stand. An image without alt comes out as `![](…)`. Ask for it only for work on images: they make the output heavier.
- `--max N` stops after N characters and says how many are left.
- `--fresh` skips the CDN cache. The Markdown can be a day old after a content change: use it to check a correction that was just made.

The outline alone often answers: the questions of a FAQ, the related products and the accessories are headings. `--outline --alternates` gives the structure of a page and the address of its translations in one call.

The characteristics of a product (hardness, working time, consistency) sit at the top of the page, before the "Description" heading. `--grep` finds them without reading the rest.

For a question that spans many pages (every alt text, a word across the blog), write the outputs to a scratch file and print only the result, not the pages:

```bash
for p in $(python3 $PLF urls --match "^/en/blog/.+/.+"); do python3 $PLF page "$p" --grep "shrinkage" -C 0; done > "$SCRATCH/blog.txt"
grep -c . "$SCRATCH/blog.txt"
```

## Technical data sheets and safety data sheets

The site lists only the sheets in force: those attached to the English version of each product. Instructions for use are not listed.

```bash
python3 $PLF sheets --product F20 --locale fr     # id, product, type, language, PDF file
python3 $PLF sheet 14130 --outline                # sections of an MSDS and their size
python3 $PLF sheet 14130 --section 14             # one section, by its number
python3 $PLF sheet 16240 --grep "shore|dureté"    # a technical sheet has no numbered sections: search it
```

- `--type` is `msds` or `technicalSheet`. `--locale` is the language of the sheet (`en`, `fr`, `de`, `es`, `it`, `pl`, `cn`, `sv`, `da`, `no`, `pt`, `nl`), not the language of the site.
- Ids change when a sheet is replaced: always go through `sheets` again instead of reusing an id seen elsewhere, including the ones in the examples above.
- The MSDS of a two-component product holds two runs of sections 1 to 16, one per component. `--section 9` returns both.
- The file name carries the version (`_V2-0`, `Ed_46136`), and the top of every MSDS gives its revision date.

## What the skill cannot see

Tell the user instead of filling the gap:

- **Only content published in production is read.** A draft is not there. To read another copy of the site that has the exports, set `PLF_BASE` to its address: `PLF_BASE=https://… python3 $PLF …`.
- **Only www.plastiform.info has these exports.** academy.plastiform.info, form.plastiform.info and media.plastiform.info do not (for the media library, use `plastiform-media`).
- **The catalogue `/en/products/` is rendered in the browser**: its Markdown holds the title only. List the products with `urls --match products`.
- **What depends on the browser is not exported**: the price of a chosen variant, the cart, search results. The site header, footer, menus and forms are left out on purpose.
- **Chinese (`cn`) and Polish (`pl`) MSDS**: their PDFs carry fonts without a Unicode table. Chinese comes out almost empty and Polish loses its accented letters. Do not quote these texts, point to the PDF.
- **`[this PDF holds images only]`**: the sheet has no text layer. Give the link to the PDF.

## Without the script

The same data can be read by hand, at the cost of more tokens:

- `GET <page URL>?format=md` returns the page as Markdown.
- `GET /wp-json/plastiform/v1/sheets?locale=fr&type=msds&product_id=<id>` returns the list as JSON.
- `GET /wp-json/plastiform/v1/sheets/<id>` adds the `text` field.
- `https://www.plastiform.info/llms.txt` (15 KB) is an annotated map of the site, useful to get your bearings when you do not know where to look.
