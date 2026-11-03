import { useState } from "react";
import { InteractiveScene, type ExhibitId } from "./InteractiveScene";
import { InteractiveStructureScene } from "./InteractiveStructureScene";
import { exhibitInformation } from "./exhibitInformation";
import { exhibitStories } from "./exhibitStories";
import { CraftingVideo } from "./CraftingVideo";
import { QuizPanel, readDemoPoints } from "./QuizPanel";
import { Chatbot, type ExhibitChatContext } from "./Chatbot";
import { CameraPassthrough } from "./CameraPassthrough";
import { NarrationPlayer } from "../audio_ai_engineering/NarrationPlayer";
import { SpatialAudioExperience } from "../audio_ai_engineering/SpatialAudioExperience";
import "./App.css";
import "./HeritageExperience.css";

type ExperienceScreen =
  | "scan"
  | "object"
  | "information"
  | "story"
  | "soundscape"
  | "crafting"
  | "quiz";

type ObjectSection = "information" | "story" | "soundscape" | "crafting" | "quiz";

const exhibits: {
  id: ExhibitId;
  number: string;
  name: string;
  collection: string;
}[] = [
  {
    id: "drum",
    number: "01",
    name: "Trống đồng Ngọc Lũ",
    collection: "Bộ sưu tập Đông Sơn",
  },
  {
    id: "jar",
    number: "02",
    name: "Thạp đồng Đào Thịnh",
    collection: "Bộ sưu tập Đông Sơn",
  },
  {
    id: "dagger",
    number: "03",
    name: "Dao găm đồng Đông Sơn",
    collection: "Bộ sưu tập Đông Sơn",
  },
];

const objectSections: {
  id: ObjectSection;
  icon: string;
  label: string;
}[] = [
  { id: "information", icon: "i", label: "Thông tin" },
  { id: "story", icon: "▶", label: "Câu chuyện" },
  { id: "soundscape", icon: "◉", label: "Âm thanh 360°" },
  { id: "crafting", icon: "⚒", label: "Chế tác" },
  { id: "quiz", icon: "✦", label: "Đố vui" },
];

const contentFlow: ObjectSection[] = [
  "information",
  "story",
  "soundscape",
  "crafting",
  "quiz",
];

