import { useRef, useEffect, useCallback } from "react";

export const useFallbackAlarm = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const patternTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContext: typeof window.AudioContext | undefined =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof window.AudioContext;
          }
        ).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playFallbackAlarm = useCallback(() => {
    try {
      const audioContext = createAudioContext();

      // Create oscillator
      oscillatorRef.current = audioContext.createOscillator();
      gainNodeRef.current = audioContext.createGain();

      // Connect nodes
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContext.destination);

      // Configure sound
      oscillatorRef.current.type = "sine";
      oscillatorRef.current.frequency.setValueAtTime(
        440,
        audioContext.currentTime
      );
      gainNodeRef.current.gain.setValueAtTime(0.3, audioContext.currentTime);

      // Start sound
      oscillatorRef.current.start();

      // Create a repeating pattern
      const repeatInterval = 1000; // 1 second
      const fadeOutTime = 0.5; // 0.5 seconds

      const playPattern = () => {
        if (!oscillatorRef.current || !gainNodeRef.current) return;

        const now = audioContext.currentTime;
        gainNodeRef.current.gain.setValueAtTime(0.3, now);
        gainNodeRef.current.gain.exponentialRampToValueAtTime(
          0.01,
          now + fadeOutTime
        );

        patternTimeoutRef.current = setTimeout(playPattern, repeatInterval);
      };

      playPattern();
    } catch (error) {
      console.error("Error playing fallback alarm:", error);
    }
  }, [createAudioContext]);

  const stopFallbackAlarm = useCallback(() => {
    // Clear any pending timeouts
    if (patternTimeoutRef.current) {
      clearTimeout(patternTimeoutRef.current);
      patternTimeoutRef.current = null;
    }

    // Stop oscillator if playing
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current = null;
    }

    // Close and reset audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup function to stop alarm when component unmounts
    return () => {
      stopFallbackAlarm();
    };
  }, [stopFallbackAlarm]);

  return { playFallbackAlarm, stopFallbackAlarm };
};
