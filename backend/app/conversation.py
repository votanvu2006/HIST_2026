"""Resolve the requested attribute before selecting a source-backed conversational answer."""
from dataclasses import dataclass
import json
from pathlib import Path
import re

from .corpus import normalize

ANSWERS = json.loads((Path(__file__).resolve().parents[1]/"data"/"answers.json").read_text(encoding="utf-8"))


@dataclass(frozen=True)
class QuestionPlan:
    intent: str | None
    topic: str = "artifact"
    operation: str = "lookup"
    multiple: bool = False
    requests: tuple[str, ...] = ()
    complete: bool = False


def _has(text, phrases):
    return any(phrase in text for phrase in phrases)


def _question_asks_about_a_different_subject(question: str, artifact: str, plan: QuestionPlan):
    """Keep a measurement about another named thing from matching the exhibit's measurement."""
    text = normalize(question)
    intent = plan.intent
    if intent not in {"height", "weight", "face_diameter", "mouth_diameter", "lid_diameter", "base_diameter", "dimensions"}:
        if _has(text, ("nang bao nhieu", "nang bn", "trong luong", "khoi luong", "can nang")):
            intent = "weight"
        elif _has(text, ("cao bao nhieu", "cao bn", "cao may", "chieu cao")):
            intent = "height"
        else:
            return None
    if plan.intent in {"face_diameter", "mouth_diameter", "lid_diameter", "base_diameter"}:
        return None
    measurements = (
        "cao bao nhieu", "cao bn", "cao may", "chieu cao", "nang bao nhieu",
        "nang bn", "trong luong", "khoi luong", "can nang", "duong kinh",
        "rong bao nhieu", "kich thuoc", "dai bao nhieu", "dai may",
    )
    positions = [text.find(phrase) for phrase in measurements if text.find(phrase) >= 0]
    if not positions:
        return None

    start = min(positions)
    marker = next(phrase for phrase in measurements if text.find(phrase) == start)
    subject = text[:start].strip()
    if not subject:
        suffix = text[start + len(marker):].strip()
        suffix = re.sub(r"\b(?:bao nhieu|bn|cm|la|cua|con|ve|cua con)\b", " ", suffix)
        suffix = " ".join(suffix.split())
        subject = suffix
    subject = re.sub(r"^(?:(?:cho minh hoi|cho hoi|minh hoi|vay|the|con)\s+)+", "", subject).strip()
    subject = re.sub(r"\b(?:nay|kia|do|ay|thi|vay|nhe|khong|cua|bao nhieu|bn|cm|la)\b", "", subject).strip()
    if not subject or subject in {"cai nay", "cai", "hien vat nay", "co vat nay", "hien vat", "co vat", "no", "day", "con"}:
        return None

    parts = ("nap", "mat", "chan", "day", "mieng", "than", "tang", "chuoi", "luoi")
    names = {
        "drum": ("trong dong ngoc lu", "trong ngoc lu", "trong dong", "cai trong", "trong nay", "trong"),
        "jar": ("thap dong dao thinh", "thap dao thinh", "thap dong", "cai thap", "thap nay", "thap"),
        "dagger": ("dao gam dong dong son", "dao gam dong", "dao gam", "cai dao", "dao nay", "dao"),
    }
    matching_artifact = any(name in subject for name in names[artifact])
    if matching_artifact and any(re.search(rf"\b{part}\b", subject) for part in parts):
        return subject, intent, "part"
    if matching_artifact:
        return None

    # A noun supplied before or after the measurement must match the selected
    # artifact; do not substitute that artifact when the subject differs.
    return subject, intent, "other"


