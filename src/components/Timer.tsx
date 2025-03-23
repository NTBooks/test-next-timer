"use client";

import { useEffect, useRef, useState } from "react";
import { useFallbackAlarm } from "@/app/modules/SoundUtils";
import { ALARM_SOUNDS } from "@/lib/constants";
import {
  currentDateTimeStr,
  getTimeUntilAlarm,
  formatDateTime,
} from "@/lib/dateUtils";
import { SlidingPanel } from "./SlidingPanel";
import { useClockName } from "@/app/modules/useClockName";
import Clock from "./Clock";
import DigitalClock from "./DigitalClock";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

type Alarm = {
  id: string;
  name: string;
  dateTime: Date;
  sound: string;
};

type ConnectionStatus = "connected" | "disconnected" | "connecting";

const Timer = () => {
  const [duration, setDuration] = useState("");
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState(ALARM_SOUNDS[0].value);
  const [timerSound, setTimerSound] = useState("default");
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [newAlarmName, setNewAlarmName] = useState("");
  const [newAlarmDateTime, setNewAlarmDateTime] = useState(
    currentDateTimeStr()
  );
  const [newAlarmSound, setNewAlarmSound] = useState(ALARM_SOUNDS[0].value);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const { playFallbackAlarm, stopFallbackAlarm } = useFallbackAlarm();
  const { clockName, updateClockName } = useClockName();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  useEffect(() => {
    if (activeAlarm) {
      document.body.classList.add("alarm-active");
    } else {
      document.body.classList.remove("alarm-active");
    }
  }, [activeAlarm]);

  useEffect(() => {
    const audioRefCache = audioRef.current;

    console.log("isAlarmPlaying", isAlarmPlaying);

    if (isAlarmPlaying) {
      console.log("Playing alarm with sound:", selectedSound);

      // Ensure audio element exists and has the correct source
      if (selectedSound !== "default" && audioRef.current) {
        audioRef.current.src = `/mp3/${selectedSound}`;
        console.log("Playing audio file:", `/mp3/${selectedSound}`);
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          playFallbackAlarm();
        });
      } else {
        console.log("No audio element found, playing fallback");
        playFallbackAlarm();
      }
    } else {
      stopFallbackAlarm();
      if (audioRef.current) {
        console.log("Pausing audio");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      stopFallbackAlarm();
      if (audioRefCache) {
        audioRefCache.pause();
        audioRefCache.currentTime = 0;
      }
    };
  }, [
    isAlarmPlaying,
    selectedSound,
    activeAlarm,
    playFallbackAlarm,
    stopFallbackAlarm,
  ]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let connectionCheckTimeout: NodeJS.Timeout;

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      setConnectionStatus("connecting");
      eventSource = new EventSource("/api/events");

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setConnectionStatus("connected");
        // Clear any existing connection check timeout
        if (connectionCheckTimeout) {
          clearTimeout(connectionCheckTimeout);
        }
      };

      eventSource.onmessage = (event) => {
        console.log("Event received:", event);
        const data = JSON.parse(event.data);
        console.log("Parsed data:", data);

        if (data.type === "NEW_TIMER") {
          const newAlarm: Alarm = {
            id: data.timer.id,
            name: data.timer.name,
            dateTime: new Date(data.timer.endTime),
            sound: "default",
          };
          setAlarms((prev) => [...prev, newAlarm]);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        setConnectionStatus("disconnected");
        if (eventSource) {
          eventSource.close();
        }
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      // Set a timeout to check connection status after 5 seconds
      connectionCheckTimeout = setTimeout(() => {
        if (
          connectionStatus === "connecting" ||
          connectionStatus === "disconnected"
        ) {
          console.log("Connection check timeout - forcing reconnect");
          if (eventSource) {
            eventSource.close();
          }
          connect();
        }
      }, 5000);
    };

    connectRef.current = connect;
    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (connectionCheckTimeout) {
        clearTimeout(connectionCheckTimeout);
      }
    };
  }, []);

  useEffect(() => {
    // Update current time every second
    const timeInterval = setInterval(() => {
      const time = new Date();
      setCurrentTime(time);

      alarms.forEach((alarm) => {
        if (alarm.dateTime.getTime() <= time.getTime() + 1000) {
          setActiveAlarm(alarm);
          setSelectedSound(alarm.sound);
          setIsAlarmPlaying(true);
        }
      });
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, [alarms]); // Empty dependency array since we only want this to run once on mount

  const stopAlarm = () => {
    setActiveAlarm(null);
    setIsAlarmPlaying(false);

    stopFallbackAlarm();

    // Remove triggered alarms from the history
    setAlarms((prev) => prev.filter((alarm) => alarm.dateTime > currentTime));
  };

  const startTimer = (seconds: number) => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + seconds * 1000);

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      name: duration ? `Timer (${duration}s)` : `Timer (${seconds}s)`,
      dateTime: futureTime,
      sound: timerSound,
    };

    console.log("New alarm:", newAlarm);

    setAlarms((prev) => [...prev, newAlarm]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseInt(duration);

    if (isNaN(seconds) || seconds <= 0) {
      return;
    }

    startTimer(seconds);
    setDuration("");
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmDateTime) return;

    const defaultName = `Alarm ${formatDateTime(new Date(newAlarmDateTime))}`;
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      name: newAlarmName || defaultName,
      dateTime: new Date(newAlarmDateTime),
      sound: newAlarmSound,
    };

    setAlarms((prev) => [...prev, newAlarm]);
    setNewAlarmName("");
    setNewAlarmDateTime("");
    setNewAlarmSound(ALARM_SOUNDS[0].value);
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
    if (activeAlarm?.id === id) {
      stopAlarm();
    }
  };

  const handleEditAlarm = (alarm: Alarm) => {
    setNewAlarmName(alarm.name);
    setNewAlarmDateTime(currentDateTimeStr(alarm.dateTime));
    setNewAlarmSound(alarm.sound);
    if (activeAlarm?.id === alarm.id) {
      stopAlarm();
    }
    handleDeleteAlarm(alarm.id);
  };

  const testAddTimer = async () => {
    try {
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Timer",
          duration: 60,
          sound: "beep",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add timer");
      }

      const data = await response.json();
      console.log("Timer added:", data);
    } catch (error) {
      console.error("Error adding timer:", error);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0% {
            background-color: rgb(17, 24, 39);
          }
          50% {
            background-color: rgb(127, 29, 29);
          }
          100% {
            background-color: rgb(17, 24, 39);
          }
        }
        body {
          transition: background-color 0.5s ease;
        }
        body.alarm-active {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Settings Button */}
      <button
        onClick={() => setIsPanelOpen(true)}
        className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white p-3 rounded-l-lg shadow-lg hover:bg-gray-800 transition-colors z-30">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Sliding Panel */}
      <SlidingPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
        <div className="space-y-6">
          {/* Clock Name Setting */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Clock Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="clockName"
                  className="block text-sm font-medium text-gray-300 mb-1">
                  Clock Name
                </label>
                <input
                  id="clockName"
                  type="text"
                  value={clockName}
                  onChange={(e) => updateClockName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter clock name"
                />
              </div>
            </div>
          </div>

          {/* Timer Form */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Timer
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Seconds"
                min="1"
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={timerSound}
                onChange={(e) => setTimerSound(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="default">Default Sound</option>
                {ALARM_SOUNDS.map((sound) => (
                  <option key={sound.value} value={sound.value}>
                    {sound.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Start Timer
              </button>
            </form>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => startTimer(60)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                1 min
              </button>
              <button
                onClick={() => startTimer(300)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                5 min
              </button>
              <button
                onClick={() => startTimer(600)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                10 min
              </button>
            </div>
          </div>

          {/* Alarm Form */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Schedule Alarm
            </h3>
            <form onSubmit={handleAddAlarm} className="space-y-4">
              <input
                type="text"
                value={newAlarmName}
                onChange={(e) => setNewAlarmName(e.target.value)}
                placeholder="Alarm Name"
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="datetime-local"
                value={newAlarmDateTime}
                onChange={(e) => setNewAlarmDateTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={newAlarmSound}
                onChange={(e) => setNewAlarmSound(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                {ALARM_SOUNDS.map((sound) => (
                  <option key={sound.value} value={sound.value}>
                    {sound.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Schedule
              </button>
            </form>
          </div>
        </div>
      </SlidingPanel>

      <div
        className="flex flex-col items-center justify-center gap-4"
        onClick={() => {
          if (
            isAlarmPlaying ||
            activeAlarm ||
            alarms.some((a) => a.dateTime <= currentTime)
          ) {
            stopAlarm();
          }
        }}>
        <Clock />
        <DigitalClock />
      </div>

      {/* Main Content */}
      <div className="p-6 bg-gray-900 rounded-lg shadow-xl cursor-pointer max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white text-center">
            {clockName}
          </h1>

          {(isAlarmPlaying ||
            activeAlarm ||
            alarms.some((a) => a.dateTime <= currentTime)) && (
            <div className="text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopAlarm();
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Stop Alarm
              </button>
            </div>
          )}

          {activeAlarm && (
            <div className="p-4 bg-indigo-900/50 rounded-lg">
              <h3 className="font-bold text-white">Active Alarm</h3>
              <p className="text-gray-300">Name: {activeAlarm.name}</p>
              <p className="text-gray-300">
                Time: {formatDateTime(activeAlarm.dateTime)}
              </p>
              <p className="text-gray-300">
                Sound:{" "}
                {ALARM_SOUNDS.find((s) => s.value === activeAlarm.sound)?.label}
              </p>
            </div>
          )}

          {alarms.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Scheduled Alarms
              </h3>
              <ul className="space-y-2">
                {alarms.map((alarm) => (
                  <li
                    key={alarm.id}
                    className="flex justify-between items-center p-3 bg-gray-800 text-white rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{alarm.name}</h4>
                      <p className="text-sm text-gray-400">
                        {formatDateTime(alarm.dateTime)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {
                          ALARM_SOUNDS.find((s) => s.value === alarm.sound)
                            ?.label
                        }
                      </p>
                      <p
                        className={`text-sm ${
                          alarm.dateTime > currentTime
                            ? "text-green-400"
                            : "text-red-400"
                        }`}>
                        {alarm.dateTime > currentTime
                          ? getTimeUntilAlarm(alarm.dateTime, currentTime)
                          : "Triggered"}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditAlarm(alarm)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAlarm(alarm.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <audio ref={audioRef} src={`/mp3/${selectedSound}`} loop preload="auto" />
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Alarms</h2>
        <button
          onClick={testAddTimer}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">
          Test Add Timer
        </button>
      </div>

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`w-4 h-4 rounded-full ${
            connectionStatus === "connected"
              ? "bg-green-500"
              : connectionStatus === "connecting"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          title={`Connection Status: ${connectionStatus}`}
        />
      </div>
    </>
  );
};

export default Timer;
