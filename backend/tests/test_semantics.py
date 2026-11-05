"""Question-focused regressions with independently specified content rubrics."""
import json
from pathlib import Path

import pytest

from app.conversation import known_answer, plan_question
from app.corpus import Corpus, normalize
from app.config import Settings

GROUPS=json.loads(Path(__file__).with_name("semantic_cases.json").read_text(encoding="utf-8"))
CASES=[(group,wording) for group in GROUPS for question in group["questions"] for wording in dict.fromkeys((question,normalize(question)))]


@pytest.mark.parametrize("case,question",CASES,ids=[f"{g['artifact']}-{g['category']}-{i}" for i,(g,q) in enumerate(CASES)])
def test_answer_addresses_the_requested_attribute(case,question):
    result=known_answer(question,case["artifact"])
    assert result is not None, f"Question needs a reviewed answer or a live semantic test: {question}"
    status,text,sources=result
    answer=normalize(text)
    assert status==case["status"]
    for term in case.get("all",[]):
        assert normalize(term) in answer
    if case.get("any"):
        assert any(normalize(term) in answer for term in case["any"])
    for term in case.get("forbidden",[]):
        assert normalize(term) not in answer
    assert set(case.get("sources",[])) <= set(sources)
    assert "[1]" not in text


@pytest.mark.parametrize("question",[
    "Hoa văn có xuất phát từ Trung Quốc không?",
    "Hoa văn được sáng tạo theo quan niệm nào của thời đó?",
    "Vì sao chọn đồng để làm thạp?",
])
def test_open_or_multiple_questions_are_not_swallowed_by_a_keyword(question):
    assert known_answer(question,"jar") is None


@pytest.mark.parametrize("artifact,question,required",[
    ("drum", "thông tin cơ bản của cổ vật này", "Trống Ngọc Lũ"),
    ("drum", "giới thiệu sơ qua về trống", "Đông Sơn"),
    ("jar", "cho mình biết thông tin chung về cái này", "Thạp Đào Thịnh"),
    ("jar", "đặc điểm cơ bản của thạp là gì", "lương thực"),
    ("dagger", "giới thiệu sơ qua về dao găm này", "mô hình minh họa"),
])
def test_general_information_requests_receive_a_cited_overview(artifact,question,required):
    result=known_answer(question,artifact)
    assert result is not None
    status,answer,sources=result
    assert status=="answered"
    assert required.lower() in answer.lower()
    assert sources and len(sources)<=3


@pytest.mark.parametrize("question",[
    "con hươu cao cổ cao bao nhiêu",
    "hươu cao cổ cao bn cm",
    "con hươu cao cổ nặng bao nhiêu",
])
def test_named_animal_measurement_does_not_return_selected_drum_measurement(question):
    result=known_answer(question,"drum")
    assert result is not None
    status,answer,sources=result
    assert status=="out_of_scope"
    assert "đối tượng khác" in answer.lower()
    assert "63 cm" not in answer
    assert not sources


@pytest.mark.parametrize("question",[
    "phở cao bao nhiêu",
    "trẻ em nặng bao nhiêu",
    "cá voi cao bao nhiêu",
])
def test_unrelated_question_cannot_inherit_the_selected_artifact(question):
    result=known_answer(question,"drum")
    assert result and result[0]=="out_of_scope"
    assert not result[2]


@pytest.mark.parametrize("artifact,question",[
    ("jar","nắp thạp cao bao nhiêu"),
    ("drum","mặt trống cao bao nhiêu"),
])
def test_part_dimensions_are_not_replaced_with_whole_artifact_height(artifact,question):
    result=known_answer(question,artifact)
    assert result and result[0]=="insufficient_evidence"
    assert "phần này" in result[1]
    assert "98 cm" not in result[1] and "63 cm" not in result[1]


def test_followup_keeps_motif_subject_but_changes_requested_operation():
    history=[{"question":"Hoa văn có gì đặc biệt?","answer":"Nắp có hình mặt trời...","topic":"motif"}]
    plan=plan_question("Cảm hứng từ đâu?",history)
    assert plan.intent=="motif_inspiration"
    answer=known_answer("Cảm hứng từ đâu?","jar",history)[1]
    assert "tín ngưỡng" in answer
    assert "12 tia" not in answer
    # An explicit new topic must override the motif context.
    assert plan_question("Còn chất liệu thì sao?",history).intent=="material"


def test_every_fact_book_reference_belongs_to_the_right_exhibit():
    from app.conversation import ANSWERS,validate_answers
    corpus=Corpus(Settings().corpus)
    validate_answers(corpus)
    assert len(corpus.sources)>=10
    for artifact,book in ANSWERS.items():
        for fact in book.values():
            for chunk_id in fact["sources"]:
                assert corpus.by_id[chunk_id]["artifact_id"]==artifact


@pytest.mark.parametrize("artifact,previous,followup",[
    ("jar","Thạp cao bao nhiêu?","Vậy vì sao những con số đó khác nhau?"),
    ("drum","Đường kính chân bao nhiêu?","Tại sao mỗi hồ sơ ghi khác nhau?"),
    ("drum","Trống được sưu tầm khi nào?","Vì sao mốc đó chênh lệch giữa nguồn?"),
])
def test_conflict_followups_explain_the_missing_reason_instead_of_changing_topic(artifact,previous,followup):
    result=known_answer(followup,artifact,[{"question":previous,"answer":"Các hồ sơ không thống nhất."}])
    assert result is not None
    status,answer,sources=result
    assert status=="insufficient_evidence"
    assert "giải thích" in answer
    assert "chưa" in answer.lower()
    assert len(sources)>=2
    assert "hỏi thêm về chất liệu" not in answer


def test_multiple_questions_cover_each_requested_field_and_missing_part():
    status,answer,sources=known_answer("Thạp làm bằng gì và dùng làm gì?","jar")
    assert status=="answered" and "đồng" in answer and "lương thực" in answer
    assert "DT-01-period" in sources and "DT-01-use" in sources
    status,answer,sources=known_answer("Thạp cao bao nhiêu và nặng bao nhiêu?","jar")
    assert status=="answered" and all(value in answer for value in ("98","87","90"))
    assert "khối lượng" in answer and "chưa có" in answer


def test_same_exhibit_measurement_comparison_does_not_refuse_known_facts():
    status,answer,sources=known_answer("Đường kính mặt và chân có cùng số đo không?","drum")
    assert status=="answered"
    assert "không bằng nhau" in answer
    assert all(number in answer for number in ("79,3","80","81"))
    assert set(sources)=={"NL-01-size","NL-01-size-2019"}


def test_why_funerary_use_is_not_answered_only_with_the_evidence_of_use():
    status,answer,sources=known_answer("Tại sao người xưa dùng thạp làm quan tài?","jar")
    assert status=="insufficient_evidence"
    assert "than tro" in answer.lower() and "răng" in answer
    assert "lý do" in answer and "chưa được xác nhận" in answer
    assert "DT-01-funerary-limit" in sources


def test_owner_hypothesis_does_not_count_as_identifying_a_person():
    status,answer,sources=known_answer("Ai là chủ nhân đầu tiên của thạp?","jar")
    assert status=="insufficient_evidence"
    assert "suy đoán" in answer and "chưa xác định" in answer
    assert sources==["DT-01-funerary-limit"]
