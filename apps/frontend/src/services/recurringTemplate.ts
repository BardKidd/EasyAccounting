import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  RecurringTemplateType,
  CreateRecurringTemplateSchema,
  UpdateRecurringTemplateFutureSchema,
  CancelRecurringTemplateSchema,
} from '@repo/shared';

export const getRecurringTemplates = async () => {
  const result = (await apiHandler(
    '/recurring-templates',
    'get',
    null,
  )) as ResponseHelper<RecurringTemplateType[]>;
  if (result.isSuccess) return result.data;
  return [];
};

export const createRecurringTemplate = async (
  data: CreateRecurringTemplateSchema,
) => {
  const result = (await apiHandler(
    '/recurring-templates',
    'post',
    data,
  )) as ResponseHelper<RecurringTemplateType>;
  return result;
};

export const updateRecurringTemplateFuture = async (
  templateId: string,
  data: UpdateRecurringTemplateFutureSchema,
) => {
  const result = (await apiHandler(
    `/recurring-templates/${templateId}/future`,
    'put',
    data,
  )) as ResponseHelper<RecurringTemplateType>;
  return result;
};

export const cancelRecurringTemplate = async (
  templateId: string,
  data: CancelRecurringTemplateSchema,
) => {
  const result = (await apiHandler(
    `/recurring-templates/${templateId}/cancel`,
    'patch',
    data,
  )) as ResponseHelper<null>;
  return result;
};

export const archiveRecurringTemplate = async (templateId: string) => {
  const result = (await apiHandler(
    `/recurring-templates/${templateId}/archive`,
    'patch',
    null,
  )) as ResponseHelper<RecurringTemplateType>;
  return result;
};

export const resumeRecurringTemplate = async (templateId: string) => {
  const result = (await apiHandler(
    `/recurring-templates/${templateId}/resume`,
    'patch',
    null,
  )) as ResponseHelper<RecurringTemplateType>;
  return result;
};
