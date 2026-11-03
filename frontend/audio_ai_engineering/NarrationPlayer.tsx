import { useState } from "react";
import type { ExhibitId } from "../src/InteractiveScene";
import scripts from "./narration-scripts.json";
import "./NarrationPlayer.css";

type Language = "vi" | "en";

export function NarrationPlayer({ exhibitId }: { exhibitId: ExhibitId }) {
  const [language, setLanguage] = useState<Language>("vi");
  const [unavailable, setUnavailable] = useState(false);
  const audioSrc = `${import.meta.env.BASE_URL}narration/${exhibitId}-${language}.mp3`;

  function selectLanguage(next: Language) {
    setLanguage(next);
    setUnavailable(false);
  }

  return (
    <section className="narration-player" aria-label="Thuyết minh hiện vật">
      <div className="narration-player-heading">
        <div>
          <span className="section-label">THUYẾT MINH</span>
          <h3>Nghe câu chuyện</h3>
        </div>
        <div className="narration-languages" aria-label="Ngôn ngữ thuyết minh">
          <button type="button" aria-pressed={language === "vi"} onClick={() => selectLanguage("vi")}>Tiếng Việt</button>
          <button type="button" aria-pressed={language === "en"} onClick={() => selectLanguage("en")}>English</button>
        </div>
      </div>
      <p lang={language}>{scripts[exhibitId][language]}</p>
      {!unavailable ? (
        <audio key={`${exhibitId}-${language}`} controls preload="metadata" onError={() => setUnavailable(true)} aria-label={language === "vi" ? "Phát thuyết minh tiếng Việt" : "Play English narration"}>
          <source src={audioSrc} type="audio/mpeg" />
        </audio>
      ) : (
        <p className="narration-unavailable" role="status">{language === "vi" ? "Bản thu tiếng Việt chưa sẵn sàng." : "The English recording is not available yet."}</p>
      )}
    </section>
  );
}
