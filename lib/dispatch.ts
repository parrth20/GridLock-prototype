/* eslint-disable @typescript-eslint/no-explicit-any */
// Prototype push-to-talk dispatch using only built-in browser APIs:
//   • Web Speech (SpeechSynthesis) speaks the order aloud
//   • Web Audio plays a short radio "squelch" chirp
//   • Notifications ping the operator
// In production this maps to a real PTT service (Zello / Motorola WAVE) or a
// WebRTC channel to patrol devices. All calls are client-only and fail soft.

let audioCtx: any = null;

export function playSquelch(): void {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1150;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.start(t);
    osc.stop(t + 0.14);
  } catch {
    /* ignore */
  }
}

export function speak(text: string): boolean {
  try {
    const synth = (window as any).speechSynthesis;
    if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1;
    u.lang = "en-IN";
    const voices = synth.getVoices?.() ?? [];
    const v = voices.find((vv: any) => /en[-_]/i.test(vv.lang));
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    if (!("Notification" in window)) return;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm === "granted") new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

/** Fire a full dispatch: squelch → spoken order → notification. */
export function dispatch(title: string, text: string): void {
  playSquelch();
  setTimeout(() => speak(text), 160);
  void notify(title, text);
}
