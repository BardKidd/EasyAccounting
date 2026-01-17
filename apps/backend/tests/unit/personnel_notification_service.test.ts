import { describe, it, expect, vi, beforeEach } from 'vitest';
import personnelNotificationServices from '@/services/personnelNotificationServices'; // Default import
import PersonnelNotification from '@/models/personnel_notification';

// Mock the model
vi.mock('@/models/personnel_notification', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Personnel Notification Services', () => {
  const mockUserId = 'user-123';
  const mockPayload = {
    isDailyNotification: true,
    isWeeklySummaryNotification: false,
    isMonthlyAnalysisNotification: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('postPersonnelNotification', () => {
    it('should create notification settings successfully', async () => {
      // Setup mock
      (PersonnelNotification.create as any).mockResolvedValue({
        id: '1',
        ...mockPayload,
      });

      const result =
        await personnelNotificationServices.postPersonnelNotification(
          mockUserId,
          mockPayload
        );

      expect(result).toBe(true);
      expect(PersonnelNotification.create).toHaveBeenCalledWith({
        userId: mockUserId,
        dailyReminder: mockPayload.isDailyNotification,
        weeklySummaryNotice: mockPayload.isWeeklySummaryNotification,
        monthlyAnalysisNotice: mockPayload.isMonthlyAnalysisNotification,
      });
    });

    it('should throw error if userId is missing', async () => {
      await expect(
        personnelNotificationServices.postPersonnelNotification(
          null,
          mockPayload
        )
      ).rejects.toThrow('User ID is required');
    });

    it('should throw error if creation fails', async () => {
      (PersonnelNotification.create as any).mockResolvedValue(null);

      await expect(
        personnelNotificationServices.postPersonnelNotification(
          mockUserId,
          mockPayload
        )
      ).rejects.toThrow('Register personnel notification failed');
    });
  });

  describe('getPersonnelNotification', () => {
    it('should retrieve notification settings successfully', async () => {
      (PersonnelNotification.findOne as any).mockResolvedValue({
        dailyReminder: true,
        weeklySummaryNotice: false,
        monthlyAnalysisNotice: true,
      });

      const result =
        await personnelNotificationServices.getPersonnelNotification(
          mockUserId
        );

      expect(result).toEqual({
        isDailyNotification: true,
        isWeeklySummaryNotification: false,
        isMonthlyAnalysisNotification: true,
      });
      expect(PersonnelNotification.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        attributes: expect.any(Array),
      });
    });

    it('should throw error if settings not found', async () => {
      (PersonnelNotification.findOne as any).mockResolvedValue(null);

      await expect(
        personnelNotificationServices.getPersonnelNotification(mockUserId)
      ).rejects.toThrow('Get personnel notification failed');
    });
  });

  describe('putPersonnelNotification', () => {
    it('should update notification settings successfully', async () => {
      // update usually returns [affectedCount] but implementation checks truthiness of result
      // "const result = await PersonnelNotification.update(...); if (!result) ..."
      // Sequelize update returns [affectedCount]. If 0, it's still an array (truthy).
      // Wait, let's check strict checking.
      // If code assumes `result` is truthy, `[0]` is truthy.
      // The implementation: `if (!result) throw ...`
      (PersonnelNotification.update as any).mockResolvedValue([1]);

      const result =
        await personnelNotificationServices.putPersonnelNotification(
          mockUserId,
          mockPayload
        );

      expect(result).toBe(true);
      expect(PersonnelNotification.update).toHaveBeenCalledWith(
        {
          dailyReminder: mockPayload.isDailyNotification,
          weeklySummaryNotice: mockPayload.isWeeklySummaryNotification,
          monthlyAnalysisNotice: mockPayload.isMonthlyAnalysisNotification,
        },
        { where: { userId: mockUserId } }
      );
    });

    it('should throw error if update fails (returns null/false - though unlikely for sequelize update unless mocked to be falsy)', async () => {
      (PersonnelNotification.update as any).mockResolvedValue(null);

      await expect(
        personnelNotificationServices.putPersonnelNotification(
          mockUserId,
          mockPayload
        )
      ).rejects.toThrow('Update personnel notification failed');
    });
  });
});
