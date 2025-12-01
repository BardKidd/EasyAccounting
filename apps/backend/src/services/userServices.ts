import { Request, Response } from 'express';
import User from '@/models/user';
import { StatusCodes } from 'http-status-codes';

const getUserFromDB = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({
      message: 'User not found',
    });
    return;
  }
  return user;
};

export default {
  getUserFromDB,
};
