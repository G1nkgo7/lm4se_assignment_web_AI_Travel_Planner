import cors from "cors";
import express from "express";
import morgan from "morgan";
import pino from "pino";
import { config } from "./config";
import { itineraryRouter } from "./routes/itinerary";
import { expenseRouter } from "./routes/expenses";
import { healthRouter } from "./routes/health";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      ignore: "pid,hostname"
    }
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/health", healthRouter);
app.use("/api/itinerary", itineraryRouter);
app.use("/api/expenses", expenseRouter);

app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ message: "未找到对应接口", path: req.path });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ message: "服务器内部错误" });
});

app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});
