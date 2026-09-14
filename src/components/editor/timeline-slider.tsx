"use client";

import { clamp } from "@/lib/time";

type TimelineSliderProps = {
  durationMs: number;
  startMs: number;
  endMs: number;
  onChange: (range: { startMs: number; endMs: number }) => void;
};

export function TimelineSlider({
  durationMs,
  startMs,
  endMs,
  onChange,
}: TimelineSliderProps) {
  if (durationMs <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative h-3 rounded-full bg-muted">
        <div
          className="absolute h-3 rounded-full bg-primary/30"
          style={{
            left: `${(startMs / durationMs) * 100}%`,
            width: `${((endMs - startMs) / durationMs) * 100}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={durationMs}
          step={100}
          value={startMs}
          onChange={(event) => {
            const nextStart = clamp(Number(event.target.value), 0, Math.max(endMs - 100, 0));
            onChange({ startMs: nextStart, endMs });
          }}
          aria-label="Start time slider"
          className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
        <input
          type="range"
          min={0}
          max={durationMs}
          step={100}
          value={endMs}
          onChange={(event) => {
            const nextEnd = clamp(Number(event.target.value), Math.min(startMs + 100, durationMs), durationMs);
            onChange({ startMs, endMs: nextEnd });
          }}
          aria-label="End time slider"
          className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
}
