import { useState, useEffect, useRef, useCallback } from 'react';

export type SoundType =
  | 'silence'
  | 'engine-hum'
  | 'white-noise'
  | 'rain'
  | 'waves'
  | 'coffee-shop'
  | 'forest'
  | 'thunderstorm'
  | 'train-rhythm';

export const SOUND_OPTIONS: { type: SoundType; label: string; emoji: string }[] = [
  { type: 'silence',     label: 'Off',        emoji: '🔇' },
  { type: 'engine-hum',  label: 'Engine',     emoji: '✈️' },
  { type: 'rain',        label: 'Rain',        emoji: '🌧️' },
  { type: 'waves',       label: 'Waves',       emoji: '🌊' },
  { type: 'coffee-shop', label: 'Café',        emoji: '☕' },
  { type: 'forest',      label: 'Forest',      emoji: '🌲' },
  { type: 'thunderstorm',label: 'Storm',       emoji: '⛈️' },
  { type: 'white-noise', label: 'White Noise', emoji: '〰️' },
];

export function useAmbientSound(initialSound: SoundType = 'silence') {
  const [currentSound, setCurrentSound] = useState<SoundType>(initialSound);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef    = useRef<AudioNode[]>([]);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const stopCurrent = useCallback(() => {
    nodesRef.current.forEach(node => {
      try {
        if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch {}
    });
    nodesRef.current = [];
  }, []);

  /** Build a looping brown-noise source */
  const makeBrownNoise = useCallback((ctx: AudioContext, gain: number, lpHz: number) => {
    const bufferSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      out[i] = (last + 0.02 * w) / 1.02;
      last = out[i];
      out[i] *= 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = lpHz;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(filt); filt.connect(g);
    return { src, filt, gain: g, nodes: [src, filt, g] as AudioNode[] };
  }, []);

  /** Build a looping white-noise source */
  const makeWhiteNoise = useCallback((ctx: AudioContext, gainVal: number, lpHz: number) => {
    const bufferSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = lpHz;
    const g = ctx.createGain(); g.gain.value = gainVal;
    src.connect(filt); filt.connect(g);
    return { src, filt, gain: g, nodes: [src, filt, g] as AudioNode[] };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    const ctx = getCtx();
    stopCurrent();
    setCurrentSound(type);

    if (type === 'silence') { setIsPlaying(false); return; }
    setIsPlaying(true);

    const master = ctx.createGain();
    master.connect(ctx.destination);
    nodesRef.current.push(master);

    // ── Engine hum ──────────────────────────────────────────────────────────
    if (type === 'engine-hum') {
      const o1 = ctx.createOscillator(); o1.type = 'sine';     o1.frequency.value = 80;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 81.5;
      master.gain.value = 0.15;
      o1.connect(master); o2.connect(master);
      o1.start(); o2.start();
      nodesRef.current.push(o1, o2);
    }

    // ── White noise ─────────────────────────────────────────────────────────
    else if (type === 'white-noise') {
      const { src, nodes } = makeWhiteNoise(ctx, 0.09, 1200);
      nodes.forEach(n => nodesRef.current.push(n));
      const last = nodes[nodes.length - 1] as GainNode;
      last.connect(master);
      src.start();
    }

    // ── Rain ────────────────────────────────────────────────────────────────
    else if (type === 'rain') {
      const { src, nodes } = makeBrownNoise(ctx, 0.38, 450);
      nodes.forEach(n => nodesRef.current.push(n));
      const last = nodes[nodes.length - 1] as GainNode;
      last.connect(master);
      master.gain.value = 1;
      src.start();
    }

    // ── Ocean waves ─────────────────────────────────────────────────────────
    else if (type === 'waves') {
      // Brown noise modulated slowly — like wave swell
      const { src, nodes } = makeBrownNoise(ctx, 1, 300);
      nodes.forEach(n => nodesRef.current.push(n));
      const last = nodes[nodes.length - 1] as GainNode;

      // LFO for wave rhythm
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.35;
      const waveMaster = ctx.createGain(); waveMaster.gain.value = 0.28;

      lfo.connect(lfoGain); lfoGain.connect(waveMaster.gain);
      last.connect(waveMaster); waveMaster.connect(master);
      master.gain.value = 1;
      lfo.start(); src.start();
      nodesRef.current.push(lfo, lfoGain, waveMaster);
    }

    // ── Coffee shop ─────────────────────────────────────────────────────────
    else if (type === 'coffee-shop') {
      // Pink-ish noise (mid-range) simulating room ambience
      const { src: w, nodes: wn } = makeWhiteNoise(ctx, 0.06, 2500);
      wn.forEach(n => nodesRef.current.push(n));
      (wn[wn.length - 1] as GainNode).connect(master);
      w.start();

      // Very low rumble (HVAC)
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
      const og = ctx.createGain(); og.gain.value = 0.03;
      o.connect(og); og.connect(master);
      o.start();
      nodesRef.current.push(o, og);

      // Mid-frequency presence
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 800; bp.Q.value = 0.5;
      const { src: m, nodes: mn } = makeWhiteNoise(ctx, 0.04, 3000);
      mn.forEach(n => nodesRef.current.push(n));
      (mn[mn.length - 1] as GainNode).connect(bp); bp.connect(master);
      nodesRef.current.push(bp);
      m.start();

      master.gain.value = 1.2;
    }

    // ── Forest ──────────────────────────────────────────────────────────────
    else if (type === 'forest') {
      // Very quiet wind (brown noise, soft)
      const { src: wind, nodes: wn } = makeBrownNoise(ctx, 0.12, 600);
      wn.forEach(n => nodesRef.current.push(n));
      (wn[wn.length - 1] as GainNode).connect(master);
      wind.start();

      // Gentle breeze (white noise, very quiet, high-pass)
      const { src: breeze, nodes: bn } = makeWhiteNoise(ctx, 0.04, 5000);
      bn.forEach(n => nodesRef.current.push(n));
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
      (bn[bn.length - 1] as GainNode).connect(hp); hp.connect(master);
      nodesRef.current.push(hp);
      breeze.start();

      // Occasional bird-like chirp tones (scheduled oscillators)
      const chirpFreqs = [2400, 2800, 3200, 1800, 2200];
      let tOffset = ctx.currentTime + 1.5;
      for (let i = 0; i < 40; i++) {
        const chirp = ctx.createOscillator();
        chirp.type = 'sine';
        chirp.frequency.value = chirpFreqs[Math.floor(Math.random() * chirpFreqs.length)];
        const cg = ctx.createGain(); cg.gain.value = 0;
        chirp.connect(cg); cg.connect(master);
        const dur = 0.05 + Math.random() * 0.12;
        const vol = 0.015 + Math.random() * 0.02;
        cg.gain.setValueAtTime(0, tOffset);
        cg.gain.linearRampToValueAtTime(vol, tOffset + dur * 0.3);
        cg.gain.linearRampToValueAtTime(0, tOffset + dur);
        chirp.start(tOffset);
        chirp.stop(tOffset + dur + 0.05);
        nodesRef.current.push(chirp, cg);
        tOffset += 0.8 + Math.random() * 3.5;
      }

      master.gain.value = 1;
    }

    // ── Thunderstorm ────────────────────────────────────────────────────────
    else if (type === 'thunderstorm') {
      // Heavy rain (brown noise)
      const { src: rain, nodes: rn } = makeBrownNoise(ctx, 0.55, 500);
      rn.forEach(n => nodesRef.current.push(n));
      (rn[rn.length - 1] as GainNode).connect(master);
      rain.start();

      // Lighter rain layer (white noise, mid-range)
      const { src: light, nodes: ln } = makeWhiteNoise(ctx, 0.08, 1800);
      ln.forEach(n => nodesRef.current.push(n));
      (ln[ln.length - 1] as GainNode).connect(master);
      light.start();

      // Thunder rumbles — occasional deep booms
      const thunderAt = [3, 9, 18, 28, 40];
      thunderAt.forEach(t => {
        const thud = ctx.createOscillator(); thud.type = 'sine'; thud.frequency.value = 40;
        const tg = ctx.createGain(); tg.gain.value = 0;
        thud.connect(tg); tg.connect(master);
        const start = ctx.currentTime + t;
        tg.gain.setValueAtTime(0, start);
        tg.gain.linearRampToValueAtTime(0.6, start + 0.1);
        tg.gain.exponentialRampToValueAtTime(0.001, start + 2.5);
        thud.start(start); thud.stop(start + 3);
        nodesRef.current.push(thud, tg);
      });

      master.gain.value = 1;
    }

    // ── Train rhythm ─────────────────────────────────────────────────────────
    else if (type === 'train-rhythm') {
      const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 50;
      const lfo = ctx.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 2;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 50;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 200;
      osc.connect(filt); filt.connect(master);
      master.gain.value = 0.05;
      osc.start(); lfo.start();
      nodesRef.current.push(osc, lfo, lfoGain, filt);
    }
  }, [getCtx, stopCurrent, makeBrownNoise, makeWhiteNoise]);

  const togglePlay = useCallback(() => {
    if (isPlaying) playSound('silence');
    else playSound(currentSound === 'silence' ? 'engine-hum' : currentSound);
  }, [isPlaying, currentSound, playSound]);

  useEffect(() => {
    return () => {
      stopCurrent();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [stopCurrent]);

  return { currentSound, isPlaying, playSound, togglePlay };
}
