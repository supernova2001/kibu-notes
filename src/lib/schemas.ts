import { z } from "zod";

export const RawNoteInput = z.object({
  memberName: z.string().min(1),
  activityType: z.string().min(1),
  sessionDate: z.string().min(1), 
  freeText: z.string().min(5),
  language: z.string().default("en"),
});

export const StructuredNote = z.object({
  memberName: z.string(),
  activityType: z.string(),
  sessionDate: z.string(),
  mood: z.string().optional(),           
  promptsRequired: z.string().optional(),
  participation: z.string().optional(),  
  summary: z.string(),                   
  followUps: z.array(z.string()).optional(),
});

export type RawNoteInputType = z.infer<typeof RawNoteInput>;
export type StructuredNoteType = z.infer<typeof StructuredNote>;