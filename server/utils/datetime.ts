/**
 * Philippine timezone utilities (UTC+8)
 */

const PH_OFFSET_HOURS = 8;
const PH_OFFSET_MS = PH_OFFSET_HOURS * 60 * 60 * 1000;

/** Get current Philippine time as a Date object shifted to UTC+8 */
export function getPhilippineNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + PH_OFFSET_MS);
}

/** Convert a UTC Date to Philippine time */
export function toPhilippineTime(utcDate: Date): Date {
  return new Date(utcDate.getTime() + PH_OFFSET_MS);
}

/** Convert a Philippine time Date back to UTC */
export function toUTC(phDate: Date): Date {
  return new Date(phDate.getTime() - PH_OFFSET_MS);
}

/** Get today's date string in YYYY-MM-DD format (Philippine time) */
export function getTodayPH(): string {
  const ph = getPhilippineNow();
  return ph.toISOString().split("T")[0];
}

/** Format a date to Philippine locale string */
export function formatDatePH(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format time to Philippine locale string */
export function formatTimePH(date: Date): string {
  return date.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Parse a time string "HH:MM" to minutes since midnight */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Determine shift type based on clock-in hour */
export function detectShiftType(clockInHour: number): "day" | "night" {
  // Night shift: 22:00 - 05:59
  if (clockInHour >= 22 || clockInHour < 6) {
    return "night";
  }
  return "day";
}

/** Calculate minutes between two dates */
export function minutesBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

/** Calculate late minutes with grace period */
export function calculateLateMinutes(
  clockInTime: Date,
  shiftStartTime: string,
  graceMinutes: number = 15
): { lateMinutes: number; isDeductible: boolean } {
  const ph = toPhilippineTime(clockInTime);
  const clockInMinutes = ph.getUTCHours() * 60 + ph.getUTCMinutes();
  const shiftStartMinutes = parseTimeToMinutes(shiftStartTime);

  const lateMinutes = Math.max(0, clockInMinutes - shiftStartMinutes);

  return {
    lateMinutes,
    isDeductible: lateMinutes >= graceMinutes,
  };
}
