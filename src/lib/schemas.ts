import { z } from "zod";

// Input payload
export const RawNoteInput = z.object({
  memberName: z.string().min(1),
  activityType: z.string().min(1),
  sessionDate: z.string().min(1),
  freeText: z.string().min(5),
  language: z.string().default("en"),
});

// New: Medication schema
export const MedicationEntry = z.object({
  name: z.string().nullable().optional(),
  dose: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

// Structured note
export const StructuredNote = z.object({
  memberName: z.string(),
  activityType: z.string(),
  sessionDate: z.string(),
  mood: z.string().optional(),
  promptsRequired: z.string().optional(),
  participation: z.string().optional(),
  summary: z.string(),
  followUps: z.array(z.string()).optional(),
  // New field:
  medications: z.array(MedicationEntry).optional(),
});

export type RawNoteInputType = z.infer<typeof RawNoteInput>;
export type MedicationEntryType = z.infer<typeof MedicationEntry>;
export type StructuredNoteType = z.infer<typeof StructuredNote>;