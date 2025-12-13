import { Request, Response, NextFunction } from 'express';

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, url, query, body } = req;

  console.log(`[${new Date().toISOString()}] Incoming Request:`);
  console.log(`Method: ${method}`);
  console.log(`URL: ${url}`);
  console.log('Query:', JSON.stringify(query, null, 2));
  if (body && Object.keys(body).length > 0) {
    console.log('Body:', JSON.stringify(body, null, 2));
  }
  console.log('------------------------------------------------');

  // 攔截 res.json 來紀錄 Response Body (Optional, 但除錯很有用)
  const originalJson = res.json;
  res.json = function (body) {
    console.log(`[${new Date().toISOString()}] Outgoing Response:`);
    console.log(`Status: ${res.statusCode}`);
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log(`Duration: ${Date.now() - start}ms`);
    console.log('================================================\n');
    return originalJson.call(this, body);
  };

  next();
};
