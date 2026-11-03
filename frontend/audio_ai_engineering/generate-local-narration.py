"""Generate static narration MP3s with local KorvaTTS, without an API key."""

import argparse
import hashlib
import json
from pathlib import Path
from uuid import uuid4

import numpy as np
import soundfile as sf
from korvatts import TTS


MODULE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = MODULE_DIR.parent / "public" / "narration"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhibit", choices=("drum", "jar", "dagger", "all"), required=True)
    parser.add_argument("--language", choices=("vi", "en", "all"), required=True)
    parser.add_argument("--voice", default="ngoc_huyen")
    parser.add_argument("--assets-dir", type=Path, help="Existing directory containing onnx/ and voice_styles/; disables downloads.")
    parser.add_argument("--force", action="store_true", help="Replace existing audio after review.")
    args = parser.parse_args()

    scripts = json.loads((MODULE_DIR / "narration-scripts.json").read_text(encoding="utf-8"))
    exhibits = list(scripts) if args.exhibit == "all" else [args.exhibit]
    languages = ("vi", "en") if args.language == "all" else (args.language,)
    jobs = []
    for exhibit in exhibits:
        for language in languages:
            text = scripts[exhibit][language].strip()
            if not text:
                raise ValueError(f"Empty script: {exhibit}/{language}")
            output = OUTPUT_DIR / f"{exhibit}-{language}.mp3"
            metadata_file = output.with_suffix(".json")
            settings = dict(provider="local", model="KorvaTTS-0.1.3", voice=args.voice, language=language, text=text, steps=32, speed=0.96, seed=42)
            fingerprint = hashlib.sha256(json.dumps(settings, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
            if output.exists() and not args.force:
                metadata = json.loads(metadata_file.read_text(encoding="utf-8")) if metadata_file.exists() else {}
                if metadata.get("fingerprint") != fingerprint:
                    raise FileExistsError(f"Review {output} and use --force to replace it.")
                print(f"Already generated: {output.name}", flush=True)
                continue
            jobs.append((text, language, output, metadata_file, settings, fingerprint))

    if not jobs:
        return
    print("Loading KorvaTTS; voice: " + args.voice, flush=True)
    tts = TTS(assets_dir=args.assets_dir, auto_download=args.assets_dir is None)
    if args.voice not in tts.list_voices():
        raise ValueError(f"Unknown voice: {args.voice}. Available: {', '.join(tts.list_voices())}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for text, language, output, metadata_file, settings, fingerprint in jobs:
        print(f"Generating {output.name} ({len(text)} characters)...", flush=True)
        wav, _ = tts.synthesize(text, voice=args.voice, lang=language, total_steps=32, speed=0.96, seed=42)
        if len(wav) < tts.sample_rate or not np.isfinite(wav).all():
            raise ValueError(f"Invalid generated audio: {output.name}")
        temporary = output.with_name(f"{output.stem}.{uuid4().hex}.tmp")
        try:
            sf.write(temporary, wav, tts.sample_rate, format="MP3")
            info = sf.info(temporary)
            temporary.replace(output)
            metadata = {key: value for key, value in settings.items() if key != "text"}
            metadata.update(fingerprint=fingerprint, duration_seconds=round(info.duration, 2), sample_rate=info.samplerate)
            metadata_file.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        finally:
            temporary.unlink(missing_ok=True)
        print(f"Saved {output.name}: {info.duration:.1f}s, {output.stat().st_size // 1024} KB", flush=True)


if __name__ == "__main__":
    main()
