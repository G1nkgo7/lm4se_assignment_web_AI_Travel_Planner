import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { generateItinerary } from "../services/itinerary-service";

export const itineraryRequestSchema = z.object({
  preferences: z.object({
    destination: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    days: z.number().min(1),
    budget: z.number().min(0),
    travelers: z.number().min(1),
    interests: z.array(z.string()).default([]),
    notes: z.string().optional()
  })
});

export const itineraryRouter = Router();

itineraryRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = itineraryRequestSchema.parse(req.body);
    const plan = await generateItinerary(payload.preferences);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});
