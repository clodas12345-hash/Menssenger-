export function parseLocalDatetimeString(datetimeStr: string): Date {
  if (!datetimeStr) return new Date(NaN);

  // If datetimeStr already includes Z or a explicit timezone offset like +00:00, use native Date
  if (datetimeStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(datetimeStr)) {
    const d = new Date(datetimeStr);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Parse YYYY-MM-DDThh:mm or YYYY-MM-DD hh:mm in user's local timezone
  const cleanStr = datetimeStr.trim().replace(' ', 'T');
  const [datePart, timePart] = cleanStr.split('T');
  if (!datePart) {
    return new Date(datetimeStr);
  }
  
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(datetimeStr);
  }

  let hour = 0;
  let min = 0;
  let sec = 0;

  if (timePart) {
    const timeTokens = timePart.split(':');
    if (!isNaN(Number(timeTokens[0]))) hour = Number(timeTokens[0]);
    if (!isNaN(Number(timeTokens[1]))) min = Number(timeTokens[1]);
    if (timeTokens.length > 2 && !isNaN(Number(timeTokens[2]))) sec = Number(timeTokens[2]);
  }
  
  return new Date(year, month - 1, day, hour, min, sec, 0);
}

export function toDatetimeLocal(isoStr: string): string {
  try {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function getTodayDateLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const MIN_SCHEDULE_HOUR = 9; // 09:00 AM
export const MAX_SCHEDULE_HOUR = 19; // 19:59 (7 PM)

export function isWithinBusinessHours(date: Date): boolean {
  if (isNaN(date.getTime())) return false;
  const h = date.getHours();
  return h >= 9 && h <= 19;
}

export function clampScheduleTimeString(timeStr: string): string {
  if (!timeStr) return '09:00';
  const parts = timeStr.split(':');
  let hh = parseInt(parts[0] || '9', 10);
  let mm = parseInt(parts[1] || '0', 10);

  if (isNaN(hh) || hh < MIN_SCHEDULE_HOUR || hh > MAX_SCHEDULE_HOUR) hh = isNaN(hh) ? MIN_SCHEDULE_HOUR : Math.max(MIN_SCHEDULE_HOUR, Math.min(MAX_SCHEDULE_HOUR, hh));
  if (isNaN(mm) || mm < 0 || mm > 59) mm = 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}`;
}

export function clampDateToBusinessHours(date: Date): Date {
  if (isNaN(date.getTime())) return new Date(NaN);
  return new Date(date.getTime());
}

export function advanceNextBusinessSlot(currentDate: Date, hourStep: number = 1): Date {
  const d = new Date(currentDate.getTime() + hourStep * 60 * 60 * 1000);
  // If hour falls in night time (20h to 08h), advance to 09:00 next day
  const h = d.getHours();
  if (h >= 20 || h < 9) {
    if (h >= 20) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(9, 0, 0, 0);
  }
  return d;
}


