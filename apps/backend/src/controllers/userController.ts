import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import User from '@/models/user';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { UserType } from '@repo/shared';
import userServices from '@/services/userServices';

const getUsers = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const users = await User.findAll();
    let sortedUsers: UserType[] = [];
    if (users.length > 0) {
      sortedUsers = users.map((userInstance) => {
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
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    const userJson = userInstance.toJSON();
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
    User.create({
      ...otherData,
      password: hashedPassword,
    }).then(() => {
      res
        .status(StatusCodes.CREATED)
        .json(responseHelper(true, null, 'User created successfully', null));
    });
  });
};

const editUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    const { password, ...otherData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    userInstance
      .update({
        ...otherData,
        password: hashedPassword,
      })
      .then(() => {
        res
          .status(StatusCodes.OK)
          .json(responseHelper(true, null, 'User updated successfully', null));
      });
  });
};

const deleteUser = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(responseHelper(false, null, 'User not found', null));
    }
    userInstance.destroy().then(() => {
      res
        .status(StatusCodes.OK)
        .json(responseHelper(true, null, 'User deleted successfully', null));
    });
  });
};

export default {
  addUser,
  getUsers,
  getUser,
  editUser,
  deleteUser,
};
