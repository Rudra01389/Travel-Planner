import { z } from "zod";
export const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "THB",
  "NZD",
];
export const currency = z.enum(CURRENCIES);
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address");
export const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Password is too long")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Password must fit within 72 bytes",
  )
  .refine(
    (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v),
    "Include uppercase, lowercase, and a number",
  );
export const registration = z.object({
  email,
  password,
  name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters for your name")
    .max(80)
    .refine(
      (v) => Array.from(v).every((c) => c.charCodeAt(0) >= 32),
      "Name contains invalid characters",
    ),
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});
export const verification = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Enter a valid calendar date",
  );
export const timeZone = z
  .string()
  .max(80)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid time zone");
export function today(zone = "UTC") {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((k) => p.find((x) => x.type === k).value)
    .join("-");
}
export const location = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  name: z.string().trim().min(1).max(200),
  country: z.string().max(100).optional(),
});
export const tripSchema = z
  .object({
    destination: z.string().trim().min(2).max(120),
    startDate: date,
    endDate: date,
    travellers: z.coerce.number().int().min(1).max(100),
    budget: z.coerce.number().positive().max(1e9),
    currency: currency.default("INR"),
    timeZone: timeZone.default("UTC"),
    location: location.optional(),
    preferences: z.array(z.string().trim().min(1).max(150)).max(10).default([]),
  })
  .refine(
    (v) =>
      !timeZone.safeParse(v.timeZone).success ||
      v.startDate >= today(v.timeZone),
    "New trips cannot start in the past",
  )
  .refine(
    (v) =>
      v.currency === "JPY"
        ? Number.isInteger(v.budget)
        : Math.abs(v.budget * 100 - Math.round(v.budget * 100)) < 1e-5,
    "Use valid decimal places for the budget currency",
  )
  .refine(
    (v) =>
      v.endDate >= v.startDate &&
      (Date.parse(v.endDate) - Date.parse(v.startDate)) / 86400000 <= 60,
    "End date must be on or after the start, within 60 days",
  );
export const expenseSchema = z.object({
  date,
  description: z.string().trim().min(1).max(200),
  category: z.enum([
    "Stay",
    "Food",
    "Transport",
    "Experiences",
    "Miscellaneous",
  ]),
  amount: z.coerce.number().positive().max(1e9),
  currency: currency.optional(),
  paidBy: z.string().max(50).optional(),
  splitBetween: z.array(z.string().max(50)).min(1).max(100).optional(),
});
export const activitySchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(1000).default(""),
  location: location.optional(),
});
export const itinerarySchema = z
  .object({
    revision: z.number().int().nonnegative(),
    days: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          label: z.string().max(100),
          title: z.string().trim().min(1).max(200),
          activities: z.array(activitySchema).max(30),
        }),
      )
      .min(1)
      .max(61),
  })
  .refine(
    (v) =>
      new Set(v.days.map((d) => d.id)).size === v.days.length &&
      new Set(v.days.flatMap((d) => d.activities.map((a) => a.id))).size ===
        v.days.flatMap((d) => d.activities).length,
    "Day and activity IDs must be unique",
  );
export const profileSchema = z.object({
  name: registration.shape.name,
  currency: currency,
  preferences: z.array(z.string().trim().min(1).max(150)).max(10),
  timeZone,
});
export const packingSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          label: z.string().trim().min(1).max(120),
          checked: z.boolean(),
        }),
      )
      .max(100),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.id)).size === v.items.length,
    "Packing item IDs must be unique",
  );
