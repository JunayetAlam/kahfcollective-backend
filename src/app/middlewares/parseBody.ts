import { NextFunction, Request, Response } from 'express';

export const parseBody = (req: Request, res: Response, next: NextFunction) => {
  // console.log({body:req.body.data})
  console.log('object')
  if (req.body.data) {
    try {
      req.body = JSON.parse(req.body.data);
    } catch (error) {
      // Forward error to the global error handler
      return next(new Error('Invalid JSON format in data'));
    }
  }
  next();
};
