import { apiHandler, getErrorMessage } from '@/lib/utils';
import { ResponseHelper } from '@repo/shared';

export const exportData = async (type: string) => {
  try {
    const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '';
    const url = `${domain}/export/data?type=${type}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return await response.blob();
  } catch (err) {
    throw err;
  }
};

// Import logic
export const importData = async (type: string, file: File) => {
  try {
    const domain = process.env.NEXT_PUBLIC_API_DOMAIN || '';
    const url = `${domain}/import/data?type=${type}`;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    return await response.json();
  } catch (err) {
    throw err;
  }
};

export const importTransactions = async () => {
  throw new Error('Please use importData instead.');
};

export default {
  exportData,
  importTransactions,
  importData,
};