function App() {
  const [selectedId, setSelectedId] = useState<ExhibitId | null>(null);
  const [screen, setScreen] = useState<ExperienceScreen>("scan");
  const [points, setPoints] = useState(readDemoPoints);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [storyVideoUnavailable, setStoryVideoUnavailable] = useState(false);

  const selectedExhibit = selectedId
    ? exhibits.find((exhibit) => exhibit.id === selectedId) ?? exhibits[0]
    : null;

  const selectedInformation = selectedId
    ? exhibitInformation[selectedId]
    : null;

  const selectedStory = selectedId ? exhibitStories[selectedId] : null;

  const chatContext: ExhibitChatContext | null =
    selectedExhibit && selectedInformation && selectedStory
      ? {
          id: selectedExhibit.id,
          name: selectedExhibit.name,
          collection: selectedExhibit.collection,
          period: selectedInformation.period,
          material: selectedInformation.material,
          overview: selectedInformation.overview,
          facts: selectedInformation.facts,
          note: selectedInformation.note ?? "",
          sourceTitle: selectedInformation.sourceTitle,
          sourceUrl: selectedInformation.sourceUrl,
          storyTitle: selectedStory.title,
          storyIntroduction: selectedStory.introduction,
        }
      : null;

  const handleSelectExhibit = (id: ExhibitId) => {
    setSelectedId(id);
    setScreen("object");
    setStoryVideoUnavailable(false);
    setIsAssistantOpen(false);
  };

  const handleBackToScan = () => {
    setScreen("scan");
    setSelectedId(null);
    setIsAssistantOpen(false);
  };

  const handleBackToObject = () => {
    setScreen("object");
    setIsAssistantOpen(false);
  };

  const handlePointsChange = (nextPoints: number) => {
    setPoints(nextPoints);
    window.localStorage.setItem(
      "heritagexr-demo-points-v1",
      String(nextPoints),
    );
  };

  const openObjectSection = (section: ObjectSection) => {
    setScreen(section);
    setIsAssistantOpen(false);

    if (section === "story") {
      setStoryVideoUnavailable(false);
    }
  };

  const handleNextContent = () => {
    const currentIndex = contentFlow.indexOf(screen as ObjectSection);

    if (currentIndex === -1) return;

    const nextSection =
      contentFlow[(currentIndex + 1) % contentFlow.length];

    openObjectSection(nextSection);
  };

  const screenTitles: Record<ExperienceScreen, string> = {
    scan: "Quét hiện vật",
    object: "Khám phá hiện vật",
    information: "Thông tin hiện vật",
    story: "Câu chuyện hiện vật",
    soundscape: "Âm thanh môi trường 360°",
    crafting: "Quá trình chế tác",
    quiz: "Đố vui có thưởng",
  };

  return (
    <CameraPassthrough compactControls={screen === "soundscape"}>
      <main className="app heritage-experience spatial-app">
        <header className="app-header heritage-app-header spatial-header">
          <div className="heritage-brand">
            <strong>HeritageXR</strong>
            <span>BẢO TÀNG TƯƠNG TÁC</span>
          </div>

          <div className="spatial-header-center" aria-live="polite">
            {selectedExhibit ? selectedExhibit.name : "Không gian trưng bày"}
          </div>

          <div className="heritage-header-actions">
            <span className="heritage-total-points">✦ {points} điểm</span>
          </div>
        </header>

        <div className={`spatial-stage spatial-stage-${screen}`}>
          {screen === "scan" && (
            <section className="scan-experience" aria-label="Quét hiện vật">
              <div className="scan-guidance glass-surface">
                <span className="section-label">GÓC NHÌN CAMERA</span>
                <strong>Hướng camera về hiện vật muốn khám phá</strong>
                <p>
                  Chạm hotspot trên hiện vật để mở không gian xem riêng.
                </p>
              </div>

              <InteractiveScene
                selectedId={null}
                onSelect={handleSelectExhibit}
                showDisplayCase
              />

              <div className="scan-bottom-hint glass-surface">
                <span className="scan-status-dot" />
                Cảnh xung quanh vẫn hiển thị khi fen lia điện thoại
              </div>
            </section>
          )}

          {screen === "object" && selectedExhibit && (
            <section
              className="object-experience"
              aria-label={`Khám phá ${selectedExhibit.name}`}
            >
              <header className="object-experience-heading glass-surface">
                <button
                  className="spatial-back-button"
                  type="button"
                  onClick={handleBackToScan}
                >
                  ← Quay lại quét
                </button>

                <div className="object-title-copy">
                  <span className="section-label">KHÁM PHÁ HIỆN VẬT</span>
                  <h1>{selectedExhibit.name}</h1>
                  <p>{selectedExhibit.collection}</p>
                </div>

                <button
                  className="spatial-assistant-button"
                  type="button"
                  aria-expanded={isAssistantOpen}
                  onClick={() => setIsAssistantOpen((open) => !open)}
                >
                  ✦ Hỏi AI
                </button>
              </header>

              <InteractiveStructureScene exhibitId={selectedExhibit.id} />

              {isAssistantOpen && (
                <aside className="spatial-assistant-panel glass-surface">
                  <header>
                    <div>
                      <span className="section-label">HƯỚNG DẪN VIÊN AI</span>
                      <strong>{selectedExhibit.name}</strong>
                    </div>

                    <button
                      type="button"
                      aria-label="Đóng trợ lý AI"
                      onClick={() => setIsAssistantOpen(false)}
                    >
                      ×
                    </button>
                  </header>

                  <Chatbot exhibit={chatContext} />
                </aside>
              )}

              <nav
                className="object-action-dock glass-surface"
                aria-label="Chọn nội dung hiện vật"
              >
                <p>Chọn nội dung muốn khám phá</p>

                <div className="object-action-list">
                  {objectSections.map((section) => (
                    <button
                      className="object-action-button"
                      key={section.id}
                      type="button"
                      onClick={() => openObjectSection(section.id)}
                    >
                      <span
                        className="object-action-icon"
                        aria-hidden="true"
                      >
                        {section.icon}
                      </span>

                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </section>
          )}

          {screen !== "scan" && screen !== "object" && selectedExhibit && (
            <section
              className={`content-experience content-experience-${screen}`}
              aria-label={screenTitles[screen]}
            >
              <div className="content-glass-panel glass-surface">
                <header className="content-experience-header">
                  <button
                    className="spatial-back-button"
                    type="button"
                    onClick={handleBackToObject}
                  >
                    ← Quay lại hiện vật
                  </button>

                  <div>
                    <span className="section-label">
                      {selectedExhibit.name}
                    </span>
                    <h1>{screenTitles[screen]}</h1>
                  </div>

                  <button
                    className="spatial-next-button"
                    type="button"
                    onClick={handleNextContent}
                  >
                    Tiếp theo
                  </button>
                </header>

                {screen === "information" && selectedInformation && (
                  <article className="spatial-information-content">
                    <div className="spatial-information-meta">
                      <span>{selectedInformation.period}</span>
                      <span>{selectedInformation.material}</span>
                    </div>

                    <p className="spatial-information-overview">
                      {selectedInformation.overview}
                    </p>

                    <ul className="spatial-information-facts">
                      {selectedInformation.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>

                    {selectedInformation.note && (
                      <p className="information-note">
                        {selectedInformation.note}
                      </p>
                    )}

                    <p className="heritage-3d-note">
                      Mô hình 3D là bản minh họa để khám phá cấu tạo; không
                      phải bản quét số hóa chính xác.
                    </p>

                    <a
                      className="information-source"
                      href={selectedInformation.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Nguồn: {selectedInformation.sourceTitle} ↗
                    </a>
                  </article>
                )}

                {screen === "story" && selectedStory && (
                  <article className="spatial-story-content">
                    <div className="spatial-story-copy">
                      <h2>{selectedStory.title}</h2>
                      <p>{selectedStory.introduction}</p>

                      <p className="spatial-story-description">
                        {selectedStory.videoDescription}
                      </p>
                    </div>

                    <NarrationPlayer key={selectedExhibit.id} exhibitId={selectedExhibit.id} />

                    <button className="spatial-next-button" type="button" onClick={() => openObjectSection("soundscape")}>
                      Trải nghiệm âm thanh 360°
                    </button>

                    <div className="spatial-story-video">
                      {!storyVideoUnavailable ? (
                        <video
                          key={selectedStory.videoSrc}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label={`Video câu chuyện ${selectedExhibit.name}`}
                          onError={() => setStoryVideoUnavailable(true)}
                        >
                          <source
                            src={selectedStory.videoSrc}
                            type="video/mp4"
                          />
                          Trình duyệt không hỗ trợ phát video.
                        </video>
                      ) : (
                        <div
                          className="story-viewer-video-error"
                          role="status"
                        >
                          Không tải được video. Kiểm tra file trong
                          frontend/public/videos và đường dẫn trong
                          exhibitStories.ts.
                        </div>
                      )}
                    </div>

                    <div className="spatial-story-sources">
                      <span className="section-label">NGUỒN TƯ LIỆU</span>

                      {selectedStory.sources.map((source) => (
                        <a
                          href={source.url}
                          key={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.title} ↗
                        </a>
                      ))}
                    </div>
                  </article>
                )}

                {screen === "soundscape" && (
                  <SpatialAudioExperience key={selectedExhibit.id} exhibitId={selectedExhibit.id} />
                )}

                {screen === "crafting" && (
                  <div className="spatial-crafting-content">
                    <CraftingVideo
                      exhibitId={selectedExhibit.id}
                      title={selectedExhibit.name}
                      onContinueToFact={() => setScreen("information")}
                    />
                  </div>
                )}

                {screen === "quiz" && (
                  <div className="spatial-quiz-content">
                    <QuizPanel
                      exhibitId={selectedExhibit.id}
                      points={points}
                      onPointsChange={handlePointsChange}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </CameraPassthrough>
  );
}

export default App;
