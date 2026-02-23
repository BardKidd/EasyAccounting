import { describe, it, expect } from 'vitest';
import {
  validatePdfFile,
  validateImageFiles,
} from '../../../../packages/shared/src/validation/fileValidation';

describe('fileValidation', () => {
  describe('validatePdfFile', () => {
    it('should pass for a valid PDF file within size limits', () => {
      const result = validatePdfFile({
        size: 5 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(result).toEqual({ valid: true });
    });

    it('should fail if type is not application/pdf', () => {
      const result = validatePdfFile({
        size: 5 * 1024 * 1024,
        type: 'image/jpeg',
      });
      expect(result).toEqual({ valid: false, error: '只允許上傳 PDF 檔案' });
    });

    it('should pass if type is undefined (backend may not have it) and size is valid', () => {
      const result = validatePdfFile({
        size: 5 * 1024 * 1024,
      });
      expect(result).toEqual({ valid: true });
    });

    it('should fail if size exceeds 10MB', () => {
      const result = validatePdfFile({
        size: 11 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(result).toEqual({ valid: false, error: '檔案大小不可超過 10MB' });
    });
  });

  describe('validateImageFiles', () => {
    it('should pass for valid image payloads', () => {
      const result = validateImageFiles([
        { size: 1024, type: 'image/jpeg' },
        { size: 2048, type: 'image/png' },
      ]);
      expect(result).toEqual({ valid: true });
    });

    it('should fail if exceeding maximum allowed pages (50)', () => {
      const hugeArray = new Array(51).fill({ size: 1024, type: 'image/jpeg' });
      const result = validateImageFiles(hugeArray);
      expect(result).toEqual({ valid: false, error: '最多僅支援 50 頁' });
    });

    it('should fail if any image exceeds 5MB size limit', () => {
      const result = validateImageFiles([
        { size: 1024, type: 'image/jpeg' },
        { size: 6 * 1024 * 1024, type: 'image/jpeg' },
      ]);
      expect(result).toEqual({ valid: false, error: '單頁圖片不可超過 5MB' });
    });
  });
});
