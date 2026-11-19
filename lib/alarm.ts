/**
 * Loud "turn the pump off" alarm made with the Web Audio API: no sound files, works with no internet.
 * Browsers only allow sound after a tap, so call unlockAudio() from a button press first.
 */
let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;

type AudioCtor = typeof AudioContext;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
}

function beep(freq: number, delay: number, duration: number, volume = 0.5) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** A short two-beep reminder (e.g. "5 minutes left"). */
export function chime() {
  unlockAudio();
  beep(880, 0, 0.15, 0.3);
  beep(880, 0.25, 0.15, 0.3);
  navigator.vibrate?.([150, 100, 150]);
}

/** Repeating alarm until stopAlarm(): beep-beep-BEEP and vibration every 1.4 s. */
export function startAlarm() {
  if (loop) return;
  unlockAudio();
  const ring = () => {
    beep(880, 0, 0.18);
    beep(880, 0.28, 0.18);
    beep(1175, 0.56, 0.4);
    navigator.vibrate?.([250, 100, 250, 100, 500]);
  };
  ring();
  loop = setInterval(ring, 1400);
}

export function stopAlarm() {
  if (loop) clearInterval(loop);
  loop = null;
  navigator.vibrate?.(0);
}

export const alarmRunning = () => loop !== null;
