import { useEffect, useRef, useState } from "react";
import type { ExhibitId } from "../InteractiveScene";
import { askChat, makeId, visitorSession } from "../lib/api";
import type { ChatRequest, ChatResponse } from "../lib/api";
import { PushToTalk } from "./PushToTalk";
import "./chat.css";

type Props = { artifactId: ExhibitId | null; artifactName: string | null; open: boolean; embedded?: boolean; onToggle: () => void };
type Message = { id: string; role: "user" | "assistant"; text: string; response?: ChatResponse };
type Key = ExhibitId | "none";
const initial: Record<Key, Message[]> = { drum: [], jar: [], dagger: [], none: [] };
const STORAGE_KEY = "heritage-conversations-v2";

function loadConversations(): Record<Key, Message[]> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return initial;
    return Object.fromEntries(Object.keys(initial).map(key => [key,
      Array.isArray(saved[key]) ? saved[key].filter((message: Message) =>
        typeof message?.id === "string" && typeof message?.text === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        (!message.response || (message.response.artifact_id === key && Array.isArray(message.response.citations)))
      ).slice(-40) : [],
    ])) as Record<Key, Message[]>;
  } catch { return initial; }
}

function dialogueHistory(messages: Message[], artifact: ExhibitId): NonNullable<ChatRequest["history"]> {
  const turns: NonNullable<ChatRequest["history"]> = [];
  let question: string | null = null;
  for (const message of messages) {
    if (message.role === "user") question = message.text;
    else if (question && message.response?.artifact_id === artifact) {
      // Transport dialogue, not connection errors or unrelated conversations.
      if (["answered", "insufficient_evidence", "needs_clarification"].includes(message.response.status)) {
        turns.push({ artifact_id: artifact, question, answer: message.text });
      }
      question = null;
    }
  }
  const recent = turns.slice(-8);
  while (recent.reduce((size, turn) => size + turn.question.length + turn.answer.length, 0) > 18000) recent.shift();
  return recent;
}

export function AnswerSources({ response }: { response: ChatResponse }) {
  if (!response.citations.length) return null;
  return <details className="chat-sources">
    <summary>Nguồn tham khảo ({response.citations.length})</summary>
    {response.citations.map(citation => <div className="chat-citation" key={`${citation.chunk_id}-${citation.number}`}>
      <a href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a>
      <span>{citation.section}</span><blockquote>{citation.excerpt}</blockquote>
    </div>)}
  </details>;
}

export function ChatAssistant({ artifactId, artifactName, open, onToggle, embedded = false }: Props) {
  const [conversations, setConversations] = useState(loadConversations);
  const [session] = useState(visitorSession);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch { /* In-memory history still works. */ }
  }, [conversations]);
  const key: Key = artifactId ?? "none";
  if (embedded) return <div className="phu-chat-embedded"><ChatThread key={key}
    artifactId={artifactId} artifactName={artifactName} onToggle={onToggle} session={session}
    messages={conversations[key]}
    onAppend={message => setConversations(current => ({ ...current, [key]: [...current[key], message].slice(-40) }))} />
  </div>;
  return <aside className={`assistant-dock ${open ? "is-open" : "is-collapsed"}`} aria-label="Trợ lý hiện vật">
    {!open ? <button className="assistant-collapsed-button" type="button" aria-label="Mở trợ lý AI" aria-expanded={false} onClick={onToggle}>
      <span className="assistant-icon" aria-hidden="true">✦</span><span>Hỏi AI</span>
    </button> : <ChatThread key={key} artifactId={artifactId} artifactName={artifactName} onToggle={onToggle}
      session={session} messages={conversations[key]}
      onAppend={message => setConversations(current => ({ ...current, [key]: [...current[key], message].slice(-40) }))} />}
  </aside>;
}

type ThreadProps = Omit<Props, "open"> & { session: string; messages: Message[]; onAppend: (message: Message) => void };

