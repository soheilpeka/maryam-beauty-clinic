import { timeValueToMinutes } from "@/lib/admin-client";
import { scheduleSchema } from "@/lib/validation";

export interface BreakDraft { id: string; startInput: string; endInput: string }
export interface WindowDraft {
  id: string;
  dayOfWeek: number;
  startInput: string;
  endInput: string;
  breaks: BreakDraft[];
}

/** Only completely empty rows mean removal. Partial input must never delete saved hours. */
export function parseScheduleDrafts(drafts: WindowDraft[]) {
  return scheduleSchema.safeParse({ windows: drafts
    .filter(w => w.startInput || w.endInput || w.breaks.some(b => b.startInput || b.endInput))
    .map(w => ({
      dayOfWeek: w.dayOfWeek,
      startTime: timeValueToMinutes(w.startInput),
      endTime: timeValueToMinutes(w.endInput),
      breaks: w.breaks.filter(b => b.startInput || b.endInput).map(b => ({
        startTime: timeValueToMinutes(b.startInput), endTime: timeValueToMinutes(b.endInput),
      })),
    })),
  });
}
