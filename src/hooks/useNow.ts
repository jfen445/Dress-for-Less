import { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { auckland } from "../../lib/utils/timezone";

// A clock that re-renders its caller, for gates that depend on the current time
// rather than on any state change — the booking cutoff, which lapses at 8pm
// while a cart may be sitting open and untouched.
//
// It also re-reads on focus and visibility, not just on the interval: browsers
// throttle timers in background tabs, and a laptop reopened hours later should
// be right the moment the customer looks at it rather than up to `intervalMs`
// late. The cutoff is a wall-clock minute boundary, so a minute is fine grained
// enough for the interval itself.
export default function useNow(intervalMs = 60_000): Dayjs {
  const [now, setNow] = useState<Dayjs>(() => auckland.now());

  useEffect(() => {
    const tick = () => setNow(auckland.now());

    const id = window.setInterval(tick, intervalMs);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);

  return now;
}
