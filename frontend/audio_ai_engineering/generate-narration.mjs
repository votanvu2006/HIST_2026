import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(root, ".env")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const scripts = JSON.parse(await readFile(path.join(root, "audio_ai_engineering/narration-scripts.json"), "utf8"));
const args = process.argv.slice(2);
const usage = "Usage: npm run narration:generate -- --exhibit drum|jar|dagger --language vi|en [--force]";

function parseArgs(values) {
  const result = { force: false };
  for (let i = 0; i < values.length; i += 1) {
    const arg = values[i];
    if (arg === "--force" && !result.force) result.force = true;
    else if ((arg === "--exhibit" || arg === "--language") && !result[arg.slice(2)] && values[i + 1] && !values[i + 1].startsWith("--")) result[arg.slice(2)] = values[++i];
    else throw new Error(usage);
  }
  if (!Object.hasOwn(scripts, result.exhibit ?? "") || !["vi", "en"].includes(result.language)) throw new Error(usage);
  return result;
}

async function exists(filename) {
  try { await readFile(filename); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function main() {
  const { exhibit, language, force } = parseArgs(args);
  const text = scripts[exhibit][language].trim();
  if (!text || [...text].length > 5000) throw new Error("The script must contain 1–5000 characters for Eleven v3.");
  const voiceId = process.env[`ELEVENLABS_VOICE_ID_${language.toUpperCase()}`] || process.env.ELEVENLABS_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !voiceId) throw new Error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (or the language-specific voice ID) before generating audio.");
  if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) throw new Error("Invalid ElevenLabs voice ID.");

  const directory = path.join(root, "public/narration");
  const output = path.join(directory, `${exhibit}-${language}.mp3`);
  const metadataFile = path.join(directory, `${exhibit}-${language}.json`);
  const fingerprint = createHash("sha256").update(JSON.stringify({ text, language, voiceId, model: "eleven_v3" })).digest("hex");
  let metadata;
  try { metadata = JSON.parse(await readFile(metadataFile, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (await exists(output) && !force) {
    if (metadata?.fingerprint === fingerprint) console.log(`Already generated: ${output}`);
    else throw new Error(`Audio already exists at ${output}. Review it and use --force to replace it.`);
    return;
  }

  console.log(`Generating ${exhibit}/${language}: ${[...text].length} characters with eleven_v3.`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_v3", language_code: language }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      const providerError = body?.detail;
      const code = typeof providerError?.status === "string" ? providerError.status : "";
      const message = typeof providerError?.message === "string" ? providerError.message : "";
      detail = [code, message].filter(Boolean).join(": ").replaceAll(apiKey, "[redacted]").slice(0, 500);
    } catch { /* Some errors have no JSON body. */ }
    throw new Error(`ElevenLabs request failed (HTTP ${response.status})${detail ? `: ${detail}` : ". Check the API key, voice access, remaining credit, and provider status."}`);
  }
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("audio/")) throw new Error("ElevenLabs returned a non-audio response; no file was saved.");
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) throw new Error("ElevenLabs returned empty audio; no file was saved.");
  await mkdir(directory, { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, audio);
    await rename(temporary, output);
    await writeFile(metadataFile, `${JSON.stringify({ fingerprint, model: "eleven_v3", language }, null, 2)}\n`);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Saved: ${output}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
