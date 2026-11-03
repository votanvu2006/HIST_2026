import { useEffect, useState } from "react";
import { InteractiveScene, type ExhibitId } from "../InteractiveScene";
import { exhibitInformation } from "../exhibitInformation";
import { exhibitStories } from "../exhibitStories";
import { StoryPlayer } from "../StoryPlayer";
import {
  getStore,
  subscribeStore,
  updateStore,
  type CustomHotspot,
  type HXRSystemState,
} from "../syncStore";

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

interface CatalogItem {
  id: ExhibitId;
  code: string;
  name: string;
  collection: string;
}

const INITIAL_CATALOG: CatalogItem[] = [
  { id: "drum", code: "#01", name: "Trống đồng Ngọc Lữ", collection: "Bộ sưu tập Đông Sơn" },
  { id: "jar", code: "#02", name: "Thạp đồng Đào Thịnh", collection: "Bộ sưu tập Đông Sơn" },
  { id: "dagger", code: "#03", name: "Dao găm đồng Đông Sơn", collection: "Bộ sưu tập Đông Sơn" },
];

const QUICK_HOTSPOT_TEMPLATES = [
  {
    label: "Mẫu 1: Hoa văn",
    title: "Hoa văn chim Lạc & Lễ hội",
    desc: "Khắc họa hình tượng chim Lạc bay ngược chiều kim đồng hồ cùng cảnh giã gạo, múa hát.",
  },
  {
    label: "Mẫu 2: Kỹ thuật đúc",
    title: "Kỹ thuật đúc đồng khuôn hai mang",
    desc: "Minh chứng trình độ luyện kim đỉnh cao của cư dân Lạc Việt cách đây 2.500 năm.",
  },
  {
    label: "Mẫu 3: Giá trị",
    title: "Bảo vật Quốc gia độc bản",
    desc: "Hiện vật lưu giữ nguyên vẹn lớp patin đồng cổ, giá trị lịch sử và mỹ thuật đặc biệt.",
  },
];

