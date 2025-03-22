"use client";

import { useEffect, useState } from "react";

const DigitalClock = () => {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="font-mono text-4xl font-bold">
        <span className="text-white">00:00</span>
        <span className="text-gray-400">:00</span>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return (
      <div className="font-mono text-4xl font-bold">
        <span className="text-white">
          {hours}:{minutes}
        </span>
        <span className="text-gray-400">:{seconds}</span>
      </div>
    );
  };

  return formatTime(time);
};

export default DigitalClock;
