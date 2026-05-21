import { z } from "zod";

export const interestResponseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),
  interestLevel: z.enum(["INTERESTED", "PENDING", "NOT_INTERESTED"]),
  guestCount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1, "Party size must be at least 1").max(20)
  ),
  rentalNeeds: z
    .enum(["NONE", "SKIS", "SNOWBOARD", "BOOTS", "FULL_PACKAGE"])
    .default("NONE"),
  skillLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .default("BEGINNER"),
  skiDays: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0, "Must be 0 or more").max(14)
  ),
  travelMode: z.enum(["DRIVING", "FLYING"]).default("DRIVING"),
  schoolYear: z
    .enum(["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR", "ALUM", "OTHER"])
    .default("FRESHMAN"),
  schoolYearOther: z.string().max(100).optional(),
  sleepingPreference: z.enum(["FLOOR", "BED"]).default("FLOOR"),
  comments: z.string().max(2000).optional(),
});

export type InterestResponseInput = z.infer<typeof interestResponseSchema>;

export const sendInvitesSchema = z.object({
  emails: z.string().min(1, "Enter at least one email address"),
  customMessage: z.string().max(1000).optional(),
});

export type SendInvitesInput = z.infer<typeof sendInvitesSchema>;
