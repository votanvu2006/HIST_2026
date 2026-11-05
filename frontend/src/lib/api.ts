import type { ExhibitId } from "../InteractiveScene";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export type Citation = {
  number: number;
  chunk_id: string;
  title: string;
  url: string;
  section: string;
  excerpt: string;
};

export type ChatResponse = {
  artifact_id: ExhibitId | null;
  status:
    | "answered"
    | "insufficient_evidence"
    | "out_of_scope"
    | "needs_selection"
    | "needs_clarification"
    | "temporarily_unavailable";
  answer: string;
  citations: Citation[];
  elapsed_ms: number;
  usage: Record<string, number>;
  corpus_version: string;
};

export type ChatRequest = {
  question: string;
  artifact_id: ExhibitId | null;
  session_id: string;
  history?: { artifact_id: ExhibitId; question: string; answer: string }[];
};

export async function api<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 90_000,
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Lượt trả lời này mất hơi lâu. Bạn thử lại nhé.");
    }
    throw new Error("Chưa kết nối được máy chủ. Bạn hãy kiểm tra mạng rồi thử lại.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Yêu cầu chưa được xử lý. Bạn hãy thử lại.",
    );
  }

  if (!body || typeof body !== "object") {
    throw new Error("Mình chưa nhận được câu trả lời đầy đủ. Bạn thử gửi lại nhé.");
  }

  return body as T;
}

export function askChat(body: ChatRequest, signal: AbortSignal) {
  return api<ChatResponse>(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    },
    25_000,
  );
}

export function visitorSession(): string {
  try {
    const stored = sessionStorage.getItem("heritage-session");
    if (stored && /^[a-zA-Z0-9_-]{1,80}$/.test(stored)) {
      return stored;
    }

    const id = makeId();
    sessionStorage.setItem("heritage-session", id);
    return id;
  } catch {
    return makeId();
  }
}

export function makeId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
