"""Conversation transport, cold starts and generation take precedence over lookup."""
from dataclasses import replace
from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import ValidationError

from app.config import Settings
from app.corpus import Corpus
from app.rag import EvidenceSelector, RagEngine
from app.schemas import ChatRequest, GuidedReply, Passage, Selection


class Index:
    def __init__(self, corpus):
        self.corpus = corpus

    def retrieve(self, query, artifact):
        return [{"chunk_id":c["id"], "artifact_id":artifact, "text":c["text"]}
                for c in self.corpus.chunks if c["artifact_id"] == artifact]


class Capture:
    def __init__(self, selection):
        self.selection = selection
        self.calls = []

    def select(self, payload):
        self.calls.append(payload)
        return self.selection, {"input_tokens":10}


def request(question, history=None, artifact="drum"):
    return ChatRequest(question=question, artifact_id=artifact, session_id="dialogue", history=history)


def engine(tmp_path, selection):
    settings = replace(Settings(), storage=tmp_path)
    corpus = Corpus(settings.corpus)
    selector = Capture(selection)
    return RagEngine(settings, Index(corpus), selector), selector


def test_followup_generation_is_not_replaced_by_the_matching_material_lookup(tmp_path):
    text = "Bạn đang hỏi thêm về hợp kim. Mình chưa có kết quả phân tích riêng để xác nhận các kim loại khác."
    rag, capture = engine(tmp_path, Selection(status="insufficient_evidence", answer=text))
    history = [{"artifact_id":"drum", "question":"Nó làm bằng gì?", "answer":"Trống được làm bằng đồng."}]
    response, debug = rag.chat(request("Ngoài đồng ra còn chứa vật liệu gì nữa?", history), debug=True)
    assert capture.calls[0]["history"] == history
    assert response.answer == text and response.status == "insufficient_evidence"
    assert debug["answer_mode"] != "source_backed_fallback"


def test_contextual_height_followup_reports_all_conflicting_jar_records(tmp_path):
    rag, capture = engine(tmp_path, Selection(status="insufficient_evidence", answer="unreliable model output"))
    history = [{"artifact_id":"jar", "question":"Thạp này có những hoa văn nào?", "answer":"Có thuyền và chiến binh."}]
    response, debug = rag.chat(request("Cái này cao bao nhiêu?", history, artifact="jar"), debug=True)
    assert not capture.calls
    assert response.status == "answered"
    assert all(value in response.answer for value in ("98 cm", "87 cm", "90 cm"))
    assert "chưa" in response.answer
    assert len(response.citations) == 3
    assert debug["answer_mode"] == "source_backed_fallback"


@pytest.mark.parametrize("question,history", [
    ("voi cao bao nhiêu", []),
    ("vậy con voi cao bao nhiêu", [{"artifact_id":"drum", "question":"Trống này cao bao nhiêu?", "answer":"Trống cao 63 cm."}]),
])
def test_named_unrelated_measurement_is_rejected_before_the_model(tmp_path, question, history):
    rag, capture = engine(tmp_path, Selection(status="answered", answer="Trống Ngọc Lũ cao 63 cm."))
    response, _ = rag.chat(request(question, history), debug=True)
    assert response.status == "out_of_scope"
    assert "đối tượng khác" in response.answer
    assert "63 cm" not in response.answer
    assert not response.citations
    assert not capture.calls


def test_full_client_history_survives_a_new_worker_and_explicit_empty_history_resets_it(tmp_path):
    rag, capture = engine(tmp_path, Selection(status="needs_clarification", answer="Bạn muốn nghe thêm về hình chim hay hình thuyền?"))
    history = [{"artifact_id":"drum", "question":f"Lượt {i}", "answer":f"Đáp {i}"} for i in range(8)]
    rag.chat(request("Ừ, kể tiếp đi", history))
    assert len(capture.calls[-1]["history"]) == 8
    assert capture.calls[-1]["history"][0] == history[0]
    # A reset must override even the warm worker's server-side history.
    rag.chat(request("Bạn nói cái đó là gì?", []))
    assert capture.calls[-1]["history"] == []


def test_clarification_preserves_the_specific_question_instead_of_generic_refusal(tmp_path):
    text = "Bạn đang hỏi các tia ở giữa hay những con chim xung quanh mặt trống?"
    rag, _ = engine(tmp_path, Selection(status="needs_clarification", answer=text))
    response, _ = rag.chat(request("Cái đó có nghĩa gì?", []))
    assert response.status == "needs_clarification" and response.answer == text
    assert not response.citations


@pytest.mark.parametrize("acceptance", ["ok", "oke", "ừ"])
def test_short_acceptance_continues_the_guides_offer_instead_of_a_canned_greeting(tmp_path, acceptance):
    corpus = Corpus(Settings().corpus)
    chunk = corpus.by_id["NL-01-bird-bands"]
    rag, capture = engine(tmp_path, Selection(status="answered", answer="Trên vành trống có những hình chim đang bay và đậu.",
        passages=[Passage(chunk_id=chunk["id"], quote=chunk["text"])]))
    history = [{"artifact_id":"drum", "question":"Hoa văn có gì?", "answer":"Bạn muốn nghe về những hình chim không?"}]
    response, _ = rag.chat(request(acceptance, history))
    assert len(capture.calls) == 1 and capture.calls[0]["history"] == history
    assert "chim" in response.answer


