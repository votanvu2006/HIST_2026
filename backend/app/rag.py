from collections import OrderedDict, deque
import json
import re
import threading
import time

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from .config import Settings
from .conversation import ANSWERS, direct_intent, known_answer, plan_question, reviewed_fallback_allowed, supported_numbers, validate_answers
from .corpus import ARTIFACTS, Corpus, explicit_artifacts, normalize
from .schemas import ChatRequest, ChatResponse, Citation, GuidedReply, Passage, Selection

from .tour_prompt import TOUR_GUIDE_PROMPT as SYSTEM_PROMPT


REFUSALS = {
    "needs_selection": "Bạn chọn một hiện vật trước nhé, rồi mình cùng khám phá!",
    "needs_clarification": "Bạn đang muốn mình giải thích thêm chi tiết nào của hiện vật?",
    "insufficient_evidence": "Chi tiết bạn vừa hỏi hiện chưa có đủ căn cứ trong hồ sơ mình đã kiểm tra. Mình chưa thể đưa ra một kết luận chắc chắn.",
    "out_of_scope": "Mình hướng dẫn về Trống Ngọc Lũ, Thạp Đào Thịnh và dao găm Đông Sơn trong phần trưng bày này. Câu vừa rồi nằm ngoài phạm vi đó; mình cùng quay lại hiện vật bạn đang xem nhé.",
    "temporarily_unavailable": "Kết nối của mình đang bị gián đoạn. Bạn gửi lại câu vừa rồi nhé, mình vẫn giữ mạch trò chuyện để giải thích tiếp.",
}


class EvidenceSelector:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._model = None
        self._fallback_model = None

    def _build_model(self, name):
        model = ChatGoogleGenerativeAI(
            model=name, google_api_key=self.settings.api_key,
            max_retries=0, timeout=10, max_output_tokens=1200,
            thinking_config=({"thinking_budget": 0} if name.startswith("gemini-2.5-flash") else {"thinking_level": "minimal" if "flash-lite" in name else "low"}),
        )
        return model.with_structured_output(GuidedReply, method="json_schema", include_raw=True)

    def select(self, payload):
        if not self.settings.api_key:
            raise RuntimeError("MISSING_API_KEY")
        if self._model is None:
            self._model = self._build_model(self.settings.model)
        # Send actual alternating dialogue messages. Every request is complete,
        # including on a fresh serverless worker; history supplies references,
        # while only this server-provided context supplies historical facts.
        context = {key: value for key, value in payload.items() if key not in {"question", "history"}}
        messages = [SystemMessage(content=SYSTEM_PROMPT + "\nDữ liệu kiểm chứng của hiện vật:\n" + json.dumps(context, ensure_ascii=False))]
        for turn in payload.get("history", []):
            messages.extend([HumanMessage(content=turn["question"]), AIMessage(content=turn["answer"])])
        messages.append(HumanMessage(content=payload["question"]))
        generation_started = time.monotonic()
        attempt = 0
        used_fallback = False
        while True:
            active_model = self._model
            if attempt == 2 and self.settings.fallback_model and self.settings.fallback_model != self.settings.model:
                if self._fallback_model is None:
                    self._fallback_model = self._build_model(self.settings.fallback_model)
                active_model = self._fallback_model
                used_fallback = True
            try:
                result = active_model.invoke(messages)
                break
            except Exception as exc:
                code = str(getattr(exc, "code", getattr(exc, "status_code", "")))
                rate_limited = code == "429" or "RateLimit" in type(exc).__name__
                transient = code in {"500", "502", "503", "504"} or type(exc).__name__ in {"ConnectError", "ReadTimeout", "TimeoutError"}
                if attempt == 2 or not (transient or rate_limited) or time.monotonic()-generation_started >= 12:
                    raise
                attempt = 2 if rate_limited else attempt + 1
                time.sleep(0.5)
        usage = result["raw"].usage_metadata or {}
        if result.get("parsed") is None:
            raise ValueError("INVALID_MODEL_OUTPUT")
        parsed = result["parsed"]
        if isinstance(parsed, GuidedReply):
            evidence = {item["chunk_id"]:item["text"] for item in payload["evidence"]}
            if any(chunk_id not in evidence for chunk_id in parsed.evidence_ids):
                raise ValueError("UNKNOWN_EVIDENCE_ID")
            parsed = Selection(status=parsed.status, answer=parsed.answer,
                passages=[Passage(chunk_id=chunk_id, quote=evidence[chunk_id]) for chunk_id in dict.fromkeys(parsed.evidence_ids)])
        counters = {key: int(usage.get(key, 0)) for key in ("input_tokens", "output_tokens", "total_tokens")}
        if used_fallback:
            counters["fallback_model_used"] = 1
        return parsed, counters


