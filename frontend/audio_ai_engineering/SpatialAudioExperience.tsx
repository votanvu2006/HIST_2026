import { useEffect, useId, useRef, useState } from "react";
import { Euler, Quaternion, Vector3 } from "three";
import { InteractiveStructureScene } from "../src/InteractiveStructureScene";
import type { ExhibitId } from "../src/InteractiveScene";
import { SpatialAudioEngine, soundSources } from "./spatialAudio";
import type { ListenerPose, SoundSourceId } from "./spatialAudio";
import { NarrationPlayer } from "./NarrationPlayer";
import "./SpatialAudioExperience.css";

type ViewAngles = { yaw: number; pitch: number };
type OrientationConstructor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
const radians = Math.PI / 180;
const degrees = 180 / Math.PI;

export function SpatialAudioExperience({ exhibitId }: { exhibitId: ExhibitId }) {
  const id = useId();
  const engine = useRef<SpatialAudioEngine | null>(null);
  const latestPose = useRef<ListenerPose | null>(null);
  const mounted = useRef(false);
  const permissionAttempt = useRef(0);
  const baseline = useRef<ViewAngles | null>(null);
  const listenerMarker = useRef<SVGGElement | null>(null);
  const directionMarker = useRef<SVGLineElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState(45);
  const [enabledSources, setEnabledSources] = useState<SoundSourceId[]>(soundSources.map((source) => source.id));
  const [view, setView] = useState<ViewAngles | null>(null);
  const [sensor, setSensor] = useState(false);
  const [sensorPending, setSensorPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      if (document.hidden) {
        void engine.current?.pause().catch(() => {});
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      permissionAttempt.current += 1;
      document.removeEventListener("visibilitychange", onVisibility);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sensor) return;
    let lastUpdate = -Infinity;
    let received = false;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (document.hidden || event.alpha === null || event.beta === null || event.gamma === null) return;
      if (![event.alpha, event.beta, event.gamma].every(Number.isFinite)) return;
      const now = performance.now();
      if (now - lastUpdate < 80) return;
      lastUpdate = now;
      received = true;
      // Convert device Z-X-Y angles to the camera's Y-up coordinates.
      const screenAngle = window.screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
      const rotation = new Quaternion().setFromEuler(new Euler(event.beta * radians, event.alpha * radians, -event.gamma * radians, "YXZ"))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -screenAngle * radians));
      const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
      const current = { yaw: Math.atan2(forward.x, -forward.z) * degrees, pitch: Math.asin(Math.max(-1, Math.min(1, forward.y))) * degrees };
      baseline.current ??= current;
      const delta = (current.yaw - baseline.current.yaw) * radians;
      setView({ yaw: Math.atan2(Math.sin(delta), Math.cos(delta)) * degrees, pitch: Math.max(-60, Math.min(60, current.pitch - baseline.current.pitch)) });
      setMessage("");
    };
    window.addEventListener("deviceorientation", onOrientation);
    const timeout = window.setTimeout(() => {
      if (!received) {
        setSensor(false);
        setMessage("Chưa nhận được cảm biến. Bạn có thể kéo cảnh hoặc dùng thanh góc nhìn.");
      }
    }, 5000);
    return () => { window.clearTimeout(timeout); window.removeEventListener("deviceorientation", onOrientation); };
  }, [sensor]);

  const updatePose = (pose: ListenerPose) => {
    latestPose.current = pose;
    engine.current?.setPose(pose);
    listenerMarker.current?.setAttribute("transform", `translate(${pose.position[0] * 20} ${pose.position[2] * 20})`);
    directionMarker.current?.setAttribute("x2", String(pose.forward[0] * 28));
    directionMarker.current?.setAttribute("y2", String(pose.forward[2] * 28));
  };

  async function toggleAudio() {
    setBusy(true);
    setMessage("");
    try {
      if (playing) {
        await engine.current?.pause();
        if (mounted.current) setPlaying(false);
      } else {
        engine.current ??= new SpatialAudioEngine();
        engine.current.setVolume(volume / 100);
        soundSources.forEach((source) => engine.current?.setSourceEnabled(source.id, enabledSources.includes(source.id)));
        if (latestPose.current) engine.current.setPose(latestPose.current);
        await engine.current.play();
        if (mounted.current && !document.hidden) setPlaying(true);
        else await engine.current?.pause();
      }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "Chưa mở được âm thanh. Hãy thử lại.");
    } finally { if (mounted.current) setBusy(false); }
  }

  async function toggleSensor() {
    const attempt = ++permissionAttempt.current;
    if (sensor) { setSensor(false); setView(null); setMessage(""); return; }
    if (!window.isSecureContext || typeof DeviceOrientationEvent === "undefined") {
      setMessage("Cảm biến cần HTTPS hoặc localhost và thiết bị hỗ trợ. Bạn vẫn có thể kéo cảnh.");
      return;
    }
    setSensorPending(true);
    try {
      const constructor = DeviceOrientationEvent as OrientationConstructor;
      if (constructor.requestPermission && await constructor.requestPermission() !== "granted") throw new Error("Bạn chưa cấp quyền cảm biến. Hãy dùng thanh góc nhìn hoặc kéo cảnh.");
      if (!mounted.current || attempt !== permissionAttempt.current) return;
      baseline.current = null;
      setView({ yaw: 0, pitch: 0 });
      setSensor(true);
      setMessage("Đang chờ cảm biến hướng trên điện thoại…");
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "Chưa bật được cảm biến hướng.");
    } finally { if (mounted.current) setSensorPending(false); }
  }

  function resetView() {
    baseline.current = null;
    setView(sensor ? { yaw: 0, pitch: 0 } : null);
  }

  function toggleSource(source: SoundSourceId) {
    const enabled = !enabledSources.includes(source);
    setEnabledSources(enabled ? [...enabledSources, source] : enabledSources.filter((item) => item !== source));
    engine.current?.setSourceEnabled(source, enabled);
  }

  return (
    <section className="spatial-audio-experience" aria-label="Trải nghiệm âm thanh 360 độ">
      <div className="spatial-audio-scene">
        <InteractiveStructureScene exhibitId={exhibitId} viewAngles={view} onViewPose={updatePose} />
      </div>
      <div className="spatial-audio-controls">
        <div className="spatial-audio-heading">
          <div><span className="section-label">KHÔNG GIAN ÂM THANH</span><h2>Lắng nghe quanh bạn</h2></div>
          <button type="button" onClick={toggleAudio} disabled={busy} aria-pressed={playing}>{busy ? "Đang xử lý…" : playing ? "Tạm dừng âm thanh" : "Bật âm thanh"}</button>
        </div>
        <p>Đeo tai nghe, kéo cảnh để xoay góc nhìn. Âm thanh sẽ chuyển trái/phải và rõ hơn khi bạn nhìn về phía nguồn âm.</p>
        <label className="spatial-audio-range" htmlFor={`${id}-volume`}>Âm lượng môi trường <output>{volume}%</output>
          <input id={`${id}-volume`} type="range" min="0" max="100" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); engine.current?.setVolume(value / 100); }} />
        </label>
        <fieldset className="spatial-audio-sources"><legend>Nguồn âm minh họa</legend>
          {soundSources.map((source) => <label key={source.id}><input type="checkbox" checked={enabledSources.includes(source.id)} onChange={() => toggleSource(source.id)} />{source.label}</label>)}
        </fieldset>
        <svg className="spatial-audio-map" viewBox="-140 -140 280 280" role="img" aria-label="Bản đồ nhìn từ trên: các nguồn âm cố định và tia chỉ hướng nhìn của bạn">
          <circle r="105" fill="none" stroke="#786946" strokeDasharray="4 5" />
          {soundSources.map((source) => <g key={source.id} transform={`translate(${source.position[0] * 20} ${source.position[2] * 20})`} opacity={enabledSources.includes(source.id) ? 1 : 0.35}>
            <circle r="6" fill="#e3ba63" /><text y="-13" textAnchor="middle" fill="#eee5d0" fontSize="13">{source.label}</text>
          </g>)}
          <g ref={listenerMarker}><line ref={directionMarker} x2="0" y2="-28" stroke="#90d3d7" strokeWidth="4" strokeLinecap="round" /><circle r="6" fill="#90d3d7" /><text y="19" textAnchor="middle" fill="#90d3d7" fontSize="13">Bạn</text></g>
        </svg>
        <div className="spatial-audio-actions">
          <button type="button" onClick={toggleSensor} disabled={sensorPending} aria-pressed={sensor}>{sensorPending ? "Đang xin quyền…" : sensor ? "Tắt cảm biến hướng" : "Xoay bằng điện thoại"}</button>
          <button type="button" onClick={resetView}>Đặt lại góc nhìn</button>
        </div>
        <label className="spatial-audio-range" htmlFor={`${id}-yaw`}>Góc xoay ngang <output>{Math.round(view?.yaw ?? 0)}°</output>
          <input id={`${id}-yaw`} type="range" min="-180" max="180" value={view?.yaw ?? 0} disabled={sensor} onChange={(event) => setView({ yaw: Number(event.target.value), pitch: view?.pitch ?? 0 })} />
        </label>
        <label className="spatial-audio-range" htmlFor={`${id}-pitch`}>Góc nhìn lên/xuống <output>{Math.round(view?.pitch ?? 0)}°</output>
          <input id={`${id}-pitch`} type="range" min="-60" max="60" value={view?.pitch ?? 0} disabled={sensor} onChange={(event) => setView({ yaw: view?.yaw ?? 0, pitch: Number(event.target.value) })} />
        </label>
        <p className="spatial-audio-note">Đặt lại góc nhìn để quay về kéo cảnh. Các âm thanh được tổng hợp để minh họa môi trường, chưa phải bản phục dựng lịch sử.</p>
        <p role="status" aria-live="polite">{message || (playing ? "Đang phát âm thanh 360°." : "Âm thanh đang tắt hoặc tạm dừng.")}</p>
      </div>
      <div className="spatial-audio-narration"><NarrationPlayer exhibitId={exhibitId} /></div>
    </section>
  );
}
