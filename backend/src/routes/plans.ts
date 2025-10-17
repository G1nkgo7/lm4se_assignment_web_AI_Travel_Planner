import { Router } from "express";
import type { NextFunction, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { itineraryPlanSchema } from "../services/itinerary-service";
import { createPlan, deletePlan, listPlans, updatePlan } from "../services/plan-service";
import { itineraryRequestSchema } from "./itinerary";

const router = Router();

const preferencesSchema = itineraryRequestSchema.shape.preferences;

const createPlanSchema = z.object({
  plan: itineraryPlanSchema,
  preferences: preferencesSchema
});

const updatePlanSchema = z.object({
  plan: itineraryPlanSchema.optional(),
  preferences: preferencesSchema.optional()
});

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await listPlans(req.auth!.userId);
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = createPlanSchema.parse(req.body);
    const plan = await createPlan(req.auth!.userId, payload.plan, payload.preferences);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { plan, preferences } = updatePlanSchema.parse(req.body);

    if (!plan || !preferences) {
      res.status(400).json({ message: "plan 与 preferences 不能为空" });
      return;
    }

    const updated = await updatePlan(req.auth!.userId, id, plan, preferences);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await deletePlan(req.auth!.userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const plansRouter = router;
