"""Exercise real multi-turn tour conversations, with transported history.

Each turn uses a new session ID to simulate a serverless cold start. A static
lookup fallback does NOT pass: real model usage and focus checks are required.
Read the saved answers against their rubrics as well as the automated checks.
"""
import argparse
import json
import re
from pathlib import Path
import sys
import time

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.corpus import normalize


SCENARIOS = [
    ("drum", "drum-natural-followups", [], [
        ("Mình đang xem cái trống, giới thiệu ngắn cho mình đi", ["answered"], ["ngoc lu", "dong son"], "Introduce the selected drum, without overwhelming source bookkeeping."),
        ("cái này có tác dụng gì v", ["answered"], ["nhac", "le", "cong dong"], "Understand everyday wording for use, not a connection-error lookup."),
        ("nó làm bằng gì", ["answered"], ["dong"], "Explicit material topic overrides previous use topic."),
        ("cái này ngoài đồng ra còn chứa vật liệu gì nữa", ["answered", "insufficient_evidence"], ["chua", "khong co", "khong xac dinh"], "Understand alloy follow-up; explain sourced type-level background without assigning a specific composition."),
        ("thế có phải nguyên chất không", ["answered", "insufficient_evidence"], ["chua", "khong the", "khong co", "khong xac dinh"], "Resolve the omitted subject as the drum's copper purity; do not assert purity."),
        ("ok vậy chuyển qua hoa văn, có gì hay", ["answered"], ["hoa van", "mat troi", "nhay mua"], "Follow explicit topic change to motifs."),
    ]),
    ("jar", "jar-referents-and-simplification", [], [
        ("trên nắp có những gì vậy", ["answered"], ["mat troi", "nam nu", "tuong"], "Describe the jar lid, not the whole jar's dimensions."),
        ("mấy đôi người đó nghĩa là sao", ["answered"], ["phon thuc", "sinh soi", "sinh san"], "Resolve 'those couples' as the lid figures and explain symbolism."),
        ("nói dễ hiểu hơn đi", ["answered"], ["sinh soi", "sinh san", "mua mang", "con cai"], "Simplify the same fertility explanation; do not change to findspot or material."),
        ("vậy còn hình ở chính giữa nắp", ["answered"], ["mat troi", "12 tia"], "Move from couples to the central sun motif on the lid."),
        ("có phải ý là 12 tháng không", ["answered", "insufficient_evidence"], ["chua", "khong co", "khong the"], "Do not invent a twelve-month calendar interpretation."),
    ]),
    ("dagger", "dagger-owner-followups", [], [
        ("dao này xài làm gì vậy", ["answered"], ["tu ve", "cat got"], "Explain uses of the type without identifying a specific specimen."),
        ("còn cái cán có tượng người thì sao", ["answered"], ["chuoi", "can", "tuong"], "Move to the hilt and explain it rather than repeating uses."),
        ("nó nói lên điều gì về người dùng", ["answered", "insufficient_evidence"], ["dia vi", "quyen luc", "thu linh", "quy toc"], "Resolve 'it' as the figurative hilt, discuss status carefully without naming an owner."),
        ("vậy người đó tên gì", ["insufficient_evidence"], ["chua", "khong the", "khong co"], "Do not fabricate a person's name; the demo has no identified specimen."),
    ]),
    ("drum", "accept-guide-offer", [{"artifact_id":"drum", "question":"Hoa văn có gì hay?", "answer":"Trên mặt trống có hình chim trong các vành hoa văn. Bạn muốn mình kể thêm về những con chim đó không?"}], [
        ("ừ kể tiếp đi", ["answered", "insufficient_evidence"], ["chim"], "Accept the guide's offer and continue about birds, not restart a general introduction."),
    ]),
    ("drum", "accept-guide-offer-ok", [{"artifact_id":"drum", "question":"Hoa văn có gì hay?", "answer":"Trên mặt trống có hình chim trong các vành hoa văn. Bạn muốn mình kể thêm về những con chim đó không?"}], [
        ("ok", ["answered", "insufficient_evidence"], ["chim"], "A bare 'ok' accepts the preceding specific offer; do not replace it with a canned greeting."),
    ]),
    ("drum", "unrelated-entity", [], [
        ("Ai vẽ bức Mona Lisa?", ["out_of_scope"], [], "An unrelated artwork is outside the three artifacts, even though art is broadly museum-related."),
    ]),
    ("jar", "unrelated-recipe", [], [
        ("Chỉ mình cách nấu bún bò", ["out_of_scope"], [], "Refuse unrelated food instructions rather than forcing them into the artifact context."),
    ]),
    ("drum", "unrelated-animal-measurement", [], [
        ("Voi cao bao nhiêu?", ["out_of_scope"], [], "Do not answer an elephant's height with the selected drum's measurement."),
    ]),
    ("drum", "unrelated-animal-topic", [], [
        ("Voi sống ở đâu?", ["out_of_scope"], [], "Do not switch to general elephant facts while a drum is selected."),
    ]),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5275")
    parser.add_argument("--only", help="Comma-separated scenario IDs")
    parser.add_argument("--interval", type=float, default=6, help="Pace live calls to respect provider quota")
    args = parser.parse_args()
    scenarios = [row for row in SCENARIOS if not args.only or row[1] in args.only.split(",")]
    results = []
    run = str(int(time.time()))
    next_call = 0.0
    with httpx.Client(base_url=args.url, timeout=25) as client:
        version = client.get("/api/health").json()["service_version"]
        for artifact, name, initial, cases in scenarios:
            history = list(initial)
            for i, (question, statuses, alternatives, rubric) in enumerate(cases):
                time.sleep(max(0, next_call-time.monotonic()))
                next_call = time.monotonic() + args.interval
                started = time.monotonic()
                body = client.post("/api/chat", json={"artifact_id":artifact, "question":question,
                    "session_id":f"cold-{run}-{name}-{i}", "history":history[-8:]}).json()
                answer = body.get("answer", "")
                real_generation = body.get("usage", {}).get("total_tokens", 0) > 0
                valid_scope_refusal = body.get("status") == "out_of_scope" and not body.get("citations")
                focused = not alternatives or any(term in normalize(answer) for term in alternatives)
                if "nguyen chat" in normalize(question):
                    # A caveat followed by a contradictory purity assertion is
                    # still wrong; the presence of 'chưa' alone is insufficient.
                    focused = focused and not re.search(r"\b(?:khong phai|khong la|chac chan la|chinh la) (?:la )?dong nguyen chat\b", normalize(answer))
                passed = body.get("status") in statuses and focused and (real_generation or valid_scope_refusal)
                result = {"scenario":name, "question":question, "rubric":rubric, "passed":passed,
                    "real_generation":real_generation, "valid_scope_refusal":valid_scope_refusal,
                    "elapsed_ms":round((time.monotonic()-started)*1000), "response":body}
                results.append(result)
                print(json.dumps({"scenario":name, "question":question, "passed":passed,
                    "real_generation":real_generation, "status":body.get("status"),
                    "elapsed_ms":result["elapsed_ms"], "answer":answer}, ensure_ascii=True), flush=True)
                if body.get("status") in {"answered", "insufficient_evidence", "needs_clarification"}:
                    history.append({"artifact_id":artifact, "question":question, "answer":answer})
    report = {"service_version":version, "passed":sum(item["passed"] for item in results),
        "total":len(results), "new_session_every_turn":True, "results":results}
    report_name = "tour-dialogues-live-targeted.json" if args.only else "tour-dialogues-live.json"
    output = Path(__file__).resolve().parents[2] / "docs" / report_name
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"RESULT: {report['passed']}/{report['total']}")
    raise SystemExit(0 if report["passed"] == report["total"] else 1)


if __name__ == "__main__":
    main()