def plan_question(question: str, history=(), _split=True) -> QuestionPlan:
    text = normalize(question)
    if _has(text, (
        "thong tin co ban", "gioi thieu co ban", "thong tin chung", "tong quan",
        "gioi thieu so qua", "gioi thieu ve", "thong tin ve", "noi qua ve",
        "noi cho minh biet ve", "cho biet ve hien vat", "dac diem co ban",
    )):
        return QuestionPlan("overview", "artifact", "summarize")
    motif = _has(text,("hoa van", "hoa tiet", "trang tri", "hinh tuong", "nhung hinh", "hinh tren nap", "hinh tren mat", "hinh ve", "hinh khac", "mat troi", "ngoi sao", "chim", "thuyen", "tuong doi", "doi nam nu", "tuong tren nap", "tuong nam nu", "can tuong", "bieu tuong", "phon thuc", "may tia", "bao nhieu tia")) or bool(re.search(r"\b\d+ tia\b",text))
    topic = "motif" if motif else "artifact"
    # Resolve an omitted subject, not an omitted question: explicit material/use/etc.
    # always wins over the topic of the previous message.
    abstract = _has(text,("y tuong", "cam hung", "y nghia", "tuong trung", "nguon goc cua no", "vi sao vay", "tai sao vay"))
    if not motif and abstract:
        for turn in reversed(list(history)[-3:]):
            previous = turn.get("topic") or plan_question(turn["question"]).topic
            if previous == "motif":
                topic = "motif"
                break
    if _has(text,("khac nhau","chenh lech","moi nguon","moi ho so","ghi khac","so do khac")) and _has(text,("vi sao","tai sao","ly do","sao ")):
        for turn in reversed(list(history)[-3:]):
            previous_intent=turn.get("intent") or plan_question(turn["question"]).intent
            if previous_intent in ("height","base_diameter","collection","dimensions"):
                return QuestionPlan("source_conflict_reason","artifact","explain",requests=(previous_intent,))
    if _has(text,("suy ra", "chung to dieu", "gia su")) or ("neu " in text and " thi " in text):
        return QuestionPlan(None,topic,"reason")
    if _has(text,("cung so do", "bang nhau", "khac nhau", "chenh nhau")) and sum(part in text for part in ("mat","mieng","chan","day","nap"))>=2:
        parts=tuple(key for part,key in (("mat","face_diameter"),("mieng","mouth_diameter"),("chan","base_diameter"),("day","base_diameter"),("nap","lid_diameter")) if part in text)
        return QuestionPlan(None,topic,"compare",True,tuple(dict.fromkeys(parts)),True)
    if _split and re.search(r"\b(?:va|dong thoi|cung nhu)\b",text):
        parts=re.split(r"\b(?:va|dong thoi|cung nhu)\b",text)
        subplans=[plan_question(part,history,False) for part in parts if part.strip()]
        requests=tuple(dict.fromkeys(p.intent for p in subplans if p.intent))
        if len(requests)>1:
            return QuestionPlan(None,topic,"multiple",True,requests,all(p.intent for p in subplans))
    material = bool(re.search(r"\b(?:lam tu gi|lam bang gi|chat lieu|vat lieu|nguyen lieu|bang dong|bang sat|bang thep|bang vang)\b",text))
    use = _has(text,("cong dung", "tac dung", "chuc nang", "xai lam gi", "dung vao viec gi", "dung lam gi", "dung de lam gi", "su dung de", "de lam gi"))
    measurement = bool(re.search(r"\b(?:chieu cao|cao bao nhieu|cao bn|cao may|duong kinh|kich thuoc|rong bao nhieu|nang bao nhieu|trong luong|khoi luong)\b",text))
    age = _has(text,("nien dai", "co tu bao gio", "lam tu bao gio", "lam tu khi nao", "lam tu nam nao", "duc nam nao", "thuoc thoi", "lam khi nao", "lam bao gio"))
    # Several independent requests must not be reduced to whichever keyword matched first.
    if (sum((material,use,measurement,age)) >= 2 and re.search(r"\b(?:va|con|dong thoi|kem|cung nhu)\b",text)) or ("cao" in text and _has(text,("nang bao nhieu","trong luong","khoi luong"))):
        return QuestionPlan(None,topic,"multiple",True)
    if _has(text,("anh 3d", "mau vang", "mo hinh co giong", "ban sao", "nguyen ban hay", "hien vat that hay", "sao khong thay", "tai sao khong thay")) or (_has(text,("mo hinh","3d")) and _has(text,("day du","du hoa van","chinh xac","chi tiet","giong"))):
        return QuestionPlan("model_context",topic)
    if re.fullmatch(r"(?:ban hoi )?(?:cai nay|day|hien vat nay) la (?:cai gi|gi|hien vat gi)(?: vay)?",text):
        return QuestionPlan("identity")
    if topic!="motif" and "bao vat" not in text and _has(text,("ten goi", "ten nay", "goi la", "dat ten", "ten cua")) and _has(text,("sao", "vi", "nguon", "ten", "goi")):
        return QuestionPlan("name", "name", "explain")
    if topic == "motif":
        if _has(text,("y tuong", "cam hung", "lay tu dau", "nguon goc", "bat nguon", "dua vao dau", "mo phong theo")):
            return QuestionPlan("motif_inspiration","motif","interpret")
        why = _has(text,("tai sao", "vi sao", "ly do", "sao lai", "12 thang", "14 thang"))
        if _has(text,("mat troi", "tia", "12 thang", "14 thang")) and why:
            return QuestionPlan("sun_reason","motif","explain")
        if _has(text,("loai chim", "chim gi", "co phai chim")):
            return QuestionPlan("bird_identity","motif")
        if _has(text,("y nghia", "nghia gi", "nghia la", "tuong trung", "bieu thi", "the hien dieu", "dieu gi", "noi len", "thong diep", "phon thuc", "lien he gi", "quyen luc", "dia vi")):
            field="statue_meaning" if _has(text,("tuong doi", "doi nam nu", "tuong tren nap", "nam nu", "phon thuc")) else "motif_meaning"
            if _has(text,("mat troi","ngoi sao")): field="sun_meaning"
            elif "chim" in text: field="bird_meaning"
            elif "thuyen" in text: field="boat_meaning"
            return QuestionPlan(field,"motif","interpret")
        if _has(text,("duc", "tao ra", "lam the nao", "ky thuat", "bang cach nao", "che tac")):
            return QuestionPlan("pattern_manufacture" if _has(text,("hoa van","hoa tiet","trang tri")) else "manufacture","motif","process")
        if why:
            return QuestionPlan(None,"motif","explain")
        if use or material:
            return QuestionPlan(None,"motif","understand")
        if _has(text,("may tia", "bao nhieu tia", "co 14 tia", "co 12 tia", "co 16 tia")):
            return QuestionPlan("sun_count","motif")
        if _has(text,("bao nhieu", "may", "tong", "so luong")):
            if "chim" in text or "huou" in text:
                return QuestionPlan("bird_detail","motif")
            if "tuong" in text or "cap" in text:
                return QuestionPlan("statue_count","motif")
            if "thuyen" in text:
                return QuestionPlan("boat_detail","motif")
            if "vanh" in text or "bang" in text:
                return QuestionPlan("band_count","motif")
        if "thuyen" in text and _has(text,("tren thuyen", "hinh thuyen", "nhung gi", "mo ta", "nhu the nao", "co gi")):
            return QuestionPlan("boat_detail","motif")
        if _has(text,("can tuong","chuoi dao","can dao")):
            return QuestionPlan("hilt","motif","describe")
        if _has(text,("co nhung", "gom nhung", "gom gi", "hoa van gi", "hoa tiet gi", "nhu the nao", "the nao", "dac biet", "mo ta", "trang tri gi", "hoa van nao")) or text in ("hoa van","hoa tiet","con hoa van"):
            return QuestionPlan("decoration","motif","describe")
        # A topic match alone is not evidence that the visitor asked for a description.
        return QuestionPlan(None,"motif","understand")
    if _has(text,("ai duc", "ai lam ra", "ai che tac", "nguoi duc", "tho duc", "nghe nhan nao", "ngay duc", "duc vao ngay", "duc vao thang")):
        return QuestionPlan("creator")
    if _has(text,("chu nhan", "cua ai")):
        return QuestionPlan("owner")
    if _has(text,("phuc dung", "con nguyen", "bi vo", "hu hai", "mat num", "tinh trang")) and not _has(text,("tai sao","vi sao","ly do")):
        return QuestionPlan("restoration")
    if _has(text,("chat lieu", "nguyen lieu", "quang", "kim loai")) and _has(text,("nguon goc", "lay tu dau", "lay o dau", "mo nao", "den tu dau")):
        return QuestionPlan("composition")
    if _has(text,("phat hien", "tim thay", "tim ra", "khai quat", "nguon goc", "xuat xu")):
        return QuestionPlan("discoverer" if re.search(r"\b(?:ai|nguoi nao)\b",text) else "discovery")
    if age or _has(text,("bao nhieu nam tuoi", "bao nhieu tuoi", "lam cach day")):
        return QuestionPlan("period")
    if _has(text,("quy trinh", "ky thuat duc", "duc nhu the nao", "che tac the nao", "che tac nhu the nao", "che tac bang cach", "duoc duc ra sao", "duoc lam nhu the nao")):
        return QuestionPlan("manufacture",operation="process")
    if _has(text,("tai sao", "vi sao", "ly do", "sao lai")):
        if _has(text,("quan tai","mai tang","hoa tang")):
            return QuestionPlan("funerary_reason",operation="explain")
        if _has(text,("bao vat", "quan trong", "noi tieng", "gia tri")):
            return QuestionPlan("significance",operation="interpret")
        return QuestionPlan(None,topic,"explain")
    if _has(text,("ngoai dong", "con kim loai", "chua kim loai", "chua vat lieu", "nguyen chat", "dong nguyen", "chua gi khac", "thanh phan hop kim")):
        return QuestionPlan("composition")
    if material:
        if _has(text,("ty le", "phan tram", "nguyen chat", "hop kim", "thanh phan", "quang", "mo nao", "lay o dau", "chuoi", "can dao")):
            return QuestionPlan("composition")
        return QuestionPlan("material")
    if _has(text,("ty le kim loai", "thanh phan", "hop kim", "nhiet do", "nguon quang")):
        return QuestionPlan("composition")
    if use:
        return QuestionPlan("use")
    if _has(text,("bao vat", "cong nhan")):
        return QuestionPlan("treasure")
    if _has(text,("ma kiem ke", "so dang ky", "ma dang ky")):
        return QuestionPlan("inventory")
    if _has(text,("hien dang o dau", "luu giu o dau", "xem o dau", "bao tang nao", "trung bay o dau")):
        return QuestionPlan("location")
    if _has(text,("suu tam", "dua ve bao tang", "ve vien", "mua lai")):
        return QuestionPlan("collection")
    if _has(text,("bao quan", "chong gi", "ve sinh")):
        return QuestionPlan("conservation")
    if _has(text,("phuc dung", "con nguyen", "bi vo", "hu hai", "mat num", "tinh trang")):
        return QuestionPlan("restoration")
    if _has(text,("bao nhieu kg", "khoi luong", "trong luong", "nang bao nhieu", "can nang")):
        return QuestionPlan("weight")
    if measurement or re.search(r"\bcao \d",text) or text in ("cao bao nhieu", "duong kinh", "kich thuoc"):
        if _has(text,("chieu cao", "cao bao nhieu", "cao bn", "cao may")) or re.search(r"\bcao \d",text):
            return QuestionPlan("height")
        for part,key in (("nap","lid_diameter"),("mieng","mouth_diameter"),("mat","face_diameter"),("chan","base_diameter"),("day","base_diameter")):
            if re.search(rf"\b{part}\b",text):
                return QuestionPlan(key)
        return QuestionPlan("dimensions")
    if _has(text,("dai bao nhieu", "dai may")):
        return QuestionPlan("dimensions")
    if _has(text,("pho lon", "phan loai", "hai nhom", "hai pho")) or ("tay au" in text and "lac viet" in text):
        return QuestionPlan("classification")
    if _has(text,("chuoi", "can tuong", "can dao")):
        return QuestionPlan("hilt",operation="describe")
    if _has(text,("luoi", "chan tay", "dang la", "hinh dang")):
        return QuestionPlan("shape",operation="describe")
    if _has(text,("bao dao", "vo dao")):
        return QuestionPlan("sheath")
    if _has(text,("cau tao", "bo phan", "cau truc")):
        return QuestionPlan("structure")
    if _has(text,("am thanh", "am vang", "tieng trong", "tan so", "phat ra am")):
        return QuestionPlan("sound")
    if _has(text,("van hoa nao", "nen van hoa", "thuoc van hoa")):
        return QuestionPlan("culture")
    if _has(text,("gia tri", "dac sac", "noi tieng")):
        return QuestionPlan("significance",operation="interpret")
    if _has(text,("y nghia", "tuong trung")):
        return QuestionPlan("significance",operation="interpret")
    return QuestionPlan(None,topic)


