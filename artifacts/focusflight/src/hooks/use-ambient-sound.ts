import { useState, useEffect, useRef, useCallback } from 'react';

export type SoundType = 'silence' | 'white-noise' | 'rain' | 'engine-hum' | 'train-rhythm';

export function useAmbientSound(initialSound: SoundType = 'silence') {
  const [currentSound, setCurrentSound] = useState<SoundType>(initialSound);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const stopCurrent = useCallback(() => {
    nodesRef.current.forEach(node => {
      try {
        if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
          node.stop();
        }
        node.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    nodesRef.current = [];
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Always resume context (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopCurrent();
    setCurrentSound(type);

    if (type === 'silence') {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    nodesRef.current.push(masterGain);

    if (type === 'white-noise') {
      // White noise generator
      const bufferSize = ctx.sampleRate * 2; // 2 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      masterGain.gain.value = 0.1; // Very soft
      
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      
      nodesRef.current.push(noise, filter);
    } 
    else if (type === 'engine-hum') {
      // Deep engine hum (Oscillators)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 80;
      
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 81.5; // slight detune for beating effect
      
      masterGain.gain.value = 0.15;
      
      osc1.connect(masterGain);
      osc2.connect(masterGain);
      osc1.start();
      osc2.start();
      
      nodesRef.current.push(osc1, osc2);
    }
    else if (type === 'rain') {
      // Brown noise (Rain approximation)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate for gain loss
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; // Muffled rain
      
      masterGain.gain.value = 0.4;
      
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      
      nodesRef.current.push(noise, filter);
    }
    else if (type === 'train-rhythm') {
      // Rhythmic bumps
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 50;
      
      const lfo = ctx.createOscillator();
      lfo.type = 'sawtooth';
      lfo.frequency.value = 2; // 2 beats per second
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 50;
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      masterGain.gain.value = 0.05;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      
      osc.connect(filter);
      filter.connect(masterGain);
      
      osc.start();
      lfo.start();
      nodesRef.current.push(osc, lfo, lfoGain, filter);
    }
  }, [stopCurrent]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      playSound('silence');
    } else {
      playSound(currentSound === 'silence' ? 'white-noise' : currentSound);
    }
  }, [isPlaying, currentSound, playSound]);

  // Cleanup on unmount
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