function ChatThread({ artifactId, artifactName, onToggle, session, messages, onAppend }: ThreadProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [error, setError] = useState("");
  const [waitSeconds, setWaitSeconds] = useState(0);
  const pendingQuestion = useRef("");
  const request = useRef<AbortController | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setWaitSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages.length, busy]);

  async function send(question = draft) {
    question = question.trim();
    if (!question || busy || voiceBusy || !artifactId) return;
    const sentId = artifactId;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role !== "user" || lastMessage.text !== question) onAppend({ id: makeId(), role: "user", text: question });
    pendingQuestion.current = question;
    setDraft(""); setBusy(true); setWaitSeconds(0); setError("");
    try {
      const response = await askChat({ question, artifact_id: sentId, session_id: session,
        history: dialogueHistory(messages, sentId) }, controller.signal);
      if (!controller.signal.aborted) {
        onAppend({ id: makeId(), role: "assistant", text: response.answer, response });
        if (response.status === "temporarily_unavailable") setDraft(question);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Chưa gửi được câu hỏi.");
        setDraft(question);
      }
    } finally {
      if (!controller.signal.aborted) { setBusy(false); input.current?.focus(); }
    }
  }

  function cancelWaiting() {
    request.current?.abort();
    setBusy(false); setDraft(pendingQuestion.current); setError("");
    input.current?.focus();
  }

  return <section className="assistant-panel chat-panel">
      <header className="assistant-header">
        <div><span className="assistant-icon" aria-hidden="true">✦</span><div><h2>Trợ lý hiện vật</h2><p>{artifactName ? `Đang tìm hiểu: ${artifactName}` : "Chọn một hiện vật để bắt đầu"}</p></div></div>
        <button className="assistant-close" type="button" aria-label="Thu gọn trợ lý" onClick={onToggle}>×</button>
      </header>
      <div className="chat-context"><span className="chat-dot" aria-hidden="true" />{artifactName ? "Cùng bạn khám phá hiện vật này" : "Ba hiện vật · Một câu chuyện mỗi lần"}</div>
      <div className="chat-messages" ref={scroll} role="log" aria-label="Hội thoại" aria-relevant="additions" aria-busy={busy}>
        {!messages.length && <div className="chat-empty">
          <span className="assistant-placeholder-icon" aria-hidden="true">✦</span>
          <h3>{artifactName ? "Bạn muốn khám phá điều gì?" : "Chọn hiện vật để trò chuyện"}</h3>
          <p>{artifactName ? "Bạn cứ hỏi tự nhiên nhé. Nguồn sẽ nằm bên dưới để bạn xem thêm khi cần." : "Chạm vào hiện vật hoặc chọn tên trong danh sách phía trên."}</p>
          {artifactId === "dagger" && <p className="chat-model-note">Dao găm trong demo là mô hình minh họa loại hình.</p>}
          {artifactId && <div className="chat-suggestions">{["Cái này có nguồn gốc thế nào?", "Hoa văn có gì đặc biệt?", "Hiện vật được dùng làm gì?"].map(question => <button key={question} type="button" disabled={busy || voiceBusy} onClick={() => void send(question)}>{question}</button>)}</div>}
        </div>}
        {messages.map(message => <article className={`chat-message is-${message.role}`} key={message.id}>
          <span className="chat-speaker">{message.role === "user" ? "Bạn" : "Trợ lý hiện vật"}</span>
          <p>{message.text}</p>
          {message.response && <AnswerSources response={message.response} />}
        </article>)}
        {busy && <div className="chat-working"><p role="status">{waitSeconds < 5 ? "Mình đang xem câu hỏi của bạn…" : "Mình đang kết nối để giải đáp, bạn chờ một chút nhé…"}</p><button type="button" onClick={cancelWaiting}>Dừng chờ</button></div>}
      </div>
      <div className="chat-compose">
        {error && <p className="chat-error" role="alert">{error} Câu hỏi đã được giữ lại để bạn thử gửi lại.</p>}
        <form onSubmit={event => { event.preventDefault(); void send(); }}>
          <label htmlFor="visitor-question">Câu hỏi của bạn</label>
          <textarea id="visitor-question" ref={input} value={draft} maxLength={1500} rows={2}
            placeholder={artifactId ? "Ví dụ: Cái này được tìm thấy ở đâu?" : "Hãy chọn một hiện vật trước"}
            disabled={!artifactId || busy || voiceBusy} onChange={event => setDraft(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
          <button className="chat-send" type="submit" disabled={!artifactId || busy || voiceBusy || !draft.trim()}>{busy ? "Đang trả lời…" : "Gửi câu hỏi"}<span aria-hidden="true"> ↗</span></button>
        </form>
        <PushToTalk disabled={!artifactId || busy} onActivityChange={setVoiceBusy} onTranscript={text => { setDraft(text); }} />
      </div>
    </section>;
}
