import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";
import path from 'path';
import { StripeWebHook } from "./app/utils/StripeUtils";
import { html } from "./htmldesign";
const app: Application = express();
import cron from "node-cron";
import { UserServices } from "./app/modules/User/user.service";
app.post(
  "/api/v1/payments/webhooks",
  express.raw({ type: "application/json" }),
  StripeWebHook
);

app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "http://saifghori.code-commando.com",
      "http://206.162.244.139:3005",
    ],
    credentials: true,
  })
);

//parser
app.use(express.json());
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send(html('Kahf Collective (Server)'));
});

app.use("/api/v1", router);
cron.schedule("0 0 * * *", () => {
  UserServices.expireUserMonthlySubscription();
});
app.use(globalErrorHandler);
app.use('/upload', express.static(path.join(__dirname, 'app', 'upload')));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
