import { useState, useEffect } from "react";

const CLOCK_NAME_KEY = "clockName";

export const useClockName = () => {
  const [clockName, setClockName] = useState("My Clock");

  useEffect(() => {
    const savedName = localStorage.getItem(CLOCK_NAME_KEY);
    if (savedName) {
      setClockName(savedName);
    }
  }, []);

  const updateClockName = (newName: string) => {
    setClockName(newName);
    localStorage.setItem(CLOCK_NAME_KEY, newName);
  };

  return { clockName, updateClockName };
};
