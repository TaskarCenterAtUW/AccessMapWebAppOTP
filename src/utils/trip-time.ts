// Helpers for the times of a trip. OTP returns ISO 8601 timestamps with the
// offset of the trip's local time, e.g. 2024-05-01T08:15:00-07:00.

const pad = (n: number): string => String(Math.abs(n)).padStart(2, "0");

// Formats epoch milliseconds as ISO 8601 with the browser's local offset.
export const toOffsetDateTime = (epochMs: number): string => {
  const d = new Date(epochMs);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(offset % 60)}`
  );
};

// Formats the clock time of an ISO 8601 timestamp as it reads in the
// timestamp's own offset (the trip's local time), e.g. "8:15 AM".
export const formatTime = (isoDateTime: string): string => {
  if (!isoDateTime) return "";
  const match = /T(\d{2}):(\d{2})/.exec(isoDateTime);
  if (!match) return isoDateTime;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours < 12 ? "AM" : "PM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutes} ${suffix}`;
};

// Formats a duration in seconds as minutes / hours and minutes.
export const formatDuration = (seconds: number): string => {
  const minutes = Math.round((seconds || 0) / 60);
  if (minutes < 1) return "< 1 minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hr${rest === 0 ? "" : ` ${rest} min`}`;
};
