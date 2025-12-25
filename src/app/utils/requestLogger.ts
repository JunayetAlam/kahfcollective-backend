import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log('====================================');
  console.log(`➡️  API Hit: ${req.method} ${req.originalUrl}`);
  //   console.log("📌 Query:", req.query);
  //   console.log("📌 Params:", req.params);
  //   console.log("📦 Body:", req.body);
  //   console.log("⏱️ Time:", new Date().toISOString());
  //   console.log("====================================\n");

  next();
};