def direct_intent(question: str):
    return plan_question(question).intent


def reviewed_fallback_allowed(question: str, artifact: str) -> bool:
    """An outage must not turn arbitrary named subjects into exhibit lookups.

    This deliberately narrow fallback is not the conversation interpreter. The
    model handles natural follow-ups with full dialogue when it is available.
    """
    text = normalize(question)
    names = {"drum": ("ngoc lu", "trong dong", "cai trong"),
             "jar": ("dao thinh", "thap"), "dagger": ("dao gam", "cai dao", "dao nay")}
    if any(re.search(rf"\b{re.escape(name)}\b", text) for name in names[artifact]):
        return True
    if _has(text, ("cai nay", "hien vat", "co vat", "ngoai dong", "nguyen chat")):
        return True
    return bool(re.fullmatch(
        r"(?:con |vay |the |no )?(?:chat lieu|nien dai|kich thuoc|chieu cao|trong luong|"
        r"khoi luong|nang bao nhieu|cao bao nhieu|lam bang gi|lam tu gi|ma kiem ke)"
        r"(?: la gi| bao nhieu| thi sao| vay| nhe)?", text))


def validate_answers(corpus):
    for artifact,book in ANSWERS.items():
        for key,item in book.items():
            if not item["text"].strip() or len(item["sources"])>3:
                raise ValueError(f"Invalid answer record: {artifact}/{key}")
            for chunk_id in item["sources"]:
                chunk=corpus.by_id.get(chunk_id)
                if not chunk or chunk["artifact_id"]!=artifact or not chunk["source_checked"]:
                    raise ValueError(f"Invalid answer source: {artifact}/{key}")


