import { apiHandler } from '@/lib/utils';
import { PersonnelNotificationSchema, ResponseHelper } from '@repo/shared';

export const getPersonnelNotification = async () => {
  try {
    const result = (await apiHandler(
      '/personnel-notification',
      'get',
      null
    )) as ResponseHelper<PersonnelNotificationSchema>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (error) {
    throw error;
  }
};

export const updatePersonnelNotification = async (
  payload: PersonnelNotificationSchema
) => {
  try {
    const result = (await apiHandler(
      '/personnel-notification',
      'put',
      payload
    )) as ResponseHelper<boolean>;
    if (result.isSuccess) {
      return result.data;
    }
    throw new Error(result.message);
  } catch (error) {
    throw error;
  }
};
