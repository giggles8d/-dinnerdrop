import json, glob, os, sys, statistics as st
from collections import Counter, defaultdict
S = os.path.dirname(os.path.abspath(__file__))
R = sorted(glob.glob(os.path.join(S, "..", "responses", "*.json")))
rows = []
for f in R:
    with open(f, encoding="utf-8") as fh:
        rows.append(json.load(fh))
print("responses:", len(rows))
SITES = ["DD", "EM", "PTE", "OL", "HF"]
NAMES = {"DD": "DinnerDrop", "EM": "eMeals", "PTE": "Plan to Eat", "OL": "Ollie", "HF": "HelloFresh"}
MEAS = ["clarity", "trust", "value", "ease", "want_to_sign_up"]
def panel(r): return r["id"].split("-")[0]
def fmt(xs):
    if not xs: return "-"
    m = st.mean(xs); sd = st.pstdev(xs) if len(xs) > 1 else 0
    return f"{m:.1f} (±{sd:.1f}, {min(xs)}-{max(xs)})"
out = []
groups = [("P1", "Busy working parents"), ("P2", "Budget-watching families"), ("P3", "Households with a complication"), ("ALL", "All 48")]
for g, gname in groups:
    rs = [r for r in rows if g == "ALL" or panel(r) == g]
    out.append(f"\n### {gname} (n={len(rs)})\n")
    out.append("| Site | " + " | ".join(m.replace('_', ' ') for m in MEAS) + " | Average of 5 |")
    out.append("|---|" + "---|" * (len(MEAS) + 1))
    for s in SITES:
        cells = []
        allavg = []
        for m in MEAS:
            xs = [r["sites"][s]["scores"][m] for r in rs if s in r["sites"]]
            cells.append(fmt(xs))
        for r in rs:
            if s in r["sites"]:
                allavg.append(st.mean(r["sites"][s]["scores"][m] for m in MEAS))
        cells.append(fmt([round(x, 1) for x in allavg]))
        out.append(f"| {NAMES[s]} | " + " | ".join(cells) + " |")
# would sign up, pay, delivers food
out.append("\n### Would sign up / pay / thinks it delivers food (all 48)\n")
out.append("| Site | Sign up yes/maybe/no | Pay per month: median (range) | Thinks it delivers food: yes / unsure / no |")
out.append("|---|---|---|---|")
for s in SITES:
    c = Counter(r["sites"][s]["full_page"]["would_sign_up"] for r in rows)
    pays = [float(r["sites"][s]["full_page"]["pay_per_month"] or 0) for r in rows]
    d = Counter(r["sites"][s]["five_sec"]["delivers_food"] for r in rows)
    out.append(f"| {NAMES[s]} | {c['yes']} / {c['maybe']} / {c['no']} | ${st.median(pays):.2f} (${min(pays):.0f}-${max(pays):.0f}) | {d['yes']} / {d['unsure']} / {d['no']} |")
for g, gname in groups[:3]:
    rs = [r for r in rows if panel(r) == g]
    d = Counter(r["sites"]["DD"]["five_sec"]["delivers_food"] for r in rs)
    out.append(f"- DD delivers food, {gname}: yes {d['yes']}, unsure {d['unsure']}, no {d['no']}")
# offer
oc = Counter(r["dd_offer"]["clear"] for r in rows)
ok = Counter(bool(r["dd_offer"].get("expectation_correct")) for r in rows)
out.append(f"\n### Offer: clear {oc['clear']}, partly {oc['partly']}, unclear {oc['unclear']}; day-15 expectation correct {ok[True]}, wrong {ok[False]}")
# head to head
out.append("\n### Overall winner among five")
for g, gname in groups:
    rs = [r for r in rows if g == "ALL" or panel(r) == g]
    c = Counter(r["head_to_head"]["winner"] for r in rs)
    out.append(f"- {gname}: " + ", ".join(f"{NAMES.get(k,k)} {v}" for k, v in c.most_common()))
out.append("\n### Pairwise DD vs each (all 48)")
for s in SITES[1:]:
    c = Counter(r["head_to_head"]["pairwise"][s]["winner"] for r in rows)
    out.append(f"- DD vs {NAMES[s]}: DD {c['DD']}, {NAMES[s]} {c[s]}" + (f", other {sum(v for k,v in c.items() if k not in ('DD',s))}" if sum(v for k,v in c.items() if k not in ('DD',s)) else ""))
# DD position effect
pos = defaultdict(list)
for r in rows:
    pos[r["order"].index("DD")].append(st.mean(r["sites"]["DD"]["scores"][m] for m in MEAS))
out.append("\n### Order check: DD average by position shown (1 = first)")
out.append(", ".join(f"pos {k+1}: {st.mean(v):.1f} (n={len(v)})" for k, v in sorted(pos.items())))
# segment cuts
def seg(fn, label):
    out.append(f"\n### DD want-to-sign-up by {label}")
    d = defaultdict(list)
    for r in rows:
        d[fn(r)].append(r["sites"]["DD"]["scores"]["want_to_sign_up"])
    out.append(", ".join(f"{k}: {st.mean(v):.1f} (n={len(v)})" for k, v in sorted(d.items())))
P = {}
for f in glob.glob(r"C:\Users\setzl\dinnerdrop\docs\panels\*.json"):
    for p in json.load(open(f, encoding="utf-8"))["personas"]:
        P[p["id"]] = p
seg(lambda r: "sceptic" if P.get(r["id"], {}).get("sceptic") else "not sceptic", "sceptic")
seg(lambda r: P.get(r["id"], {}).get("tech_comfort", "?"), "tech comfort")
seg(lambda r: (P.get(r["id"], {}).get("meal_service_status", "?").split(":")[0]).strip(), "meal-service status")
open(os.path.join(S, "aggregate.md"), "w", encoding="utf-8").write("\n".join(out))
print("\n".join(out))