def test_provider_receives_alternating_roles_and_latest_question_separately():
    selector = EvidenceSelector(replace(Settings(), api_key="test-key"))
    calls = []

    class Model:
        def invoke(self, messages):
            calls.append(messages)
            return {"parsed":Selection(status="needs_clarification", answer="Bạn muốn nghe thêm chi tiết nào?"),
                    "raw":SimpleNamespace(usage_metadata={})}

    selector._model = Model()
    selector.select({"artifact":"Trống Ngọc Lũ", "question":"Ừ, kể tiếp", "evidence":[],
                     "history":[{"question":"Có hoa văn gì?", "answer":"Bạn muốn nghe về hình chim không?"}]})
    messages = calls[0]
    assert [type(message) for message in messages] == [SystemMessage, HumanMessage, AIMessage, HumanMessage]
    assert messages[-1].content == "Ừ, kể tiếp"
    assert messages[-2].content == "Bạn muốn nghe về hình chim không?"
    assert '"evidence": []' in messages[0].content


@pytest.mark.parametrize("history", [
    [{"artifact_id":"jar", "question":"Nó là gì?", "answer":"Thạp."}],
    [{"artifact_id":"drum", "question":"Q", "answer":"A"}] * 9,
    [{"artifact_id":"drum", "question":"Q"*1500, "answer":"A"*2400}] * 5,
])
def test_history_is_bounded_and_cannot_cross_artifact_scope(history):
    with pytest.raises(ValidationError):
        request("Hỏi tiếp", history)


@pytest.mark.parametrize("chunk_id,valid", [("reviewed-use",True), ("invented-source",False)])
def test_generation_selects_ids_and_only_the_server_supplies_source_excerpts(chunk_id,valid):
    selector = EvidenceSelector(replace(Settings(), api_key="test-key"))
    class Model:
        def invoke(self, messages):
            return {"parsed":GuidedReply(status="answered", answer="Đây là một nhạc cụ.", evidence_ids=[chunk_id]),
                    "raw":SimpleNamespace(usage_metadata={})}
    selector._model = Model()
    payload = {"question":"Dùng làm gì?", "history":[],
               "evidence":[{"chunk_id":"reviewed-use", "text":"Trống là nhạc khí trong các lễ hội cộng đồng."}]}
    if valid:
        reply, _ = selector.select(payload)
        assert reply.passages[0].quote == payload["evidence"][0]["text"]
    else:
        with pytest.raises(ValueError, match="UNKNOWN_EVIDENCE_ID"):
            selector.select(payload)


def test_provider_outage_cannot_answer_a_different_object_by_matching_overview_keyword(tmp_path):
    rag, capture = engine(tmp_path, Selection(status="answered"))
    def unavailable(payload):
        raise ConnectionError("provider down")
    capture.select = unavailable
    response, _ = rag.chat(request("Thông tin cơ bản về con gấu", []))
    assert response.status == "temporarily_unavailable"
    assert not response.citations


@pytest.mark.parametrize("answer", [
    "Không phải đồng nguyên chất đâu bạn.",
    "Chưa có phân tích riêng, nhưng nó không phải là đồng nguyên chất.",
    "Trống này chính là đồng nguyên chất.",
])
def test_type_background_cannot_establish_the_specimens_purity(tmp_path,answer):
    corpus = Corpus(Settings().corpus)
    chunk = corpus.by_id["NL-01-alloy-background"]
    rag, _ = engine(tmp_path, Selection(status="answered", answer=answer,
        passages=[Passage(chunk_id=chunk["id"], quote=chunk["text"])]))
    response, _ = rag.chat(request("Thế có phải nguyên chất không?", []))
    assert response.status == "insufficient_evidence"
    assert "chưa" in response.answer and "riêng" in response.answer
    assert response.usage["reviewed_correction"] == 1


@pytest.mark.parametrize("code,primary_attempts", [(503,2), (429,1)])
def test_transient_failure_can_switch_models_without_losing_dialogue(monkeypatch,code,primary_attempts):
    import app.rag as module
    monkeypatch.setattr(module.time, "sleep", lambda seconds: None)
    selector = EvidenceSelector(replace(Settings(), api_key="test-key"))
    calls = []
    class Unavailable(Exception):
        pass
    class Primary:
        def invoke(self, messages):
            calls.append(("primary", messages))
            error = Unavailable()
            error.code = code
            raise error
    class Fallback:
        def invoke(self, messages):
            calls.append(("fallback", messages))
            return {"parsed":GuidedReply(status="needs_clarification", answer="Bạn muốn nghe thêm về hình chim à?"),
                    "raw":SimpleNamespace(usage_metadata={"total_tokens":10})}
    selector._model, selector._fallback_model = Primary(), Fallback()
    reply, usage = selector.select({"question":"Ừ, kể tiếp", "evidence":[],
        "history":[{"question":"Có gì hay?", "answer":"Bạn muốn nghe về chim không?"}]})
    assert len([name for name, _ in calls if name == "primary"]) == primary_attempts
    assert calls[-1][0] == "fallback" and usage["fallback_model_used"] == 1
    assert calls[-1][1][-2].content == "Bạn muốn nghe về chim không?"
    assert reply.status == "needs_clarification"
