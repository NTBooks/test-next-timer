"use client";

import { useEffect, useRef, useState } from "react";

const ALARM_SOUNDS = [
  { value: "NickPowerHouse.mp3", label: "Nick Power House" },
  { value: "DolphinWavvves.mp3", label: "Dolphin Waves" },
  { value: "MuteCityFluff.mp3", label: "Mute City Fluff" },
  { value: "BeachBump.mp3", label: "Beach Bump" },
];

const Timer = () => {
  const [duration, setDuration] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState(ALARM_SOUNDS[0].value);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const patternTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (patternTimeoutRef.current) {
        clearTimeout(patternTimeoutRef.current);
      }
      stopAlarm();
    };
  }, []);

  const createAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  };

  const playAlarm = () => {
    setIsAlarmPlaying(true);
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        playFallbackAlarm();
      });
    } else {
      playFallbackAlarm();
    }
  };

  const playFallbackAlarm = () => {
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
  };

  const stopAlarm = () => {
    setIsAlarmPlaying(false);

    // Clear any pending timeouts
    if (patternTimeoutRef.current) {
      clearTimeout(patternTimeoutRef.current);
      patternTimeoutRef.current = null;
    }

    // Stop audio file if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseInt(duration);

    if (isNaN(seconds) || seconds <= 0) {
      return;
    }

    setIsActive(true);
    setTimeLeft(seconds);

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsActive(false);
          playAlarm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setTimeLeft(0);
    stopAlarm();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Seconds"
          min="1"
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isActive}
        />
        <select
          value={selectedSound}
          onChange={(e) => setSelectedSound(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isActive}>
          {ALARM_SOUNDS.map((sound) => (
            <option key={sound.value} value={sound.value}>
              {sound.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isActive}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
          Start Timer
        </button>
      </form>

      {isActive && (
        <div className="text-2xl font-bold">Time Left: {timeLeft}s</div>
      )}

      {isActive && (
        <button
          onClick={handleStop}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
          Stop Timer
        </button>
      )}

      {isAlarmPlaying && (
        <button
          onClick={stopAlarm}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
          Stop Alarm
        </button>
      )}

      <audio ref={audioRef} src={`/mp3/${selectedSound}`} loop preload="auto" />
    </div>
  );
};

export default Timer;