def known_answer(question: str, artifact: str, history=()):
    text=normalize(question)
    if re.fullmatch(r"(?:cam on(?: ban)?|thanks|thank you|ok|oke|hay qua|tuyet voi|xin chao|chao ban)[ !.]*",text):
        return "answered", "Mình luôn sẵn lòng! Bạn muốn khám phá thêm điều gì về hiện vật này?", []
    plan=plan_question(question,history)
    different_subject=_question_asks_about_a_different_subject(question,artifact,plan)
    if different_subject:
        _,measurement_intent,subject_kind=different_subject
        if subject_kind=="other":
            return "out_of_scope", "Mình chỉ trả lời câu hỏi về ba hiện vật đang trưng bày. Câu này đang hỏi về một đối tượng khác nên mình không lấy số đo của hiện vật để trả lời nhé.", []
        measurement=ANSWERS[artifact].get(measurement_intent)
        if measurement:
            label="chiều cao" if measurement_intent=="height" else "cân nặng" if measurement_intent=="weight" else "kích thước"
            return "insufficient_evidence", f"Hồ sơ chưa ghi riêng {label} của phần này; số đo mình có là của toàn bộ hiện vật.", []
        return "insufficient_evidence", "Mình chưa có số đo của đối tượng bạn hỏi trong hồ sơ hiện vật này.", []
    if plan.intent=="overview" and "overview" in ANSWERS[artifact]:
        item=ANSWERS[artifact]["overview"]
        return item.get("status","answered"),item["text"],list(item["sources"])
    if plan.multiple and plan.complete and plan.requests:
        labels={"weight":"khối lượng","height":"chiều cao","inventory":"số đăng ký","period":"niên đại","creator":"người chế tác","location":"nơi lưu giữ"}
        records=[]
        for key in plan.requests:
            item=ANSWERS[artifact].get(key)
            if item:
                records.append(item)
            else:
                records.append({"status":"insufficient_evidence","text":f"Riêng {labels.get(key,'chi tiết còn lại')}, mình chưa có thông tin được xác nhận trong hồ sơ.","sources":[]})
        prefix=""
        if plan.operation=="compare" and len(records)>1:
            sets=[set(item.get("values",[])) for item in records]
            if all(sets) and not set.intersection(*sets):
                prefix="Theo các số đo đang có, hai phần này không bằng nhau. "
        sources=list(dict.fromkeys(chunk for item in records for chunk in item["sources"]))
        status="answered" if any(item.get("status","answered")=="answered" for item in records) else "insufficient_evidence"
        return status,prefix+"\n\n".join(item["text"] for item in records),sources
    if plan.intent=="source_conflict_reason":
        field=plan.requests[0]
        if field=="dimensions": field="height" if artifact=="jar" else "base_diameter"
        item=ANSWERS[artifact].get(field+"_conflict_reason")
        if item:
            return item.get("status","insufficient_evidence"),item["text"],list(item["sources"])
        return None
    if plan.intent == "model_context":
        return "answered", "Bạn đang xem mô hình 3D minh họa trong demo. Màu sắc và chi tiết được đơn giản hóa, nên không dùng hình này để kết luận về màu bề mặt, độ nguyên vẹn hay mọi hoa văn của hiện vật thật.", []
    if plan.intent in ANSWERS[artifact]:
        item=ANSWERS[artifact][plan.intent]
        answer=item["text"]
        if plan.intent=="material" and "co phai" in text and _has(text,("sat","thep","vang","nhua")):
            answer="Không, chất liệu lịch sử được ghi nhận là đồng. "+answer
        return item.get("status","answered"),answer,list(item["sources"])
    unknown = {"creator","owner","weight","height","face_diameter","mouth_diameter","lid_diameter","base_diameter","dimensions","inventory","conservation","sound","bird_identity","restoration","location","pattern_manufacture","sun_meaning","sun_reason","sun_count","band_count","statue_meaning","statue_count","bird_detail","bird_meaning","boat_detail","boat_meaning"}
    if plan.intent in unknown:
        if artifact=="dagger":
            return "insufficient_evidence", "Mình chưa có thông tin riêng đó cho mẫu dao trên màn hình, vì mô hình chưa gắn với một tiêu bản khảo cổ cụ thể. Mình có thể giải thích những gì đã biết về loại hình dao găm Đông Sơn.", []
        return "insufficient_evidence", "Chi tiết bạn hỏi chưa được xác nhận trong hồ sơ mình đã đối chiếu. Mình không nên đoán một tên, con số hay cách làm cụ thể; bạn có thể hỏi tiếp về phần đã có tư liệu nhé.", []
    return None


def supported_numbers(answer: str, evidence: str) -> bool:
    def values(text):
        return {re.sub(r"\D", "", value) for value in re.findall(r"\d+(?:[.,/]\d+)*",text)}
    return values(answer)<=values(evidence)
