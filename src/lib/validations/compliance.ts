import { z } from 'zod';

export const PhilHealthRuleSchema = z.object({
  wageFloor: z.number()
    .min(0, "Wage floor cannot be negative.")
    .max(50000, "Wage floor exceeds realistic bounds."),
  wageCeiling: z.number()
    .min(10000, "Wage ceiling must be at least ₱10,000.")
    .max(500000, "Wage ceiling exceeds reasonable limits."),
  totalRatePercentage: z.number()
    .min(1, "Rate must be at least 1%.")
    .max(10, "Total rate cannot exceed 10% to prevent catastrophic deduction errors."),
  employeeSharePercentage: z.number()
    .min(0.5, "Employee share must be at least 0.5%.")
    .max(5, "Employee share cannot exceed 5%."),
}).refine((data) => data.wageFloor < data.wageCeiling, {
  message: "Wage floor must be strictly less than the wage ceiling.",
  path: ["wageFloor"],
}).refine((data) => data.employeeSharePercentage <= data.totalRatePercentage, {
  message: "Employee share cannot be greater than the total statutory rate.",
  path: ["employeeSharePercentage"],
});

export const PagibigRuleSchema = z.object({
  maxCompensation: z.number()
    .min(1000, "Maximum fund salary must be at least 1,000")
    .max(500000, "Maximum fund salary exceeds reasonable limits"),
  employeeShare: z.number()
    .min(10, "Deduction must be at least 10")
    .max(1000, "Deduction cannot exceed 1000 (Zod guardrail prevents fat fingers)"),
});
