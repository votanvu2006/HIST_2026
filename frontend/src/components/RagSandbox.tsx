import { useEffect, useRef, useState } from "react";
import type { ExhibitId } from "../InteractiveScene";
import { api, makeId } from "../lib/api";
import type { ChatRequest, ChatResponse } from "../lib/api";
import { AnswerSources } from "./ChatAssistant";
import "./sandbox.css";

type Chunk = { id: string; artifact_id: ExhibitId; section: string; text: string; source_id: string };
type Corpus = { version: string; review_status: string; chunks: Chunk[]; sources: { id: string; title: string; url: string }[] };
type Result = { response: ChatResponse; debug: { retrieval_query: string | null; evidence: { chunk_id: string; text: string; distance: number | null }[]; answer_mode: string } };
type Metrics = { requests: number; answered: number; input_tokens: number; output_tokens: number; mean_latency_ms: number; note: string };
const names: Record<ExhibitId, string> = { drum: "Trống đồng Ngọc Lũ", jar: "Thạp đồng Đào Thịnh", dagger: "Dao găm Đông Sơn" };

function initialToken() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const supplied = fragment.get("access");
  try { return supplied || sessionStorage.getItem("heritage-admin") || ""; } catch { return supplied || ""; }
}

export default function RagSandbox() {
  const [token, setToken] = useState(initialToken);
  const [credential, setCredential] = useState("");
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [artifact, setArtifact] = useState<ExhibitId>("drum");
  const [question, setQuestion] = useState("Cái này được phát hiện ở đâu?");
  const [result, setResult] = useState<Result | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [session] = useState(() => `sandbox-${makeId()}`);
  const request = useRef<AbortController | null>(null);
  const dialogues = useRef<Record<ExhibitId, NonNullable<ChatRequest["history"]>>>({ drum: [], jar: [], dagger: [] });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    if (new URLSearchParams(window.location.hash.slice(1)).has("access")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const controller = new AbortController();
    api<Corpus>("/api/admin/corpus", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(value => { setCorpus(value); setError(""); try { sessionStorage.setItem("heritage-admin", token); } catch { /* Local-only session still works. */ } })
      .catch(cause => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Chưa mở được Sandbox."); setCorpus(null); } });
    return () => controller.abort();
  }, [token]);
  useEffect(() => () => request.current?.abort(), []);

  async function run() {
    if (busy || !question.trim()) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setResult(null);
    try {
      const value = await api<Result>("/api/admin/chat", { method: "POST", headers,
        body: JSON.stringify({ question, artifact_id: artifact, session_id: session, history: dialogues.current[artifact] }), signal: controller.signal });
      if (!controller.signal.aborted) {
        setResult(value);
        if (["answered", "insufficient_evidence", "needs_clarification"].includes(value.response.status)) {
          const recent = [...dialogues.current[artifact], { artifact_id: artifact, question, answer: value.response.answer }].slice(-8);
          while (recent.reduce((size, turn) => size + turn.question.length + turn.answer.length, 0) > 18000) recent.shift();
          dialogues.current[artifact] = recent;
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chưa nhận được kết quả.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ question, artifact_id: artifact, ...result }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `rag-${artifact}-${Date.now()}.json`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="sandbox">
    <header className="sandbox-header"><div><span className="sandbox-eyebrow">HERITAGEXR · KHÔNG GIAN CỦA NHÓM</span><h1>Thử nghiệm RAG</h1><p>Đối chiếu câu trả lời với tài liệu của từng hiện vật.</p></div><a href="/">← Trở về trưng bày</a></header>
    {error && <p className="sandbox-error" role="alert">{error}</p>}
    {!corpus ? <form className="sandbox-card sandbox-login" onSubmit={event => { event.preventDefault(); setToken(credential.trim()); }}>
      <h2>Mở phiên làm việc</h2><p>Nhập mã truy cập do nhóm quản trị cung cấp. Mã được giữ trong phiên trình duyệt này.</p>
      <label htmlFor="sandbox-token">Mã truy cập</label><input id="sandbox-token" type="password" value={credential} onChange={event => setCredential(event.target.value)} autoComplete="off" required />
      <button type="submit">Mở Sandbox</button>
    </form> : <>
      <div className="sandbox-review" role="status">Bản thử nghiệm · Dữ kiện đã đối chiếu nguồn, đang chờ nhóm duyệt. Phiên bản: <code>{corpus.version}</code></div>
      <div className="sandbox-grid">
        <section className="sandbox-card">
          <h2>1. Đặt câu hỏi</h2>
          <form onSubmit={event => { event.preventDefault(); void run(); }}>
            <label htmlFor="sandbox-artifact">Hiện vật</label><select id="sandbox-artifact" value={artifact} disabled={busy} onChange={event => { setArtifact(event.target.value as ExhibitId); setResult(null); }}>{Object.entries(names).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
            <label htmlFor="sandbox-question">Câu hỏi tự nhiên</label><textarea id="sandbox-question" rows={4} maxLength={1500} value={question} disabled={busy} onChange={event => setQuestion(event.target.value)} required />
            <button type="submit" disabled={busy || !question.trim()}>{busy ? "Đang đối chiếu…" : "Chạy thử"}</button>
          </form>
          <p className="sandbox-helper">Thử câu không dấu, hỏi tiếp, hỏi ngoài phạm vi hoặc dữ kiện chưa có. Khoảng cách truy xuất không phải xác suất câu trả lời đúng.</p>
          <h2>2. Câu trả lời</h2>
          {result ? <div aria-live="polite"><div className="sandbox-result-meta"><span>{result.response.status}</span><span>{result.response.elapsed_ms} ms</span></div><p className="sandbox-answer">{result.response.answer}</p><AnswerSources response={result.response} /><button className="sandbox-secondary" type="button" onClick={download}>Tải kết quả JSON</button></div> : <p className="sandbox-helper" role="status">{busy ? "Đang tìm bằng chứng và gọi AI…" : "Kết quả sẽ xuất hiện sau khi chạy thử."}</p>}
        </section>
        <section className="sandbox-card"><h2>3. Bằng chứng được truy xuất</h2>
          {result?.debug.retrieval_query && <p className="sandbox-helper">Truy vấn: {result.debug.retrieval_query}</p>}
          {!result?.debug.evidence.length && <p className="sandbox-helper">Chưa có đoạn truy xuất. Những câu bị chặn trước khi tìm kiếm sẽ không có danh sách này.</p>}
          {result?.debug.evidence.map(item => <article className="sandbox-evidence" key={item.chunk_id}><div><code>{item.chunk_id}</code><span>{item.distance == null ? "Đúng phạm vi hiện vật" : `Khoảng cách ${item.distance.toFixed(4)}`}</span></div><p>{item.text}</p></article>)}
        </section>
      </div>
      <section className="sandbox-card"><h2>Hồ sơ để nhóm duyệt: {names[artifact]}</h2><p className="sandbox-helper">Đây là các đoạn tóm lược có nguồn đang dùng trong RAG. Dao găm là loại hình minh họa, chưa có hồ sơ riêng cho mẫu 3D.</p>
        {corpus.chunks.filter(chunk => chunk.artifact_id === artifact).map(chunk => {
          const source = corpus.sources.find(item => item.id === chunk.source_id);
          return <details className="sandbox-corpus" key={chunk.id}><summary>{chunk.section} · <code>{chunk.id}</code></summary><p>{chunk.text}</p>{source && <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>}</details>;
        })}
      </section>
      <section className="sandbox-card"><h2>Số đo để tính chi phí</h2><button className="sandbox-secondary" type="button" onClick={() => {
        void api<Metrics>("/api/admin/metrics", { headers }).then(setMetrics).catch(cause => setError(cause instanceof Error ? cause.message : "Chưa tải được số đo."));
      }}>Cập nhật số đo</button>{metrics && <><dl className="sandbox-metrics"><div><dt>Lượt hỏi</dt><dd>{metrics.requests}</dd></div><div><dt>Có câu trả lời</dt><dd>{metrics.answered}</dd></div><div><dt>Token vào</dt><dd>{metrics.input_tokens}</dd></div><div><dt>Token ra</dt><dd>{metrics.output_tokens}</dd></div><div><dt>Độ trễ TB</dt><dd>{metrics.mean_latency_ms} ms</dd></div></dl><p className="sandbox-helper">{metrics.note}</p></>}</section>
      <button type="button" className="sandbox-secondary" onClick={() => { try { sessionStorage.removeItem("heritage-admin"); } catch { /* noop */ } setToken(""); setCorpus(null); setCredential(""); }}>Đóng phiên Sandbox</button>
    </>}
  </main>;
}
