import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap: Record<string, string> = {};
    errors.array().forEach(err => {
      const field = (err as any).path || (err as any).param || 'field';
      if (!errorMap[field]) errorMap[field] = err.msg;
    });
    res.status(422).json({ success: false, message: 'Validation failed', errors: errorMap });
    return;
  }
  next();
};
