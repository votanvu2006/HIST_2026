export type ListenerPose = {
  position: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
};

export const soundSources = [
  { id: "fire", label: "Lửa lò", position: [-2.2, 0, -1] as const, level: 0.3 },
  { id: "hammer", label: "Tiếng gõ", position: [2.2, 0, -1] as const, level: 0.23 },
  { id: "river", label: "Dòng nước", position: [0, 0, 3] as const, level: 0.35 },
] as const;

export type SoundSourceId = (typeof soundSources)[number]["id"];

const initialPose: ListenerPose = { position: [0, 0, 0], forward: [0, 0, -1], up: [0, 1, 0] };

export function applyListenerPose(context: BaseAudioContext, pose: ListenerPose) {
  const listener = context.listener;
  const now = context.currentTime;
  const values = [...pose.position, ...pose.forward, ...pose.up];
  if (listener.forwardX && listener.positionX) {
    [listener.positionX, listener.positionY, listener.positionZ,
      listener.forwardX, listener.forwardY, listener.forwardZ,
      listener.upX, listener.upY, listener.upZ].forEach((parameter, index) => {
      parameter.setTargetAtTime(values[index], now, 0.06);
    });
  } else {
    listener.setPosition(...pose.position);
    listener.setOrientation(...pose.forward, ...pose.up);
  }
}

export function facingLevel(pose: ListenerPose, source: readonly number[]) {
  const delta = source.map((value, index) => value - pose.position[index]);
  const length = Math.hypot(...delta) || 1;
  const forwardLength = Math.hypot(...pose.forward) || 1;
  const dot = delta.reduce((sum, value, index) => sum + value * pose.forward[index], 0) / length / forwardLength;
  // Keep a quiet bed behind the visitor; looking at a source makes it clearer.
  return 0.25 + 0.75 * ((Math.max(-1, Math.min(1, dot)) + 1) / 2) ** 2;
}

function createAmbience(context: BaseAudioContext, kind: SoundSourceId) {
  const rate = 22050;
  const buffer = context.createBuffer(1, rate * 8, rate);
  const samples = buffer.getChannelData(0);
  let seed = kind === "fire" ? 31 : kind === "hammer" ? 101 : 53;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let low = 0;
  let crackle = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / rate;
    const noise = random() * 2 - 1;
    low = low * 0.97 + noise * 0.03;
    let value: number;
    if (kind === "hammer") {
      const hit = time % 0.8;
      value = (Math.sin(hit * Math.PI * 2 * 680) + Math.sin(hit * Math.PI * 2 * 1154) * 0.45) * Math.exp(-hit * 22)
        + noise * Math.exp(-hit * 110) * 0.4;
    } else if (kind === "fire") {
      crackle = crackle * 0.88 + (random() > 0.998 ? noise : 0);
      value = low * 1.2 + crackle * 0.8 + noise * 0.035;
    } else {
      value = low * (1 + 0.25 * Math.sin(time * Math.PI / 2)) + noise * 0.045;
    }
    const edge = Math.min(1, time / 0.025, (8 - time) / 0.025);
    samples[i] = value * edge;
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  for (let i = 0; i < samples.length; i += 1) samples[i] *= 0.65 / (peak || 1);
  return buffer;
}

export class SpatialAudioEngine {
  private context: AudioContext;
  private master: GainNode;
  private tracks: { id: SoundSourceId; source: AudioBufferSourceNode; panner: PannerNode; gain: GainNode; enabled: boolean }[];
  private pose = initialPose;
  private disposed = false;

  constructor() {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error("Trình duyệt chưa hỗ trợ âm thanh không gian.");
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.context.destination);
    this.tracks = soundSources.map((definition) => {
      const source = this.context.createBufferSource();
      source.buffer = createAmbience(this.context, definition.id);
      source.loop = true;
      const panner = this.context.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 3;
      panner.maxDistance = 30;
      panner.rolloffFactor = 0.7;
      panner.setPosition(definition.position[0], definition.position[1], definition.position[2]);
      const gain = this.context.createGain();
      gain.gain.value = 0;
      source.connect(panner).connect(gain).connect(this.master);
      source.start();
      return { id: definition.id, source, panner, gain, enabled: true };
    });
    this.setPose(initialPose);
  }

  async play() {
    if (this.disposed) return;
    await this.context.resume();
    if (!this.disposed && this.context.state !== "running") throw new Error("Chạm Bật âm thanh để cho phép phát trên trình duyệt.");
  }

  async pause() {
    if (!this.disposed && this.context.state === "running") await this.context.suspend();
  }

  setPose(pose: ListenerPose) {
    if (this.disposed) return;
    this.pose = pose;
    applyListenerPose(this.context, pose);
    this.tracks.forEach((track, index) => {
      const definition = soundSources[index];
      track.gain.gain.setTargetAtTime(track.enabled ? definition.level * facingLevel(pose, definition.position) : 0, this.context.currentTime, 0.08);
    });
  }

  setVolume(value: number) {
    if (!this.disposed) this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, 0.04);
  }

  setSourceEnabled(id: SoundSourceId, enabled: boolean) {
    const track = this.tracks.find((item) => item.id === id);
    if (track) track.enabled = enabled;
    this.setPose(this.pose);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.tracks.forEach(({ source, panner, gain }) => { source.stop(); source.disconnect(); panner.disconnect(); gain.disconnect(); });
    this.master.disconnect();
    void this.context.close().catch(() => {});
  }
}
