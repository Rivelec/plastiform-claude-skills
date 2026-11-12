#!/usr/bin/env python3
"""Read www.plastiform.info with few tokens: pages as Markdown, the URL list, the sheets in force and their text.

    plf.py urls [--lang fr] [--match REGEX]
    plf.py page PATH_OR_URL... [--outline | --section TEXT | --grep REGEX [-C N]] [--images] [--alternates] [--max N] [--fresh]
    plf.py sheets [--product NAME] [--locale fr] [--type msds|technicalSheet]
    plf.py sheet ID [--outline | --section N | --grep REGEX [-C N]] [--max N]

The site is read from PLF_BASE (default https://www.plastiform.info).
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("PLF_BASE", "https://www.plastiform.info").rstrip("/")
SHEETS = "/wp-json/plastiform/v1/sheets"
SHEET_HEADING = re.compile(r"^\S+ (\d{1,2})\s*[:.]\s*\S")


def fetch(path, params=None):
    url = path if path.startswith("http") else BASE + (path if path.startswith("/") else "/" + path)
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "plastiform-site-skill"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read().decode("utf-8", "replace"), response.headers.get("Content-Type", "")
    except urllib.error.HTTPError as error:
        sys.exit(f"HTTP {error.code} for {url}")
    except urllib.error.URLError as error:
        sys.exit(f"Cannot reach {url}: {error.reason}")


def cut(text, limit):
    if limit and len(text) > limit:
        return text[:limit].rstrip() + f"\n[... {len(text) - limit} more characters, raise --max or use --section / --grep]"
    return text


def grep(lines, pattern, context):
    regex = re.compile(pattern, re.IGNORECASE)
    keep = set()
    for index, line in enumerate(lines):
        if regex.search(line):
            keep.update(range(max(0, index - context), min(len(lines), index + context + 1)))
    out, previous = [], None
    for index in sorted(keep):
        if previous is not None and index > previous + 1:
            out.append("--")
        out.append(lines[index])
        previous = index
    return out or [f"[no line matches /{pattern}/]"]


def outline(headings, total):
    """headings: list of (line_index, level, title, start_char). Prints each heading with the size of its section."""
    out = []
    for position, (_, level, title, start) in enumerate(headings):
        end = headings[position + 1][3] if position + 1 < len(headings) else total
        out.append(f"{'  ' * (level - 1)}{title}  ({end - start} chars)")
    return out or ["[no heading]"]


def short_image(line):
    match = re.match(r"!\[(.*)\]\((.*)\)$", line)
    if not match:
        return line
    alt, src = match.groups()
    href = urllib.parse.parse_qs(urllib.parse.urlsplit(src).query).get("href")
    src = href[0] if href else src
    return f"![{alt}]({src.replace(BASE, '')})"


def split_front_matter(markdown):
    if not markdown.startswith("---\n"):
        return [], markdown
    end = markdown.find("\n---\n", 4)
    return markdown[4:end].split("\n"), markdown[end + 5:].lstrip("\n")


def page(args):
    for target in args.targets:
        params = {"format": "md"}
        if args.fresh:
            params["cbz"] = int(time.time())
        markdown, content_type = fetch(target, params)
        if "markdown" not in content_type:
            sys.exit(f"{target} did not answer in Markdown ({content_type}): not a public page, or the export is not deployed on {BASE}.")
        meta, body = split_front_matter(markdown)
        if not args.alternates:
            meta = [line for line in meta if not line.startswith(("alternates:", "  "))]
        lines = [line for line in body.split("\n") if args.images or not line.startswith("![")]
        lines = [short_image(line) for line in lines]
        lines = [line for index, line in enumerate(lines) if line or (index and lines[index - 1])]
        print("\n".join(meta))
        print(cut("\n".join(select(lines, args, page_headings(lines))), args.max))
        print()


def page_headings(lines):
    headings, offset = [], 0
    for index, line in enumerate(lines):
        match = re.match(r"(#{1,6}) (.*)", line)
        if match:
            headings.append((index, len(match.group(1)), match.group(2), offset))
        offset += len(line) + 1
    return headings


def sheet_headings(lines):
    """Numbered sections of an MSDS. A two-component product holds two runs of sections 1 to 16, one per component."""
    headings, offset, expected = [], 0, 1
    for index, line in enumerate(lines):
        match = SHEET_HEADING.match(line)
        number = int(match.group(1)) if match else 0
        if number and (number == expected or (number == 1 and expected > 2)):
            headings.append((index, 1, line, offset))
            expected = number + 1
        offset += len(line) + 1
    return headings


def select(lines, args, headings):
    total = sum(len(line) + 1 for line in lines)
    if args.outline:
        return outline(headings, total)
    if args.section:
        wanted, found = args.section.lower(), []
        for position, (index, level, title, _) in enumerate(headings):
            numbered = SHEET_HEADING.match(title)
            if (numbered and numbered.group(1) == wanted) or (not wanted.isdigit() and wanted in title.lower()):
                following = [h[0] for h in headings[position + 1:] if h[1] <= level]
                found += lines[index:following[0] if following else len(lines)]
        return found or [f"[no section matches '{args.section}', try --outline]"]
    if args.grep:
        return grep(lines, args.grep, args.context)
    return lines


def urls(args):
    xml, _ = fetch(f"/{args.lang}/sitemap.xml")
    paths = [loc.replace(BASE, "") for loc in re.findall(r"<loc>([^<]+)</loc>", xml)]
    if args.match:
        regex = re.compile(args.match, re.IGNORECASE)
        paths = [path for path in paths if regex.search(path)]
    print("\n".join(paths) if paths else f"[no URL matches /{args.match}/ in /{args.lang}/sitemap.xml]")


def sheets(args):
    params = {key: value for key, value in (("locale", args.locale), ("type", args.type)) if value}
    data = json.loads(fetch(SHEETS, params)[0])
    if args.product:
        wanted = args.product.lower()
        exact = [sheet for sheet in data if sheet["product"].lower() == wanted]
        data = exact or [sheet for sheet in data if wanted in sheet["product"].lower()]
    for sheet in data:
        print(f"{sheet['id']}\t{sheet['product']}\t{sheet['type']}\t{sheet['locale']}\t{sheet['pdf'].rsplit('/', 1)[-1]}")
    if not data:
        print("[no sheet matches]")


def sheet(args):
    data = json.loads(fetch(f"{SHEETS}/{args.id}")[0])
    print(f"{data['product']} | {data['type']} | {data['locale']} | {data['pdf']}")
    if data["text"] is None:
        print("[this PDF holds images only, no text to read: open the PDF itself]")
        return
    lines = data["text"].split("\n")
    print(cut("\n".join(select(lines, args, sheet_headings(lines))), args.max))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)

    command = commands.add_parser("urls", help="paths of the sitemap of a language")
    command.add_argument("--lang", default="en", help="en, fr, de, es, pt-br, zh (default en)")
    command.add_argument("--match", help="keep the paths matching this regex")
    command.set_defaults(run=urls)

    command = commands.add_parser("page", help="a page as Markdown, images left out")
    command.add_argument("targets", nargs="+", metavar="PATH_OR_URL")
    command.add_argument("--images", action="store_true", help="keep the images, with their alt text")
    command.add_argument("--alternates", action="store_true", help="keep the addresses of the translations")
    command.add_argument("--fresh", action="store_true", help="skip the CDN cache (after a content change)")
    command.set_defaults(run=page)
    reading = [command]

    command = commands.add_parser("sheets", help="technical sheets and MSDS in force: id, product, type, locale, file")
    command.add_argument("--product", help="product name, e.g. F20")
    command.add_argument("--locale", help="language of the sheet: en, fr, de, es, it, pl, cn...")
    command.add_argument("--type", choices=["msds", "technicalSheet"])
    command.set_defaults(run=sheets)

    command = commands.add_parser("sheet", help="text of one sheet, by the id `sheets` gives")
    command.add_argument("id", type=int)
    command.set_defaults(run=sheet)
    reading.append(command)

    for command in reading:
        command.add_argument("--outline", action="store_true", help="headings only, with the size of each section")
        command.add_argument("--section", help="one section: heading text for a page, section number for an MSDS")
        command.add_argument("--grep", help="lines matching this regex")
        command.add_argument("-C", dest="context", type=int, default=1, help="lines of context around --grep (default 1)")
        command.add_argument("--max", type=int, default=0, help="stop after N characters")

    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
