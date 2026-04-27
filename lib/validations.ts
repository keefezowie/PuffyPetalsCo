import { z } from "zod";

export const pearlCalculatorSchema = z.object({
  sizeMm: z.coerce.number().positive("Pearl size must be greater than 0."),
  packPrice: z.coerce.number().nonnegative("Pack price cannot be negative."),
  packWeightGram: z.coerce
    .number()
    .positive("Pack weight must be greater than 0."),
  actualCountedPcsPerPack: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const bomLineSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  materialVariantId: z.string().min(1, "Material is required."),
  quantityRequired: z.coerce
    .number()
    .positive("Quantity must be greater than 0."),
  wastePercentage: z.coerce
    .number()
    .min(0, "Waste percentage cannot be less than 0."),
  optional: z.coerce.boolean().default(false),
  notes: z.string().optional(),
});

export const productionSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  quantityMade: z.coerce
    .number()
    .int()
    .positive("Production quantity must be greater than 0."),
  date: z.string().min(1, "Date is required."),
  notes: z.string().optional(),
});

export const purchaseLineSchema = z.object({
  materialVariantId: z.string().min(1, "Material is required."),
  quantityPurchased: z.coerce
    .number()
    .positive("Quantity purchased must be greater than 0."),
  totalPrice: z.coerce.number().nonnegative("Price cannot be negative."),
  quantityAddedUsageUnit: z.coerce
    .number()
    .positive("Quantity added to stock must be greater than 0."),
});

export const settingsSchema = z.object({
  targetMargin: z.coerce
    .number()
    .min(0, "Target margin must be between 0 and 1.")
    .lt(1, "Target margin must be between 0 and 1."),
  defaultPlatformFeeRate: z.coerce
    .number()
    .min(0, "Platform fee rate must be between 0 and 1.")
    .lt(1, "Platform fee rate must be between 0 and 1."),
  laborRatePerHour: z.coerce
    .number()
    .nonnegative("Labor rate cannot be negative."),
  allowNegativeStock: z.boolean(),
}).refine(
  (settings) => settings.targetMargin + settings.defaultPlatformFeeRate < 1,
  {
    message: "Target margin plus platform fee rate must be less than 1.",
    path: ["defaultPlatformFeeRate"],
  },
);
