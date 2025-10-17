import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

const expenseSchema = z.object({
  itineraryId: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().default("CNY"),
  note: z.string().optional()
});

export const expenseRouter = Router();

expenseRouter.post("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = expenseSchema.parse(req.body);
    // TODO: 保存开销记录到数据库
    res.status(201).json({ message: "已记录开销", expense });
  } catch (error) {
    next(error);
  }
});
