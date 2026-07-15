import type { Booking, MaintenanceSlot } from "@/data/seed";

/**
 * Checks if two time ranges overlap
 */
export function timeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Checks if a booking conflicts with existing bookings for a specific court
 */
export function hasBookingConflict(
  bookings: Booking[],
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): boolean {
  const startMins = timeToMins(startTime);
  const endMins = timeToMins(endTime);

  return bookings.some((b) => {
    // Skip cancelled bookings
    if (b.status === "cancelled") return false;
    
    // Skip the booking being edited
    if (excludeBookingId && b.id === excludeBookingId) return false;
    
    // Must be the same court
    if (b.courtId !== courtId) return false;
    
    // Must be the same date
    if (b.date !== date) return false;
    
    // Check time overlap
    const bookingStart = timeToMins(b.startTime);
    const bookingEnd = timeToMins(b.endTime);
    
    return timeRangesOverlap(startMins, endMins, bookingStart, bookingEnd);
  });
}

/**
 * Checks if a time slot conflicts with maintenance for a specific court
 */
export function hasMaintenanceConflict(
  maintenanceSlots: MaintenanceSlot[],
  courtId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  const startMins = timeToMins(startTime);
  const endMins = timeToMins(endTime);

  return maintenanceSlots.some((m) => {
    // Must be the same court
    if (m.courtId !== courtId) return false;
    
    // Must be the same date
    if (m.date !== date) return false;
    
    // Check time overlap
    const maintStart = timeToMins(m.startTime);
    const maintEnd = timeToMins(m.endTime);
    
    return timeRangesOverlap(startMins, endMins, maintStart, maintEnd);
  });
}

/**
 * Gets all busy time ranges for a specific court on a specific date
 */
export function getBusyRangesForCourt(
  bookings: Booking[],
  maintenanceSlots: MaintenanceSlot[],
  courtId: string,
  date: string,
  excludeBookingId?: string
): { start: number; end: number }[] {
  const busyRanges: { start: number; end: number }[] = [];

  // Add bookings for this court only
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.courtId !== courtId) continue;
    if (b.date !== date) continue;
    
    busyRanges.push({
      start: timeToMins(b.startTime),
      end: timeToMins(b.endTime),
    });
  }

  // Add maintenance for this court only
  for (const m of maintenanceSlots) {
    if (m.courtId !== courtId) continue;
    if (m.date !== date) continue;
    
    busyRanges.push({
      start: timeToMins(m.startTime),
      end: timeToMins(m.endTime),
    });
  }

  // Sort by start time
  busyRanges.sort((a, b) => a.start - b.start);

  // Merge overlapping ranges
  const merged: { start: number; end: number }[] = [];
  for (const r of busyRanges) {
    if (merged.length === 0 || r.start > merged[merged.length - 1].end) {
      merged.push({ ...r });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    }
  }

  return merged;
}

/**
 * Gets available time slots for a specific court on a specific date
 */
export function getAvailableSlotsForCourt(
  bookings: Booking[],
  maintenanceSlots: MaintenanceSlot[],
  courtId: string,
  date: string,
  allSlots: string[],
  excludeBookingId?: string
): string[] {
  const busyRanges = getBusyRangesForCourt(bookings, maintenanceSlots, courtId, date, excludeBookingId);
  
  return allSlots.filter((slot) => {
    const slotStart = timeToMins(slot);
    const minEnd = slotStart + 60; // minimum 1 hour
    
    // Check if the full 1-hour block is free
    for (let m = slotStart; m < minEnd; m += 30) {
      const blockEnd = m + 30;
      if (busyRanges.some((r) => m < r.end && blockEnd > r.start)) {
        return false;
      }
    }
    return true;
  });
}

// Helper functions
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minsToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}