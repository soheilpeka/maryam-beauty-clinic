import { describe, expect, it } from "vitest";
import { isPublicStaff } from "@/lib/public-staff";

describe("public team identity", () => {
  const obsolete = { active: true, slug: "maryam-k", name: "Maryam K.", role: "Founder & Master Aesthetician", avatarUrl: null };
  it("does not publish unchanged obsolete demo identities", () => {
    expect(isPublicStaff(obsolete)).toBe(false);
  });
  it("preserves owner replacements and rejects inactive profiles", () => {
    expect(isPublicStaff({ ...obsolete, name: "Owner-provided replacement" })).toBe(true);
    expect(isPublicStaff({ ...obsolete, role: "Owner-provided role" })).toBe(true);
    expect(isPublicStaff({ ...obsolete, active: false, name: "Owner-provided replacement" })).toBe(false);
  });
});
