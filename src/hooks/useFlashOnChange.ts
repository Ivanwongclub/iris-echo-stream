import { useEffect, useRef, useState } from "react";

type Direction = "up" | "down" | null;

/**
 * Returns a CSS class to flash a cell green (up) or red/fuchsia (down)
 * whenever the numeric value changes.
 */
export function useFlashOnChange(value: number) {
  const prev = useRef(value);
  const [direction, setDirection] = useState<Direction>(null);

  useEffect(() => {
    if (value === prev.current) return;
    setDirection(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setDirection(null), 800);
    return () => clearTimeout(t);
  }, [value]);

  return direction === "up"
    ? "animate-flash-up"
    : direction === "down"
      ? "animate-flash-down"
      : "";
}