class Sessions:
    def __init__(self, max_sessions=256, ttl=3600):
        self.entries = OrderedDict()
        self.lock = threading.RLock()
        self.max_sessions = max_sessions
        self.ttl = ttl

    def get(self, session, artifact):
        now = time.monotonic()
        with self.lock:
            for key in [key for key, value in self.entries.items() if now-value[0] > self.ttl]:
                del self.entries[key]
            key = (session, artifact)
            if key not in self.entries:
                if len(self.entries) >= self.max_sessions:
                    self.entries.popitem(last=False)
                self.entries[key] = (now, deque(maxlen=8), threading.Lock())
            _, history, request_lock = self.entries[key]
            self.entries[key] = (now, history, request_lock)
            self.entries.move_to_end(key)
            return history, request_lock


class RagEngine:
    def __init__(self, settings: Settings, index, selector=None):
        self.settings = settings
        self.corpus = Corpus(settings.corpus)
        validate_answers(self.corpus)
        self.index = index
        self.selector = selector or EvidenceSelector(settings)
        self.sessions = Sessions()
        self.metrics_lock = threading.Lock()
        self.cache = OrderedDict()
        self.cache_lock = threading.Lock()

    def record(self, response):
        self.settings.storage.mkdir(parents=True, exist_ok=True)
        event = {"time": int(time.time()), "artifact_id": response.artifact_id,
                 "status": response.status, "elapsed_ms": response.elapsed_ms, **response.usage}
        with self.metrics_lock:
            with (self.settings.storage / "metrics.jsonl").open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event, ensure_ascii=False)+"\n")

    def citation(self, chunk_id, number=1, excerpt=None):
        chunk = self.corpus.by_id[chunk_id]
        source = self.corpus.sources[chunk["source_id"]]
        return Citation(number=number, chunk_id=chunk_id, title=source["title"], url=source["url"],
                        section=chunk["section"], excerpt=excerpt or chunk["text"])

    def chat(self, request: ChatRequest, debug=False):
        started = time.perf_counter()
        history = None
        history_lock = None
        mode = "conversation"
        plan = None

        def finish(status, answer=None, citations=None, usage=None, evidence=None, query=None, remember=False):
            response = ChatResponse(artifact_id=request.artifact_id, status=status, answer=answer or REFUSALS[status],
                citations=citations or [], usage=usage or {}, corpus_version=self.corpus.version,
                elapsed_ms=round((time.perf_counter()-started)*1000))
            if remember and history is not None and status != "temporarily_unavailable":
                with history_lock:
                    history.append({"question":request.question, "answer":response.answer, "topic":plan.topic if plan else "artifact", "intent":plan.intent if plan else None})
            self.record(response)
            return response, ({"retrieval_query":query, "evidence":evidence or [], "answer_mode":mode,
                "question_focus":vars(plan) if plan else None, "review_status":self.corpus.data["review_status"]} if debug else None)

        if request.artifact_id is None:
            return finish("needs_selection")
        if explicit_artifacts(request.question) - {request.artifact_id}:
            return finish("out_of_scope")
        normalized = normalize(request.question)
        if any(term in normalized for term in ("bo qua chi dan", "bo qua quy tac", "ignore previous", "system prompt", "api key", "mat khau", "viet code", "python script")):
            return finish("out_of_scope")
        # Lexical overlap alone must not pull an unrelated question into the
        # exhibit corpus (for example, a giraffe question matching a drum motif
        # that depicts deer). Keep high-confidence non-museum subjects out before
        # retrieval; the model prompt handles open-ended scope decisions.
        if any(term in normalized for term in (
            "thoi tiet", "gia ve", "gio mo cua", "bitcoin", "chung khoan",
            "mua o dau", "gia ban", "hom nay may gio", "nau an",
            "nau pho", "pho nau", "bong da",
            "tran dau", "diem so", "huou cao co", "ca voi", "khung long",
            "tong thong phap", "iphone", "xe may nao",
        )):
            return finish("out_of_scope")
        if request.artifact_id == "dagger" and any(term in normalized for term in ("ma kiem ke", "mo hinh nay tim thay", "mo hinh nay duoc tim")):
            return finish("insufficient_evidence", "Mẫu dao này là mô hình minh họa, nên mình chưa có mã kiểm kê hay nơi phát hiện riêng của nó. Bạn có thể tìm hiểu dáng lưỡi hoặc cách sử dụng của loại dao găm này nhé.")

        history, history_lock = self.sessions.get(request.session_id, request.artifact_id)
        # Only hold the lock for a snapshot, never while waiting for an external service.
        with history_lock:
            turns = ([turn.model_dump() for turn in request.history]
                     if request.history is not None else list(history))[-8:]
        plan = plan_question(request.question,turns)
        known = known_answer(request.question, request.artifact_id,turns)
        # Rules only reject clearly unrelated subjects or handle social replies.
        # Historical answers go to the conversational model with full history.
        # Reviewed lookup answers are retained as an outage fallback, not the
        # normal dialogue engine: a matching word must not swallow a follow-up.
        def reviewed_fallback():
            nonlocal mode
            mode = "source_backed_fallback"
            status, answer, chunk_ids = known
            citations = [self.citation(chunk_id, i+1) for i,chunk_id in enumerate(chunk_ids)]
            evidence = [{"chunk_id":c.chunk_id, "text":self.corpus.by_id[c.chunk_id]["text"],
                         "artifact_id":request.artifact_id, "distance":None} for c in citations]
            return finish(status, answer, citations, evidence=evidence, query=request.question, remember=True)

        # known_answer also detects when a measurement belongs to a different
        # named subject (for example, "voi cao bao nhieu"). That is a scope
        # decision, not merely a fallback answer: do not let the language model
        # reinterpret it as a question about the selected exhibit.
        if known and known[0] == "out_of_scope":
            return reviewed_fallback()

        social_reply = known and known[0] == "answered" and not known[2] and plan.intent is None
        acceptance = normalized in {"ok", "oke", "hay qua", "tuyet voi"}
        if social_reply and (not turns or not acceptance):
            return reviewed_fallback()

        # A short, unambiguous measurement follow-up can retrieve the selected
        # artifact's conflicting records more reliably from the reviewed fact
        # sheet than from a generated answer. Keep this narrow: the intent must
        # be explicit, this artifact must have a recorded conflict, and the
        # prepared answer must cite checked source chunks.
        has_requested_conflict = plan.intent and any(
            conflict["artifact_id"] == request.artifact_id
            and conflict["field"] == plan.intent
            for conflict in self.corpus.data.get("source_conflicts", [])
        )
        if has_requested_conflict and known and known[2]:
            return reviewed_fallback()

        query = f"{ARTIFACTS[request.artifact_id]['name']}: {request.question}"
        if turns:
            query = f"{turns[-1]['question']}\nCâu hỏi tiếp: {request.question}"
        evidence = self.index.retrieve(query, request.artifact_id)
        allowed = {}
        for item in evidence:
            chunk = self.corpus.by_id.get(item["chunk_id"])
            if chunk and chunk["artifact_id"] == request.artifact_id and item["artifact_id"] == request.artifact_id and item["text"] == chunk["text"]:
                allowed[item["chunk_id"]] = chunk
        if not allowed:
            return finish("insufficient_evidence", evidence=evidence, query=query)
        cache_key = (request.artifact_id, normalized, json.dumps(turns, ensure_ascii=False))
        with self.cache_lock:
            cached = self.cache.get(cache_key)
        if cached and time.monotonic()-cached[0] < 300:
            mode = "cached_conversation"
            return finish("answered", cached[1], cached[2], evidence=evidence, query=query, remember=True)
        try:
            selection, usage = self.selector.select({"artifact":ARTIFACTS[request.artifact_id]["name"],
                "question":request.question, "history":turns, "question_focus":vars(plan),
                "project_context": {"selected_artifact_id": request.artifact_id,
                    "models_are_illustrations": True, "dagger_has_no_identified_specimen": True,
                    "no_verified_specimen_alloy_breakdown": True},
                "sources_conflicts":[c for c in self.corpus.data.get("source_conflicts",[]) if c["artifact_id"]==request.artifact_id],
                "evidence":[{"chunk_id":key, "text":value["text"], "section":value["section"], "scope":value.get("scope", "specimen"),
                             "certainty":value.get("certainty","documented"), "facts":value.get("facts",[])} for key,value in allowed.items()]})
        except Exception as exc:
            with self.metrics_lock:
                with (self.settings.storage / "errors.jsonl").open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps({"time":int(time.time()), "type":type(exc).__name__,
                        "code":str(getattr(exc,"code",getattr(exc,"status_code","")))[:30]})+"\n")
            mode = "provider_unavailable"
            if known and (known[0] == "out_of_scope" or reviewed_fallback_allowed(request.question, request.artifact_id)):
                return reviewed_fallback()
            return finish("temporarily_unavailable", evidence=evidence, query=query)
        if selection.status == "out_of_scope":
            return finish("out_of_scope", usage=usage, evidence=evidence, query=query)
        if social_reply and not selection.passages and selection.status == "answered":
            answer = selection.answer.strip()
            if not answer.endswith("?") or re.search(r"\d", answer):
                answer = REFUSALS["needs_clarification"]
            return finish("needs_clarification", answer, usage=usage, evidence=evidence, query=query, remember=True)
        if selection.status in {"insufficient_evidence", "needs_clarification"} and not selection.passages:
            # Preserve a useful, contextual explanation or clarification rather
            # than replacing every unknown with the same generic refusal.
            answer = selection.answer.strip()
            if not answer or re.search(r"\d", answer):
                answer = REFUSALS[selection.status]
            return finish(selection.status, answer, usage=usage, evidence=evidence, query=query, remember=True)
        citations = []
        seen = set()
        for passage in selection.passages:
            chunk = allowed.get(passage.chunk_id)
            quote = passage.quote.strip()
            if not chunk or len(quote) < 15 or quote not in chunk["text"]:
                return finish("insufficient_evidence", usage=usage, evidence=evidence, query=query)
            if (passage.chunk_id,quote) not in seen:
                seen.add((passage.chunk_id,quote))
                citations.append(self.citation(passage.chunk_id,len(citations)+1,quote))
        if not citations:
            return finish("insufficient_evidence", usage=usage, evidence=evidence, query=query)
        answer = re.sub(r"\s*\[\d+\]", "", selection.answer).strip()
        quoted = " ".join(c.excerpt for c in citations)
        answer_normalized=normalize(answer)
        # Evidence about the type cannot establish the specimen's composition.
        # Enforce this knowledge boundary even when a generated answer sounds
        # convincing and cites a genuine background source.
        alloy_claim = plan.intent == "composition" or "nguyen chat" in answer_normalized
        uncertainty = any(term in answer_normalized for term in ("chua", "khong xac dinh", "khong the khang dinh", "khong co ket qua", "khong co phan tich"))
        unsupported_purity = re.search(r"\b(?:khong phai|khong la|chac chan la|chinh la) (?:la )?dong nguyen chat\b", answer_normalized)
        if alloy_claim and (not uncertainty or unsupported_purity):
            record = ANSWERS[request.artifact_id]["composition"]
            mode = "reviewed_correction"
            return finish("insufficient_evidence", record["text"],
                [self.citation(chunk_id, i+1) for i,chunk_id in enumerate(record["sources"])],
                usage={**usage, "reviewed_correction":1}, evidence=evidence, query=query, remember=True)
        if not answer or not supported_numbers(answer,quoted) or re.search(r"bài nguồn|bài viết|theo tư liệu",answer,re.I):
            # A paragraph with a valid quote can still answer the wrong question.
            # Never substitute a generic description for an invalid explanation.
            return finish("insufficient_evidence",usage=usage,evidence=evidence,query=query)
        requested={plan.intent,*plan.requests}
        for conflict in self.corpus.data.get("source_conflicts",[]):
            volunteered = ((conflict["field"]=="height" and bool(re.search(r"\b(?:chieu cao|cao) (?:khoang )?\d",answer_normalized)))
                or (conflict["field"]=="base_diameter" and any(term in answer_normalized for term in ("duong kinh chan","duong kinh day")))
                or (conflict["field"]=="collection" and any(term in answer_normalized for term in ("suu tam","vien vien dong bac co")) and any(year in answer_normalized for year in ("1902","1903"))))
            if conflict["artifact_id"]==request.artifact_id and (volunteered or conflict["field"] in requested or ("dimensions" in requested and conflict["field"] in ("height","base_diameter"))):
                if not any(term in answer_normalized for term in ("khac nhau","khac biet","chua thong nhat","khong thong nhat","chenh lech","chua the chot")):
                    return finish("insufficient_evidence",usage=usage,evidence=evidence,query=query)
        mode = "grounded_conversation"
        if selection.status=="answered":
            with self.cache_lock:
                self.cache[cache_key] = (time.monotonic(),answer,citations)
                self.cache.move_to_end(cache_key)
                if len(self.cache) > 128:
                    self.cache.popitem(last=False)
        return finish(selection.status,answer,citations,usage,evidence,query,remember=True)
