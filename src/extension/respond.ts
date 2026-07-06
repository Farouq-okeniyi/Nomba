import { Response } from 'express';

export const respond = {
  ok: <T>(res: Response, data: T, message = 'Request successful') => {
    res.status(200).json({ status: 200, message, data });
  },

  created: <T>(res: Response, data: T, message = 'Resource created successfully') => {
    res.status(201).json({ status: 201, message, data });
  },
};
