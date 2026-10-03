import { expect, test } from "vitest";
import { parseScheduleDrafts, type WindowDraft } from "@/lib/admin-schedule";

const hours: WindowDraft = { id: "hours", dayOfWeek: 1, startInput: "09:00", endInput: "17:00", breaks: [
  { id: "first", startInput: "10:00", endInput: "10:15" },
  { id: "second", startInput: "12:00", endInput: "13:00" },
] };

test("preserves every existing break when submitting a schedule", () => {
  const result = parseScheduleDrafts([hours]);
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.windows[0].breaks).toEqual([{ startTime: 600, endTime: 615 }, { startTime: 720, endTime: 780 }]);
});
test("only fully empty rows are ignored; a missing end time is rejected", () => {
  expect(parseScheduleDrafts([{ ...hours, startInput: "", endInput: "", breaks: [] }])).toMatchObject({ success: true, data: { windows: [] } });
  expect(parseScheduleDrafts([{ ...hours, endInput: "" }]).success).toBe(false);
});
test("a half-filled break is rejected instead of silently disappearing", () => {
  expect(parseScheduleDrafts([{ ...hours, breaks: [{ ...hours.breaks[0], endInput: "" }] }]).success).toBe(false);
});
test("breaks without working hours and out-of-window breaks are rejected", () => {
  expect(parseScheduleDrafts([{ ...hours, startInput: "", endInput: "" }]).success).toBe(false);
  expect(parseScheduleDrafts([{ ...hours, breaks: [{ ...hours.breaks[0], startInput: "08:00" }] }]).success).toBe(false);
});
