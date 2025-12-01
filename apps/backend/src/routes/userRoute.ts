import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { createUserSchema } from '@repo/shared';
import userController from '@/controllers/userController';

const router: Router = express.Router();

router.post('/user', validate(createUserSchema), userController.addUser);
router.get('/user', userController.getUsers);
router.get('/user/:id', userController.getUser);
router.put('/user/:id', validate(createUserSchema), userController.editUser);
router.delete('/user/:id', userController.deleteUser);

export default router;
