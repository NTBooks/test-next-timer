"use client";

import { useEffect, useRef, useState } from "react";
import { useFallbackAlarm } from "@/app/modules/SoundUtils";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const ALARM_SOUNDS = [
  { value: "NickPowerHouse.mp3", label: "Nick Power House" },
  { value: "DolphinWavvves.mp3", label: "Dolphin Waves" },
  { value: "MuteCityFluff.mp3", label: "Mute City Fluff" },
  { value: "BeachBump.mp3", label: "Beach Bump" },
];

type Alarm = {
  id: string;
  name: string;
  dateTime: Date;
  sound: string;
};

const currentDateTimeStr = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getTimeUntilAlarm = (dateTime: Date, currentTime: Date) => {
  const diff = dateTime.getTime() - currentTime.getTime();

  if (diff <= 0) {
    return "Triggered";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString();
};

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const { playFallbackAlarm, stopFallbackAlarm } = useFallbackAlarm();

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

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource("/api/events");

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
        if (eventSource) {
          eventSource.close();
        }
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };
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
      name: "Timer",
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
    if (!newAlarmName || !newAlarmDateTime) return;

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      name: newAlarmName,
      dateTime: new Date(newAlarmDateTime),
      sound: newAlarmSound,
    };

    setAlarms((prev) => [...prev, newAlarm]);
    setNewAlarmName("Alarm");
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
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add timer");
      }

      const data = await response.json();
      console.log("Timer added:", data);

      // Force refresh the EventSource connection
      if (connectRef.current) {
        connectRef.current();
      }
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
      <div className="p-6 bg-gray-900 rounded-lg shadow-xl">
        <div className="space-y-6">
          <div className="text-center">
            <form
              onSubmit={handleSubmit}
              className="flex justify-center gap-4 mb-4">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Seconds"
                min="1"
                className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <select
                value={timerSound}
                onChange={(e) => setTimerSound(e.target.value)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="default">Default Sound</option>
                {ALARM_SOUNDS.map((sound) => (
                  <option key={sound.value} value={sound.value}>
                    {sound.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Start Timer
              </button>
            </form>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => startTimer(60)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                1 min
              </button>
              <button
                onClick={() => startTimer(300)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                5 min
              </button>
              <button
                onClick={() => startTimer(600)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                10 min
              </button>
            </div>
          </div>

          {(isAlarmPlaying ||
            activeAlarm ||
            alarms.some((a) => a.dateTime <= currentTime)) && (
            <div className="text-center">
              <button
                onClick={stopAlarm}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Stop Alarm
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Schedule Alarm</h3>
            <form onSubmit={handleAddAlarm} className="space-y-4">
              <input
                type="text"
                value={newAlarmName}
                onChange={(e) => setNewAlarmName(e.target.value)}
                placeholder="Alarm Name"
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-4">
                <input
                  type="datetime-local"
                  value={newAlarmDateTime}
                  onChange={(e) => setNewAlarmDateTime(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <select
                  value={newAlarmSound}
                  onChange={(e) => setNewAlarmSound(e.target.value)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  {ALARM_SOUNDS.map((sound) => (
                    <option key={sound.value} value={sound.value}>
                      {sound.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Schedule
                </button>
              </div>
            </form>

            {activeAlarm && (
              <div className="p-4 bg-indigo-900/50 rounded-lg">
                <h3 className="font-bold text-white">Active Alarm</h3>
                <p className="text-gray-300">Name: {activeAlarm.name}</p>
                <p className="text-gray-300">
                  Time: {formatDateTime(activeAlarm.dateTime)}
                </p>
                <p className="text-gray-300">
                  Sound:{" "}
                  {
                    ALARM_SOUNDS.find((s) => s.value === activeAlarm.sound)
                      ?.label
                  }
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
                      <div>
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
                      <div className="flex gap-2">
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
    </>
  );
};

export default Timer;
