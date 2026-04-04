import { z } from "zod";

// Treats empty string as undefined before coercing to number
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().min(1).optional()
);

const optionalMoney = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).optional()
);

const tripFieldsSchema = z.object({
  name: z.string().min(1, "Trip name is required").max(100),
  resort: z.string().min(1, "Resort name is required").max(100),
  state: z.string().max(50).optional(),
  country: z.string().max(50).default("US"),
  resortWebsite: z
    .string()
    .transform((val) => {
      if (!val) return val;
      return /^https?:\/\//i.test(val) ? val : `https://${val}`;
    })
    .pipe(z.string().url("Must be a valid URL").or(z.literal("")))
    .optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["PRIVATE", "LINK_ONLY", "PUBLIC"]).default("LINK_ONLY"),
  capacityMin: optionalInt,
  capacityMax: optionalInt,
  estimatedCostMin: optionalMoney,
  estimatedCostMax: optionalMoney,
  depositFloor: optionalMoney,
  depositBed: optionalMoney,
  costNotes: z.string().max(1000).optional(),
});

export const createTripSchema = tripFieldsSchema
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      !data.capacityMin ||
      !data.capacityMax ||
      data.capacityMax >= data.capacityMin,
    { message: "Max capacity must be >= min capacity", path: ["capacityMax"] }
  )
  .refine(
    (data) =>
      !data.estimatedCostMin ||
      !data.estimatedCostMax ||
      data.estimatedCostMax >= data.estimatedCostMin,
    { message: "Max cost must be >= min cost", path: ["estimatedCostMax"] }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = tripFieldsSchema
  .partial()
  .extend({
    tripInfo: z.string().max(10000).optional(),
    inviteDeadline: z.string().optional(),
    confirmDeadline: z.string().optional(),
    lodgingNotes: z.string().max(2000).optional(),
  });

export type UpdateTripInput = z.infer<typeof updateTripSchema>;
