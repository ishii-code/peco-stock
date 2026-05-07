"use client";

import { DEFAULT_CLINIC_ID } from "@/lib/clinic";

// Tiny hook so consumers don't reach into @/lib/clinic directly. Once auth
// lands, this becomes the seam where clinicId comes from the session.
export function useClinic(): { clinicId: string } {
  return { clinicId: DEFAULT_CLINIC_ID };
}