export function AdminStudio() {
  const [store, setStore] = useState<HXRSystemState>(() => getStore());
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doneSteps, setDoneSteps] = useState({ s1: false, s2: false, s3: false, s4: false });

  const [catalogList, setCatalogList] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [editingExhibit, setEditingExhibit] = useState<ExhibitId>("drum");

  // Bước 1
  const [artifactCode, setArtifactCode] = useState("#01");
  const [artifactName, setArtifactName] = useState("Trống đồng Ngọc Lữ");
  const [artifactCollection, setArtifactCollection] = useState("Bộ sưu tập Đông Sơn");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    "ngoc_lu_front.jpg",
    "ngoc_lu_top.jpg",
  ]);
  const [isBuilding3D, setIsBuilding3D] = useState(false);
  const [mesh3DReady, setMesh3DReady] = useState(true);

  // Bước 2
  const [newTitle, setNewTitle] = useState(QUICK_HOTSPOT_TEMPLATES[0].title);
  const [newDesc, setNewDesc] = useState(QUICK_HOTSPOT_TEMPLATES[0].desc);
  const [activeHotspotPreview, setActiveHotspotPreview] = useState<CustomHotspot | null>(null);

  // Bước 3
  const [pdfFileName, setPdfFileName] = useState("Ho_So_Di_San_Quoc_Gia.pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(true);
  const [scriptDraft, setScriptDraft] = useState(
    exhibitStories["drum"].introduction +
      "\n\n" +
      exhibitStories["drum"].scenes
        .map((s, i) => `• Cảnh ${i + 1} (${s.title}): ${s.narration}`)
        .join("\n")
  );
  const [skyboxPrompt, setSkyboxPrompt] = useState(
    "Không gian làng Việt cổ thời Đông Sơn, ánh lửa lò đúc đồng ấm áp, nhà sàn mái cong chuẩn khảo cổ, 4K 360 skybox."
  );
  const [step3Reviewed, setStep3Reviewed] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Bước 4
  const [checkCostume, setCheckCostume] = useState(true);
  const [checkPedestal, setCheckPedestal] = useState(true);
  const [checkFactRAG, setCheckFactRAG] = useState(true);
  const [sandboxQuery, setSandboxQuery] = useState("");
  const [sandboxLog, setSandboxLog] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Trợ lý AI đã kết nối tài liệu PDF. Hãy chọn câu hỏi bên dưới để kiểm tra.",
    },
  ]);

  useEffect(() => {
    return subscribeStore(setStore);
  }, []);

  const handleSelectCatalogExhibit = (id: ExhibitId) => {
    setEditingExhibit(id);
    const found = catalogList.find((item) => item.id === id);
    if (found) {
      setArtifactCode(found.code);
      setArtifactName(found.name);
      setArtifactCollection(found.collection);
    }
    const story = exhibitStories[id];
    if (story) {
      setScriptDraft(
        story.introduction +
          "\n\n" +
          story.scenes.map((s, i) => `• Cảnh ${i + 1} (${s.title}): ${s.narration}`).join("\n")
      );
    }
    setActiveHotspotPreview(null);
    setDoneSteps({ s1: false, s2: false, s3: false, s4: false });
    setStep(1);
  };

  const handleStartNewArtifact = () => {
    const nextNum = String(catalogList.length + 1).padStart(2, "0");
    setStep(1);
    setDoneSteps({ s1: false, s2: false, s3: false, s4: false });
    setArtifactCode(`#${nextNum}`);
    setArtifactName(`Hiện vật mới #${nextNum}`);
    setArtifactCollection("Bộ sưu tập Đông Sơn");
    setUploadedPhotos([]);
    setMesh3DReady(false);
    setPipelineDone(false);
    setStep3Reviewed(false);
    setActiveHotspotPreview(null);
    updateStore((s) => s, `Khởi tạo hồ sơ hiện vật mới (#${nextNum}).`);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setUploadedPhotos(files.map((f) => f.name));
      setMesh3DReady(false);
    }
  };

  const handleGenerate3DMesh = () => {
    if (uploadedPhotos.length === 0) {
      setUploadedPhotos(["front_view.jpg", "side_view.jpg"]);
    }
    setIsBuilding3D(true);
    setMesh3DReady(false);
    setTimeout(() => {
      setIsBuilding3D(false);
      setMesh3DReady(true);
      updateStore((s) => s, `Đã dựng mô hình 3D cho ${artifactCode} ${artifactName}.`);
    }, 600);
  };

  const currentHotspots = store.hotspotsByExhibit[editingExhibit] ?? [];

  const handleAddHotspot3D = (localPos: [number, number, number]) => {
    const nextRoman =
      ROMAN_NUMERALS[currentHotspots.length] ?? `${currentHotspots.length + 1}`;
    const newHs: CustomHotspot = {
      id: `hs-${editingExhibit}-${Date.now()}`,
      roman: nextRoman,
      localPos,
      title: newTitle.trim() || `Điểm chạm ${nextRoman}`,
      description: newDesc.trim() || "Thông tin chi tiết tại điểm chạm.",
    };

    updateStore((prev) => {
      const updatedList = [...(prev.hotspotsByExhibit[editingExhibit] ?? []), newHs];
      return {
        ...prev,
        hotspotsByExhibit: { ...prev.hotspotsByExhibit, [editingExhibit]: updatedList },
      };
    }, `Đã gắn Hotspot 3D [${nextRoman} - ${newHs.title}] lên ${artifactName}.`);

    setActiveHotspotPreview(newHs);
  };

  const handleRemoveHotspot = (hsId: string) => {
    if (activeHotspotPreview?.id === hsId) setActiveHotspotPreview(null);
    updateStore((prev) => {
      const filtered = (prev.hotspotsByExhibit[editingExhibit] ?? [])
        .filter((h) => h.id !== hsId)
        .map((h, idx) => ({ ...h, roman: ROMAN_NUMERALS[idx] ?? `${idx + 1}` }));
      return {
        ...prev,
        hotspotsByExhibit: { ...prev.hotspotsByExhibit, [editingExhibit]: filtered },
      };
    }, `Đã xóa 1 Hotspot trên ${artifactName}.`);
  };

  const handleRunAIPipeline = () => {
    setIsGenerating(true);
    setPipelineDone(false);
    setStep3Reviewed(false);
    setTimeout(() => {
      setIsGenerating(false);
      setPipelineDone(true);
      updateStore((s) => s, `Hoàn tất xử lý AI cho ${artifactName}.`);
    }, 650);
  };

  const handlePreviewVoice = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (isPlayingVoice) {
        setIsPlayingVoice(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(exhibitStories[editingExhibit].introduction);
      utter.lang = "vi-VN";
      utter.onend = () => setIsPlayingVoice(false);
      setIsPlayingVoice(true);
      window.speechSynthesis.speak(utter);
    }
  };

  const handleTestSandbox = (presetQuestion?: string) => {
    const rawQ = (presetQuestion ?? sandboxQuery).trim();
    if (!rawQ) return;
    const q = rawQ.toLowerCase();
    const info = exhibitInformation[editingExhibit];
    const story = exhibitStories[editingExhibit];

    let reply = "";
    if (q.includes("bitcoin") || q.includes("thời tiết") || q.includes("bóng đá")) {
      reply = "🛡️ Từ chối trả lời: Câu hỏi nằm ngoài phạm vi tài liệu di sản.";
    } else if (q.includes("kích thước") || q.includes("đường kính")) {
      reply = `${info.facts[0]} (Chất liệu: ${info.material}).`;
    } else if (q.includes("phát hiện") || q.includes("ở đâu") || q.includes("năm nào")) {
      reply = `${info.facts[1] ?? info.facts[0]} — Nguồn: ${info.sourceTitle}.`;
    } else {
      reply = `• Niên đại: ${info.period}\n• Tổng quan: ${info.overview}\n• Chi tiết: ${info.facts.join(" ")}\n• Câu chuyện: ${story.introduction}`;
    }

    setSandboxLog((prev) => [
      ...prev,
      { role: "user", text: rawQ },
      { role: "ai", text: reply },
    ]);
    setSandboxQuery("");
  };

  const handlePublishCDN = () => {
    if (!checkCostume || !checkPedestal || !checkFactRAG) return;
    setDoneSteps((prev) => ({ ...prev, s4: true }));
    const exists = catalogList.some((c) => c.code === artifactCode);
    if (!exists) {
      setCatalogList((prev) => [
        ...prev,
        { id: editingExhibit, code: artifactCode, name: artifactName, collection: artifactCollection },
      ]);
    }
    updateStore((s) => s, `Đã xuất bản "${artifactCode} ${artifactName}".`);
  };

  const cardStyle: React.CSSProperties = {
    background: "#0b0e13",
    border: "1px solid #171c24",
    borderRadius: "10px",
    padding: "20px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    background: "#07090c",
    border: "1px solid #1d232d",
    borderRadius: "7px",
    color: "#f2f2ee",
    fontSize: "12.5px",
  };

  return (
    <div>
      {/* HEADER GỌN GÀNG */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f2f2ee" }}>
          AI Creator Studio
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={editingExhibit}
            onChange={(e) => handleSelectCatalogExhibit(e.target.value as ExhibitId)}
            style={{
              ...inputStyle,
              width: "auto",
              fontWeight: 600,
              borderColor: "rgba(200, 170, 110, 0.45)",
              cursor: "pointer",
            }}
          >
            {catalogList.map((ex, idx) => (
              <option key={`${ex.id}-${idx}`} value={ex.id}>
                {ex.code} — {ex.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStartNewArtifact}
            style={{
              padding: "9px 14px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#10b981",
              borderRadius: "7px",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            + Thêm hiện vật
          </button>
        </div>
      </div>

      {/* STEPPER 4 BƯỚC 1 DÒNG */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {[
          { n: 1, title: "1. Hồ sơ & Tạo 3D", done: doneSteps.s1 },
          { n: 2, title: `2. Gắn Hotspot (${currentHotspots.length})`, done: doneSteps.s2 },
          { n: 3, title: "3. Nội dung AI & Review", done: doneSteps.s3 },
          { n: 4, title: "4. Kiểm duyệt & Xuất bản", done: doneSteps.s4 },
        ].map((item) => {
          const active = step === item.n;
          return (
            <button
              key={item.n}
              type="button"
              onClick={() => setStep(item.n as 1 | 2 | 3 | 4)}
              style={{
                padding: "11px 14px",
                borderRadius: "8px",
                border: active
                  ? "1px solid #c8aa6e"
                  : item.done
                  ? "1px solid rgba(16, 185, 129, 0.35)"
                  : "1px solid #171c24",
                background: active ? "rgba(200, 170, 110, 0.1)" : "#0b0e13",
                color: active ? "#f2f2ee" : "#808894",
                fontWeight: active ? 600 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{item.title}</span>
              {item.done && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* BƯỚC 1: HỒ SƠ & TẠO 3D */}
      {step === 1 && (
        <div
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "0.9fr 1.1fr",
            gap: "22px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "95px 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                    Mã số
                  </label>
                  <input
                    type="text"
                    value={artifactCode}
                    onChange={(e) => setArtifactCode(e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700, color: "#c8aa6e" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                    Tên hiện vật
                  </label>
                  <input
                    type="text"
                    value={artifactName}
                    onChange={(e) => setArtifactName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                  Bộ sưu tập
                </label>
                <input
                  type="text"
                  value={artifactCollection}
                  onChange={(e) => setArtifactCollection(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "#07090c",
                  border: "1px dashed #1d232d",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#d6d8d2", fontWeight: 500 }}>
                    Ảnh chụp hiện vật
                  </span>
                  <label
                    style={{
                      padding: "4px 10px",
                      background: "#121720",
                      border: "1px solid #242b38",
                      borderRadius: "5px",
                      fontSize: "11px",
                      color: "#e4cfa3",
                      cursor: "pointer",
                    }}
                  >
                    Tải ảnh...
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {uploadedPhotos.map((name, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        background: "#0d1412",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        color: "#10b981",
                        borderRadius: "4px",
                      }}
                    >
                      ✓ {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={handleGenerate3DMesh}
                style={{
                  padding: "10px 14px",
                  background: "#121720",
                  border: "1px solid #c8aa6e",
                  color: "#e4cfa3",
                  borderRadius: "7px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {isBuilding3D ? "Đang dựng..." : "Dựng 3D"}
              </button>

              <button
                type="button"
                disabled={!mesh3DReady}
                onClick={() => {
                  setDoneSteps((prev) => ({ ...prev, s1: true }));
                  setStep(2);
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: mesh3DReady ? "#c8aa6e" : "#171c24",
                  color: mesh3DReady ? "#07090c" : "#525860",
                  border: "none",
                  borderRadius: "7px",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: mesh3DReady ? "pointer" : "not-allowed",
                }}
              >
                Tiếp tục Bước 2 ➔
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#07090c",
              border: "1px solid #171c24",
              borderRadius: "8px",
              overflow: "hidden",
              minHeight: "340px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <InteractiveScene
              selectedId={editingExhibit}
              onSelect={() => {}}
              hideCase={false}
            />
          </div>
        </div>
      )}

      {/* BƯỚC 2: GẮN HOTSPOT 3D TRẦN */}
      {step === 2 && (
        <div
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#808894" }}>
                Kéo để xoay 3D · Click trực tiếp lên bề mặt cổ vật để gắn điểm chạm
              </span>
            </div>

            <div
              style={{
                position: "relative",
                height: "365px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #1d232d",
              }}
            >
              <InteractiveScene
                selectedId={editingExhibit}
                onSelect={() => {}}
                hideCase={true}
                customHotspots={currentHotspots}
                onSurfaceClick3D={handleAddHotspot3D}
                onHotspotClick={(hs) => setActiveHotspotPreview(hs)}
              />

              {activeHotspotPreview && (
                <div
                  style={{
                    position: "absolute",
                    left: "12px",
                    bottom: "12px",
                    right: "12px",
                    zIndex: 25,
                    background: "rgba(11, 14, 19, 0.94)",
                    border: "1px solid #c8aa6e",
                    borderRadius: "7px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "12px", color: "#e4cfa3" }}>
                      [{activeHotspotPreview.roman}] {activeHotspotPreview.title}
                    </strong>
                    <div style={{ fontSize: "11px", color: "#d6d8d2", marginTop: "2px" }}>
                      {activeHotspotPreview.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveHotspotPreview(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#808894",
                      cursor: "pointer",
                      fontSize: "15px",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
            <div
              style={{
                background: "#07090c",
                border: "1px solid #171c24",
                padding: "12px",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "11px", color: "#c8aa6e", fontWeight: 600 }}>
                  Điểm chạm mới
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {QUICK_HOTSPOT_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewTitle(tpl.title);
                        setNewDesc(tpl.desc);
                      }}
                      style={{
                        padding: "3px 7px",
                        fontSize: "10px",
                        background: "#121720",
                        border: "1px solid #242b38",
                        color: "#e4cfa3",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ ...inputStyle, marginBottom: "6px" }}
              />
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div
              style={{
                background: "#07090c",
                border: "1px solid #171c24",
                padding: "12px",
                borderRadius: "8px",
                flex: 1,
                maxHeight: "190px",
                overflowY: "auto",
              }}
            >
              {currentHotspots.map((hs) => (
                <div
                  key={hs.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 10px",
                    background: "#0b0e13",
                    border: "1px solid #171c24",
                    borderRadius: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: "#e4cfa3", fontSize: "12px" }}>
                      [{hs.roman}] {hs.title}
                    </strong>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#808894",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {hs.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHotspot(hs.id)}
                    style={{
                      padding: "4px 8px",
                      background: "transparent",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#fca5a5",
                      borderRadius: "4px",
                      fontSize: "11px",
                      cursor: "pointer",
                      marginLeft: "8px",
                    }}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: "10px 14px",
                  background: "#121720",
                  border: "1px solid #242b38",
                  color: "#d6d8d2",
                  borderRadius: "7px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ← Bước 1
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoneSteps((prev) => ({ ...prev, s2: true }));
                  setStep(3);
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#c8aa6e",
                  color: "#07090c",
                  border: "none",
                  borderRadius: "7px",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                Tiếp tục Bước 3 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BƯỚC 3: NỘI DUNG AI & REVIEW */}
      {step === 3 && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "14px",
              marginBottom: "16px",
              borderBottom: "1px solid #171c24",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12.5px", color: "#808894" }}>Tài liệu PDF:</span>
              <strong style={{ fontSize: "12.5px", color: "#10b981" }}>{pdfFileName}</strong>
              <label
                style={{
                  fontSize: "11.5px",
                  color: "#c8aa6e",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Đổi file
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPdfFileName(f.name);
                  }}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleRunAIPipeline}
              style={{
                padding: "8px 16px",
                background: "#c8aa6e",
                color: "#07090c",
                border: "none",
                borderRadius: "7px",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {isGenerating ? "Đang tạo nội dung AI..." : "⚡ Tạo tự động bằng AI"}
            </button>
          </div>

          {pipelineDone && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ display: "grid", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                      Kịch bản thuyết minh
                    </label>
                    <textarea
                      rows={5}
                      value={scriptDraft}
                      onChange={(e) => setScriptDraft(e.target.value)}
                      style={{ ...inputStyle, lineHeight: 1.5 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                      Mô tả không gian 360°
                    </label>
                    <textarea
                      rows={2}
                      value={skyboxPrompt}
                      onChange={(e) => setSkyboxPrompt(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div
                    style={{
                      padding: "9px 12px",
                      background: "#07090c",
                      border: "1px solid #1d232d",
                      borderRadius: "7px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#d6d8d2" }}>
                      🔊 Giọng đọc AI ({artifactName})
                    </span>
                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      style={{
                        padding: "5px 12px",
                        background: isPlayingVoice ? "#10b981" : "#121720",
                        border: "1px solid #c8aa6e",
                        color: isPlayingVoice ? "#07090c" : "#e4cfa3",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isPlayingVoice ? "Dừng" : "▶ Nghe thử"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                    Video lịch sử (.mp4)
                  </label>
                  <StoryPlayer exhibitId={editingExhibit} title={artifactName} />
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid #171c24",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={step3Reviewed}
                    onChange={(e) => setStep3Reviewed(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#10b981" }}
                  />
                  Đã kiểm tra nội dung
                </label>

                <button
                  type="button"
                  disabled={!step3Reviewed}
                  onClick={() => {
                    setDoneSteps((prev) => ({ ...prev, s3: true }));
                    setStep(4);
                  }}
                  style={{
                    padding: "10px 20px",
                    background: step3Reviewed ? "#c8aa6e" : "#171c24",
                    color: step3Reviewed ? "#07090c" : "#525860",
                    border: "none",
                    borderRadius: "7px",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    cursor: step3Reviewed ? "pointer" : "not-allowed",
                  }}
                >
                  Tiếp tục Bước 4 ➔
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BƯỚC 4: KIỂM DUYỆT & XUẤT BẢN (SIÊU GỌN) */}
      {step === 4 && (
        <div
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "0.95fr 1.05fr",
            gap: "22px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#f2f2ee", marginBottom: "12px" }}>
                Xác nhận kiểm duyệt trước khi xuất bản
              </div>

              <div
                style={{
                  background: "#07090c",
                  border: "1px solid #171c24",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "grid",
                  gap: "14px",
                  fontSize: "12.5px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checkCostume}
                    onChange={(e) => setCheckCostume(e.target.checked)}
                    style={{ width: "15px", height: "15px", accentColor: "#c8aa6e" }}
                  />
                  <span>Hình ảnh & Video đúng chuẩn lịch sử văn hóa Đông Sơn</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checkPedestal}
                    onChange={(e) => setCheckPedestal(e.target.checked)}
                    style={{ width: "15px", height: "15px", accentColor: "#c8aa6e" }}
                  />
                  <span>Mô hình 3D đặt chuẩn trên bệ đỡ trưng bày</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checkFactRAG}
                    onChange={(e) => setCheckFactRAG(e.target.checked)}
                    style={{ width: "15px", height: "15px", accentColor: "#c8aa6e" }}
                  />
                  <span>Trợ lý AI bám sát tài liệu bảo tàng (Chặn câu hỏi ngoài lề)</span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={handlePublishCDN}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: doneSteps.s4 ? "#10b981" : "#c8aa6e",
                  color: "#07090c",
                  border: "none",
                  borderRadius: "7px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {doneSteps.s4
                  ? `✓ Đã xuất bản "${artifactCode} ${artifactName}"`
                  : `Xuất bản "${artifactCode} ${artifactName}"`}
              </button>

              {doneSteps.s4 && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#10b981",
                  }}
                >
                  <span>Đã đồng bộ sang trang Du khách.</span>
                  <button
                    type="button"
                    onClick={handleStartNewArtifact}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "#e4cfa3",
                      border: "1px solid #c8aa6e",
                      borderRadius: "5px",
                      fontSize: "11.5px",
                      cursor: "pointer",
                    }}
                  >
                    + Thêm hiện vật khác
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#f2f2ee", marginBottom: "12px" }}>
              Kiểm thử Trợ lý AI ({artifactCode})
            </div>

            <div
              style={{
                flex: 1,
                minHeight: "170px",
                maxHeight: "185px",
                overflowY: "auto",
                background: "#07090c",
                border: "1px solid #171c24",
                padding: "10px",
                fontSize: "12px",
                marginBottom: "8px",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {sandboxLog.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    background: item.role === "user" ? "#121720" : "#0b0e13",
                    borderLeft:
                      item.role === "user" ? "2.5px solid #c8aa6e" : "2.5px solid #10b981",
                    whiteSpace: "pre-line",
                    lineHeight: 1.45,
                  }}
                >
                  {item.text}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleTestSandbox("Thông tin cơ bản và kích thước của hiện vật?")}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  background: "#07090c",
                  border: "1px solid #1d232d",
                  color: "#e4cfa3",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Hỏi kích thước
              </button>
              <button
                type="button"
                onClick={() => handleTestSandbox("Hiện vật được phát hiện ở đâu và năm nào?")}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  background: "#07090c",
                  border: "1px solid #1d232d",
                  color: "#e4cfa3",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Hỏi nơi phát hiện
              </button>
              <button
                type="button"
                onClick={() => handleTestSandbox("Giá Bitcoin hôm nay?")}
                style={{
                  fontSize: "11px",
                  padding: "4px 8px",
                  background: "#07090c",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Test chặn ngoài lề
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={sandboxQuery}
                onChange={(e) => setSandboxQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTestSandbox()}
                placeholder="Nhập câu hỏi..."
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => handleTestSandbox()}
                style={{
                  padding: "8px 14px",
                  background: "#121720",
                  color: "#e4cfa3",
                  border: "1px solid #c8aa6e",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}