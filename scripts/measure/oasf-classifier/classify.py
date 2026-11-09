"""Score every reference row against the OASF tree, with BM25 and with embeddings, and measure.

usage: python3 -I classify.py <out/texts.json> <out/report-metrics.json> [<emb-name>=<emb.json> ...]

Deterministic: ties broken by node id string order. No randomness anywhere.
"""
import json
import math
import re
import sys
from collections import Counter

STOP = set("""a an and are as at be by for from has have in into is it its of on or that the this
to with via your you use using used when what which will can how do does any all their them they
etc also not no more most other such than then these those we our us skill skills agent agents
claude""".split())


def stem(w):
    for suf in ("ing", "ies", "es", "ed", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)] + ("y" if suf == "ies" else "")
    return w


def tokens(text):
    return [stem(w) for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP and len(w) > 1]


class BM25:
    def __init__(self, docs, k1=1.2, b=0.75):
        self.ids = sorted(docs)
        self.tf = {i: Counter(tokens(docs[i])) for i in self.ids}
        self.len = {i: sum(self.tf[i].values()) for i in self.ids}
        self.avg = sum(self.len.values()) / len(self.ids)
        df = Counter(t for i in self.ids for t in self.tf[i])
        n = len(self.ids)
        self.idf = {t: math.log(1 + (n - c + 0.5) / (c + 0.5)) for t, c in df.items()}
        self.k1, self.b = k1, b

    def scores(self, query):
        q = Counter(tokens(query))
        out = {}
        for i in self.ids:
            tf, s = self.tf[i], 0.0
            norm = self.k1 * (1 - self.b + self.b * self.len[i] / self.avg)
            for t in q:
                f = tf.get(t, 0)
                if f:
                    s += self.idf[t] * f * (self.k1 + 1) / (f + norm)
            out[i] = s
        return out


def cosine_scores(vec, node_vecs):
    return {k: sum(a * b for a, b in zip(vec, v)) for k, v in node_vecs.items()}


def wilson(k, n, z=1.959964):
    if n == 0:
        return None
    p = k / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return {"k": k, "n": n, "p": round(p, 4), "lo": round(c - h, 4), "hi": round(c + h, 4)}


