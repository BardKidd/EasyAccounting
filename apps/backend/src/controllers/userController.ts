import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import User from '@/models/user';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { UserType } from '@repo/shared';
import userServices from '@/services/userServices';

const isUserDeleted = (user: UserType & { deletedAt: Date }) => {
  return !!user.deletedAt;
};

const getUsers = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const users = await User.findAll();
    let sortedUsers: UserType[] = [];
    if (users.length > 0) {
      sortedUsers = users
        .filter((user) => {
          const userJson = user.toJSON();
          return !isUserDeleted(userJson);
        })
        .map((userInstance) => {
          const userJson = userInstance.toJSON();
          return {
            name: userJson.name,
            email: userJson.email,
            emailNotification: userJson.emailNotification,
          };
        });
    }
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, sortedUsers, 'Get users successfully', null));
  });
};

const getUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return;
    const userJson = userInstance.toJSON();
    if (isUserDeleted(userJson)) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
      return;
    }
    const sortedUser: UserType = {
      name: userJson.name,
      email: userJson.email,
      emailNotification: userJson.emailNotification,
    };
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, sortedUser, 'Get user successfully', null));
  });
};

const addUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
      ...otherData,
      password: hashedPassword,
    });
    res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, null, 'User created successfully', null));
  });
};

const editUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return;
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    await userInstance.update({
      ...otherData,
      password: hashedPassword,
    });
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'User updated successfully', null));
  });
};

const deleteUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return;
    await userInstance.update({
      deletedAt: new Date(),
    });
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, 'User deleted successfully', null));
  });
};

export default {
  addUser,
  getUsers,
  getUser,
  editUser,
  deleteUser,
};
