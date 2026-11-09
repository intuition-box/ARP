"""Build the canonical texts both classifiers read.

usage: python3 -I prep.py <oasf-1.1.0-skills.json> <oasf-skill-tags-proposal-13579.json> <skill-facts.json> <out/texts.json>

Deterministic: no randomness, inputs sorted as read. Descriptions are data only.
"""
import json
import re
import sys

DESIGN_ID = "602+design"
DESIGN_CAPTION = "Design"
DESIGN_DESC = "user interface and visual design: layout, typography, colour, polish"


def level_of(node_id):
    if node_id == DESIGN_ID:
        return 3
    d = len(str(node_id))
    return 1 if d <= 2 else (2 if d <= 4 else 3)


def main(tax_path, ref_path, facts_path, out_path):
    tax = json.load(open(tax_path))["skills"]
    by_name = {n["name"]: n for n in tax}
    nodes = {}
    for n in tax:
        pid = by_name[n["parent"]]["id"] if n["parent"] else None
        if pid is not None and n["id"] // 100 != pid:
            raise SystemExit(f"id arithmetic mismatch at {n['id']}")
        nodes[str(n["id"])] = {"caption": n["caption"], "description": n["description"] or "",
                               "parent": str(pid) if pid is not None else None}
    nodes[DESIGN_ID] = {"caption": DESIGN_CAPTION, "description": DESIGN_DESC, "parent": "602"}

    def ancestors(nid):
        out = []
        p = nodes[nid]["parent"]
        while p is not None:
            out.append(nodes[p]["caption"])
            p = nodes[p]["parent"]
        return out

    node_texts = {}
    for nid, n in nodes.items():
        # own caption + description, then ancestors' captions nearest first
        node_texts[nid] = ". ".join([n["caption"], n["description"]] + ancestors(nid))
    # for the enriched hierarchical variant: full text plus every descendant's caption,
    # so a category is described by what it contains, not by its one-line description
    kids = {}
    for nid in sorted(nodes):
        kids.setdefault(nodes[nid]["parent"], []).append(nid)

    def descendants(nid):
        out = []
        for c in kids.get(nid, []):
            out.append(nodes[c]["caption"])
            out.extend(descendants(c))
        return out

    node_sub = {nid: ". ".join([node_texts[nid]] + descendants(nid)) for nid in nodes}

    ref = json.load(open(ref_path))["skills"]
    facts = json.load(open(facts_path))["facts"]
    rows = []
    for s in ref:
        if s.get("reviewed") == "skip":
            continue
        key = re.sub(r"^https?://", "", s["url"])
        desc = (facts.get(key) or {}).get("description") or ""
        name_words = re.sub(r"[-_]+", " ", s["skill"]).strip()
        label = DESIGN_ID if s.get("arpNode") == "design" else str(s["oasfId"])
        if s.get("arpNode") not in (None, "design"):
            raise SystemExit(f"unexpected arpNode {s['arpNode']}")
        rows.append({"url": s["url"], "text": f"{name_words}. {desc}", "label": label,
                     "confidence": s["confidence"], "hasDescription": bool(desc)})
    json.dump({"nodes": {k: {"parent": v["parent"], "level": level_of(k)} for k, v in nodes.items()},
               "nodeText": node_texts, "nodeSubtreeText": node_sub, "rows": rows,
               "designId": DESIGN_ID}, open(out_path, "w"), indent=1)
    print(f"nodes {len(nodes)} (incl. design), rows {len(rows)}, "
          f"without description {sum(not r['hasDescription'] for r in rows)}")


if __name__ == "__main__":
    main(*sys.argv[1:5])
