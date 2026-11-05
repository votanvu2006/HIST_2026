from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ArtifactId = Literal["drum", "jar", "dagger"]
Status = Literal["answered", "insufficient_evidence", "out_of_scope", "needs_selection", "needs_clarification", "temporarily_unavailable"]


class HistoryTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    artifact_id: ArtifactId
    question: str = Field(min_length=1, max_length=1500)
    answer: str = Field(min_length=1, max_length=2400)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=1500)
    artifact_id: ArtifactId | None = None
    session_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    # Explicit [] starts a conversation; None supports older API clients.
    # Transported history survives serverless cold starts, but is never evidence.
    history: list[HistoryTurn] | None = Field(default=None, max_length=8)

    @model_validator(mode="after")
    def scoped_history(self):
        if self.history:
            if any(turn.artifact_id != self.artifact_id for turn in self.history):
                raise ValueError("History must belong to the selected artifact")
            if sum(len(turn.question) + len(turn.answer) for turn in self.history) > 18000:
                raise ValueError("Conversation history is too long")
        return self

    @field_validator("question")
    @classmethod
    def clean_question(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Question cannot be blank")
        return value


class Passage(BaseModel):
    chunk_id: str
    quote: str = Field(min_length=1, max_length=1200)


class Selection(BaseModel):
    status: Literal["answered", "insufficient_evidence", "out_of_scope", "needs_clarification"]
    answer: str = Field(default="", max_length=2400, description="Friendly Vietnamese response grounded only in the cited passages; no inline citation markers.")
    passages: list[Passage] = Field(default_factory=list, max_length=4)


class GuidedReply(BaseModel):
    """Generation selects evidence IDs; the server supplies canonical excerpts."""
    status: Literal["answered", "insufficient_evidence", "out_of_scope", "needs_clarification"]
    answer: str = Field(default="", max_length=2400)
    evidence_ids: list[str] = Field(default_factory=list, max_length=4,
        description="IDs of server-provided evidence supporting this answer. Empty for clarification or out-of-scope replies.")


class Citation(BaseModel):
    number: int
    chunk_id: str
    title: str
    url: str
    section: str
    excerpt: str


class ChatResponse(BaseModel):
    artifact_id: ArtifactId | None
    status: Status
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    elapsed_ms: int = 0
    usage: dict[str, int] = Field(default_factory=dict)
    corpus_version: str
