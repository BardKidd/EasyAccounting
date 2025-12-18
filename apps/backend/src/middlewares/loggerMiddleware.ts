import { Request, Response, NextFunction } from 'express';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET':
      return colors.green;
    case 'POST':
      return colors.yellow;
    case 'PUT':
    case 'PATCH':
      return colors.magenta;
    case 'DELETE':
      return colors.red;
    default:
      return colors.reset;
  }
};

const getStatusColor = (status: number) => {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
};

const truncate = (obj: any, lines: number = 10) => {
  try {
    const str = JSON.stringify(obj, null, 2);
    const split = str.split('\n');
    if (split.length <= lines) return str;
    return (
      split.slice(0, lines).join('\n') +
      `\n${colors.dim}... (collapsed ${split.length - lines} lines)${colors.reset}`
    );
  } catch (e) {
    return String(obj);
  }
};

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, url, query, body } = req;

  console.log(
    `${colors.gray}[${new Date().toISOString()}]${colors.reset} ${colors.cyan}Incoming Request:${colors.reset}`
  );
  console.log(
    `${colors.bold}Method:${colors.reset} ${getMethodColor(method)}${method}${colors.reset}`
  );
  console.log(
    `${colors.bold}URL:${colors.reset} ${colors.bold}${colors.magenta}${url}${colors.reset}`
  );

  if (Object.keys(query).length > 0) {
    console.log(
      `${colors.bold}Query:${colors.reset}`,
      JSON.stringify(query, null, 2)
    );
  }

  if (body && Object.keys(body).length > 0) {
    console.log(`${colors.bold}Body:${colors.reset}`, truncate(body));
  }
  console.log(
    `${colors.gray}------------------------------------------------${colors.reset}`
  );

  // 攔截 res.json 來紀錄 Response Body (Optional, 但除錯很有用)
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - start;
    const durationColor =
      duration > 500
        ? colors.red
        : duration > 200
          ? colors.yellow
          : colors.green;

    console.log(
      `${colors.gray}[${new Date().toISOString()}]${colors.reset} ${colors.blue}Outgoing Response:${colors.reset}`
    );
    console.log(
      `${colors.bold}Status:${colors.reset} ${getStatusColor(res.statusCode)}${res.statusCode}${colors.reset}`
    );
    console.log(`${colors.bold}Body:${colors.reset}`, truncate(body));
    console.log(
      `${colors.bold}Duration:${colors.reset} ${durationColor}${duration}ms${colors.reset}`
    );
    console.log(
      `${colors.gray}================================================${colors.reset}\n`
    );
    return originalJson.call(this, body);
  };

  next();
};
