from dataclasses import dataclass, field
import os
from pathlib import Path

from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]
REPOSITORY = BACKEND.parent
SERVICE_VERSION = (BACKEND / "service-version.txt").read_text(encoding="utf-8").strip()


@dataclass(frozen=True)
class Settings:
    api_key: str = field(default="", repr=False)
    model: str = "gemini-3.5-flash-lite"
    fallback_model: str = "gemini-3.1-flash-lite"
    embedding_model: str = "gemini-embedding-001"
    transcription_model: str = "gemini-3.5-flash-lite"
    admin_token: str = field(default="", repr=False)
    storage: Path = field(
        default_factory=lambda: Path(
            os.environ.get("HERITAGE_STORAGE", str(BACKEND / "storage"))
        )
    )
    corpus: Path = BACKEND / "data" / "corpus.json"
    origins: tuple[str, ...] = ("http://localhost:5173", "http://127.0.0.1:5173")

    @classmethod
    def load(cls):
        values = {}
        for path in (REPOSITORY.parent / ".env", REPOSITORY / ".env", BACKEND / ".env"):
            if path.is_file():
                values.update(dotenv_values(path, encoding="utf-8-sig", interpolate=False))

        def get(name, default=""):
            return str(os.environ.get(name, values.get(name)) or default).strip()

        return cls(
            api_key=get("GEMINI_API_KEY"),
            model=get("GEMINI_MODEL", cls.model),
            fallback_model=get("GEMINI_FALLBACK_MODEL", cls.fallback_model),
            embedding_model=get("GEMINI_EMBEDDING_MODEL", cls.embedding_model),
            transcription_model=get(
                "GEMINI_TRANSCRIPTION_MODEL",
                get("GEMINI_MODEL", cls.model),
            ),
            admin_token=get("ADMIN_TOKEN"),
            origins=tuple(
                origin.strip()
                for origin in get(
                    "ALLOWED_ORIGINS",
                    "http://localhost:5173,http://127.0.0.1:5173",
                ).split(",")
                if origin.strip()
            ),
        )
