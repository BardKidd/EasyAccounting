import { Request, Response } from 'express';
import { simplifyTryCatch, responseHelper } from '@/utils/common';
import { StatusCodes } from 'http-status-codes';
import recurringTemplateService from '@/services/recurringTemplateService';

const getTemplates = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const templates = await recurringTemplateService.getTemplatesByUser(userId);
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, templates, '取得週期性交易規則成功', null));
  });
};

const createTemplate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const template = await recurringTemplateService.createTemplate(
      req.body,
      userId,
    );
    return res
      .status(StatusCodes.CREATED)
      .json(responseHelper(true, template, '週期性交易規則已建立', null));
  });
};

const updateTemplateFuture = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const templateId = req.params.id as string;
    const template =
      await recurringTemplateService.updateTemplateFutureAndTransaction(
        templateId,
        userId,
        req.body,
      );
    return res
      .status(StatusCodes.OK)
      .json(
        responseHelper(
          true,
          template,
          '週期性交易規則已更新（此筆及未來）',
          null,
        ),
      );
  });
};

const cancelTemplate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const templateId = req.params.id as string;
    const { transactionId } = req.body;
    await recurringTemplateService.cancelTemplateAndDeleteTransaction(
      templateId,
      userId,
      transactionId,
    );
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '週期性交易規則已取消', null));
  });
};

const archiveTemplate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const templateId = req.params.id as string;
    const template = await recurringTemplateService.archiveTemplate(
      templateId,
      userId,
    );
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, template, '週期性交易規則已暫停', null));
  });
};

const resumeTemplate = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const { userId } = req.user;
    const templateId = req.params.id as string;
    const template = await recurringTemplateService.resumeTemplate(
      templateId,
      userId,
    );
    return res
      .status(StatusCodes.OK)
      .json(responseHelper(true, template, '週期性交易規則已恢復', null));
  });
};

export default {
  getTemplates,
  createTemplate,
  updateTemplateFuture,
  cancelTemplate,
  archiveTemplate,
  resumeTemplate,
};
