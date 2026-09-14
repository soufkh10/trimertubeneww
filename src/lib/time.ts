const TIMESTAMP_REGEX =
  /^(?:(\d{1,2}):)?([0-5]?\d):([0-5]?\d)(?:\.(\d{1,3}))?$/;

export function parseTimestampToMs(value: string) {
  const input = value.trim();
  const match = TIMESTAMP_REGEX.exec(input);

  if (!match) {
    throw new Error("Use HH:MM:SS.mmm format.");
  }

  const [, hours = "0", minutes, seconds, milliseconds = "0"] = match;
  const normalizedMs = milliseconds.padEnd(3, "0").slice(0, 3);

  return (
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000 +
    Number(normalizedMs)
  );
}

export function formatMsToTimestamp(value: number) {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 3_600_000);
  const minutes = Math.floor((safeValue % 3_600_000) / 60_000);
  const seconds = Math.floor((safeValue % 60_000) / 1_000);
  const milliseconds = safeValue % 1_000;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":") + `.${String(milliseconds).padStart(3, "0")}`;
}

export function formatDuration(value: number) {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 3_600_000);
  const minutes = Math.floor((safeValue % 3_600_000) / 60_000);
  const seconds = Math.floor((safeValue % 60_000) / 1_000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