def main(texts_path, out_path, *embs):
    T = json.load(open(texts_path))
    nodes, rows, design = T["nodes"], T["rows"], T["designId"]
    children = {}
    for k, v in nodes.items():
        children.setdefault(v["parent"], []).append(k)
    for v in children.values():
        v.sort()

    def anc(nid, lvl):
        while nodes[nid]["level"] > lvl:
            nid = nodes[nid]["parent"]
        return nid

    def rank(sc, allowed):
        return sorted(allowed, key=lambda k: (-sc[k], k))

    def flat(sc, with_design):
        allowed = [k for k in nodes if with_design or k != design]
        r = rank(sc, allowed)
        return r[0], r[:3], sc[r[0]] - sc[r[1]]

    def hier(sc, with_design, to_leaf):
        ok = lambda k: with_design or k != design  # noqa: E731
        cands = [k for k in children[None] if ok(k)]
        cur, margins, last = None, [], None
        while cands:
            opts = ([cur] if (cur is not None and not to_leaf) else []) + cands
            r = rank(sc, opts)
            margins.append(sc[r[0]] - sc[r[1]] if len(r) > 1 else float("inf"))
            last = r
            if r[0] == cur:
                break
            cur = r[0]
            cands = [k for k in children.get(cur, []) if ok(k)]
        return cur, last[:3], min(margins)

    scorers = {}
    full_bm = BM25(T["nodeText"])
    sub_bm = BM25(T["nodeSubtreeText"])
    scorers["bm25"] = {r["url"]: full_bm.scores(r["text"]) for r in rows}
    sub_scorers = {"bm25": {r["url"]: sub_bm.scores(r["text"]) for r in rows}}
    emb_meta = {}
    for spec in embs:
        name, path = spec.split("=", 1)
        E = json.load(open(path))
        emb_meta[name] = {k: E[k] for k in ("model", "revision", "pooling", "dtype", "queryPrefix")}
        scorers[name] = {r["url"]: cosine_scores(E["rows"][r["url"]], E["nodeFull"]) for r in rows}
        sub_scorers[name] = {r["url"]: cosine_scores(E["rows"][r["url"]], E["nodeSubtree"]) for r in rows}

    variants = {
        "flat": lambda sc, d: flat(sc, d),
        "hier-stop": lambda sc, d: hier(sc, d, False),
        "hier-leaf": lambda sc, d: hier(sc, d, True),
    }
    sub_variants = {"hier-stop-subtree": False, "hier-leaf-subtree": True}

    def measure(preds):
        n = len(rows)
        ex = l2 = l1 = t3 = 0
        byconf = {}
        for r, (p, top3, _) in zip(rows, preds):
            y = r["label"]
            k = min(2, nodes[y]["level"])
            e = p == y
            a2 = nodes[p]["level"] >= k and anc(p, k) == anc(y, k)
            a1 = anc(p, 1) == anc(y, 1)
            ex += e
            l2 += a2
            l1 += a1
            t3 += y in top3
            c = byconf.setdefault(r["confidence"], [0, 0, 0, 0])
            c[0] += e
            c[1] += a2
            c[2] += a1
            c[3] += 1
        # margin as confidence: terciles, then coverage curve
        order = sorted(range(n), key=lambda i: (-preds[i][2], rows[i]["url"]))
        third = n // 3

        def acc(idx):
            return {"exact": wilson(sum(preds[i][0] == rows[i]["label"] for i in idx), len(idx)),
                    "category": wilson(sum(anc(preds[i][0], 1) == anc(rows[i]["label"], 1) for i in idx), len(idx))}

        coverage = []
        for frac in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0):
            idx = order[: max(1, round(n * frac))]
            coverage.append({"coverage": frac, "marginAtLeast": round(preds[idx[-1]][2], 4), **acc(idx)})
        return {
            "n": n,
            "exact": wilson(ex, n), "sameLevel2": wilson(l2, n), "sameCategory": wilson(l1, n),
            "top3Exact": wilson(t3, n),
            "byReferenceConfidence": {c: {"exact": wilson(v[0], v[3]), "sameLevel2": wilson(v[1], v[3]),
                                          "sameCategory": wilson(v[2], v[3])}
                                      for c, v in sorted(byconf.items())},
            "marginTopThird": {"marginAtLeast": round(preds[order[third - 1]][2], 4), **acc(order[:third])},
            "marginBottomThird": {"marginAtMost": round(preds[order[n - third]][2], 4), **acc(order[n - third:])},
            "coverageCurve": coverage,
        }

    results, predictions = {}, {}
    for sname, S in scorers.items():
        for vname, fn in variants.items():
            for d in (False, True):
                key = f"{sname}/{vname}/{'design' if d else 'nodesign'}"
                preds = [fn(S[r["url"]], d) for r in rows]
                results[key] = measure(preds)
                predictions[key] = {r["url"]: {"pred": p[0], "top3": p[1], "margin": round(p[2], 5)}
                                    for r, p in zip(rows, preds)}
        for vname, to_leaf in sub_variants.items():
            for d in (False, True):
                key = f"{sname}/{vname}/{'design' if d else 'nodesign'}"
                preds = [hier(sub_scorers[sname][r["url"]], d, to_leaf) for r in rows]
                results[key] = measure(preds)
                predictions[key] = {r["url"]: {"pred": p[0], "top3": p[1], "margin": round(p[2], 5)}
                                    for r, p in zip(rows, preds)}
    # trivial prior for context: always the most frequent reference label
    top_label, _ = Counter(r["label"] for r in rows).most_common(1)[0]
    top_cat, cnt_cat = Counter(anc(r["label"], 1) for r in rows).most_common(1)[0]
    prior = {"label": top_label, "exact": wilson(sum(r["label"] == top_label for r in rows), len(rows)),
             "category": top_cat, "sameCategory": wilson(cnt_cat, len(rows))}
    json.dump({"embeddings": emb_meta, "prior": prior, "results": results}, open(out_path, "w"), indent=1)
    json.dump(predictions, open(out_path.replace(".json", "-predictions.json"), "w"))
    print(f"{'config':34} exact  lvl2   cat    top3   hi-ex  med-ex low-ex  mT3ex  mB3ex")
    for k, v in results.items():
        bc = v["byReferenceConfidence"]
        print(f"{k:34} " + " ".join(f"{x['p']:.3f}" for x in (
            v["exact"], v["sameLevel2"], v["sameCategory"], v["top3Exact"], bc["high"]["exact"],
            bc["medium"]["exact"], bc["low"]["exact"], v["marginTopThird"]["exact"],
            v["marginBottomThird"]["exact"])))
    print("prior", prior)


if __name__ == "__main__":
    main(*sys.argv[1:])
