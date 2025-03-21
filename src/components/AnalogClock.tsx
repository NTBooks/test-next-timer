"use client";

import { useEffect, useState } from "react";

const AnalogClock = () => {
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
    return <div className="w-64 h-64" />;
  }

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = ((hours + minutes / 60) / 12) * 360;

  return (
    <div className="w-64 h-64 relative">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Clock face */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200"
        />

        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 50 + 40 * Math.cos(angle);
          const y1 = 50 + 40 * Math.sin(angle);
          const x2 = 50 + 45 * Math.cos(angle);
          const y2 = 50 + 45 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-400"
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 25 * Math.cos((hourDegrees - 90) * (Math.PI / 180))}
          y2={50 + 25 * Math.sin((hourDegrees - 90) * (Math.PI / 180))}
          stroke="currentColor"
          strokeWidth="4"
          className="text-gray-800"
        />

        {/* Minute hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 35 * Math.cos((minuteDegrees - 90) * (Math.PI / 180))}
          y2={50 + 35 * Math.sin((minuteDegrees - 90) * (Math.PI / 180))}
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-600"
        />

        {/* Second hand */}
        <line
          x1="50"
          y1="50"
          x2={50 + 40 * Math.cos((secondDegrees - 90) * (Math.PI / 180))}
          y2={50 + 40 * Math.sin((secondDegrees - 90) * (Math.PI / 180))}
          stroke="currentColor"
          strokeWidth="1"
          className="text-red-500"
        />

        {/* Center dot */}
        <circle
          cx="50"
          cy="50"
          r="2"
          fill="currentColor"
          className="text-gray-800"
        />
      </svg>
    </div>
  );
};

export default AnalogClock;
