/**
 * قوانین اعتبارسنجی برای مسیرهای برنامه‌های تمرینی.
 * دلیل استفاده: جلوگیری از ورود داده‌های نامعتبر برای تمرین، برنامه و اختصاص آن.
 */
import { z } from "zod";

export const createExerciseSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام تمرین باید حداقل ۲ کاراکتر باشد.").max(100),
    description: z.string().optional(),
    muscleGroup: z.string().max(100).optional(),
  }),
});

export const createProgramSchema = z.object({
  body: z.object({
    name: z.string().min(2, "نام برنامه باید حداقل ۲ کاراکتر باشد.").max(150),
    description: z.string().optional(),
    isTemplate: z.boolean().optional(),
  }),
});

export const addDaySchema = z.object({
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6, "روز هفته باید بین ۰ تا ۶ باشد."),
    name: z.string().min(2, "نام روز باید حداقل ۲ کاراکتر باشد.").max(100),
  }),
});

export const addExerciseToDaySchema = z.object({
  body: z.object({
    exerciseId: z.string().uuid("شناسه تمرین معتبر نیست."),
    sets: z.number().int().min(1).max(20).optional(),
    reps: z.number().int().min(1).max(100).optional(),
    weight: z.number().min(0).optional(),
    restTime: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
  }),
});

export const assignProgramSchema = z.object({
  body: z.object({
    studentId: z.string().uuid("شناسه ورزشکار معتبر نیست."),
  }),
});
export const updateProgramExerciseSchema = z.object({
  body: z.object({
    sets: z.number().int().min(1).max(20).optional(),
    reps: z.number().int().min(1).max(100).optional(),
    weight: z.number().min(0).optional(),
    restTime: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
  }),
});

export const logExerciseSchema = z.object({
  body: z.object({
    programExerciseId: z.string().uuid("شناسه تمرین معتبر نیست."),
    actualSets: z.number().int().min(1),
    actualReps: z.number().int().min(1),
    actualWeight: z.number().min(0).optional(),
    notes: z.string().max(500).optional(),
  }),
});
export const updateProgramDaySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
  }),
});
export const updateProgramSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    description: z.string().optional(),
    isTemplate: z.boolean().optional(),
  }),
});
export const assignProgramBulkSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string().uuid("شناسه ورزشکار معتبر نیست.")).min(1, "حداقل یک ورزشکار باید انتخاب شود."),
  }),
});