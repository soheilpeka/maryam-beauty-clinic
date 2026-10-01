import type { Prisma } from "@prisma/client";

// Exact inherited demo identities, not owner-managed replacements. Keep the rows and
// historical bookings in admin, but never publish obsolete names or qualifications.
const legacyProfiles = [
  { slug: "maryam-k", name: "Maryam K.", role: "Founder & Master Aesthetician", avatarUrl: null },
  { slug: "amelie-r", name: "Amelie R.", role: "Lash Specialist", avatarUrl: null },
  { slug: "sofia-d", name: "Sofia D.", role: "Massage Therapist", avatarUrl: null },
  { slug: "nadia-b", name: "Nadia B.", role: "Skin Therapist", avatarUrl: null },
];

export const PUBLIC_STAFF_WHERE: Prisma.StaffWhereInput = { active: true, NOT: legacyProfiles };

export function isPublicStaff(staff: { active: boolean; slug: string; name: string; role: string | null; avatarUrl: string | null }): boolean {
  return staff.active && !legacyProfiles.some(profile => profile.slug === staff.slug && profile.name === staff.name && profile.role === staff.role && staff.avatarUrl === null);
}
