import NodeCache from "node-cache";

// Create a cache instance with a default TTL of 10 minutes
const cache = new NodeCache({ stdTTL: 600 });

export const CACHE_KEYS = {
  ALARMS: "alarms",
  TIMERS: "timers",
} as const;

export default cache;
