import express, { Router } from 'express';
import { validate } from '@/middlewares/validate';
import {
  updateMerchantMappingSchema,
  merchantMappingIdParamSchema,
  listMerchantMappingsQuerySchema,
} from '@repo/shared';
import merchantMappingController from '@/controllers/merchantMappingController';
import { authMiddleware } from '@/middlewares/authMiddleware';

const router: Router = express.Router();

router.get(
  '/merchant-mappings',
  authMiddleware,
  validate(listMerchantMappingsQuerySchema, 'query'),
  merchantMappingController.listMerchantMappings,
);

router.put(
  '/merchant-mappings/:id',
  authMiddleware,
  validate(merchantMappingIdParamSchema, 'params'),
  validate(updateMerchantMappingSchema),
  merchantMappingController.updateMerchantMapping,
);

router.delete(
  '/merchant-mappings/:id',
  authMiddleware,
  validate(merchantMappingIdParamSchema, 'params'),
  merchantMappingController.deleteMerchantMapping,
);

export default router;
