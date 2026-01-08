import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkDailyReminder,
  checkWeeklySummaryNotice,
  checkMonthlyAnalysisNotice,
} from '@/cron/notificationCron';
import PersonnelNotification from '@/models/personnel_notification';
import emailService from '@/services/emailService';
import statisticsServices from '@/services/statisticsServices';
import reportService from '@/services/reportService';
import { RootType } from '@repo/shared';

// Mock dependencies
// Mock dependencies
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: () => Promise.resolve(),
      };
    },
  };
});
vi.mock('@/models/personnel_notification');
vi.mock('@/services/emailService');
vi.mock('@/services/statisticsServices');
vi.mock('@/services/reportService');
vi.mock('@/utils/common', () => ({
  sleep: vi.fn(), // Mock sleep to avoid waiting in tests
}));

describe('Notification Cron Jobs', () => {
  const mockUser1 = {
    id: 'user-1',
    name: 'User One',
    email: 'user1@example.com',
  };
  const mockUser2 = {
    id: 'user-2',
    name: 'User Two',
    email: 'user2@example.com',
  };

  const mockSub1 = {
    userId: 'user-1',
    dailyReminder: true,
    weeklySummaryNotice: true,
    monthlyAnalysisNotice: true,
    user: mockUser1,
  };

  const mockSub2 = {
    userId: 'user-2',
    dailyReminder: false,
    weeklySummaryNotice: false,
    monthlyAnalysisNotice: false,
    user: mockUser2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkDailyReminder', () => {
    it('should send daily reminder emails to subscribed users', async () => {
      // Mock PersonnelNotification.findAll to return subscribed user
      (PersonnelNotification.findAll as any).mockResolvedValue([mockSub1]);

      await checkDailyReminder();

      // Verify db query
      expect(PersonnelNotification.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dailyReminder: true },
        })
      );

      // Verify email sent
      expect(emailService.sendDailyReminderEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendDailyReminderEmail).toHaveBeenCalledWith({
        userName: mockUser1.name,
        to: mockUser1.email,
      });
    });

    it('should NOT send daily reminder if no users subscribed', async () => {
      (PersonnelNotification.findAll as any).mockResolvedValue([]);

      await checkDailyReminder();

      expect(emailService.sendDailyReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('checkWeeklySummaryNotice', () => {
    it('should send weekly summary emails with correct data', async () => {
      // Set date to a Monday (e.g., 2026-01-05) to simulate running on Monday morning
      // Logic: const now = new Date(); const weekRange = subWeeks(now, 1);
      // If today is Jan 5 (Mon), weekRange is Dec 29 (Mon previous week).
      // startOfWeek(Dec 29) -> Dec 29. endOfWeek -> Jan 4.
      const mockToday = new Date('2026-01-05T09:00:00Z');
      vi.setSystemTime(mockToday);

      (PersonnelNotification.findAll as any).mockResolvedValue([mockSub1]);

      // Mock statistics data
      (statisticsServices.getCategoryTabData as any).mockResolvedValue([
        {
          name: 'Food',
          amount: 100,
          type: RootType.EXPENSE,
          isTransfer: false,
        },
        {
          name: 'Salary',
          amount: 1000,
          type: RootType.INCOME,
          isTransfer: false,
        },
      ]);

      await checkWeeklySummaryNotice();

      expect(PersonnelNotification.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { weeklySummaryNotice: true },
        })
      );

      expect(statisticsServices.getCategoryTabData).toHaveBeenCalled();

      expect(emailService.sendWeeklySummaryNoticeEmail).toHaveBeenCalledTimes(
        1
      );
      expect(emailService.sendWeeklySummaryNoticeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: mockUser1.name,
          to: mockUser1.email,
          expenseSummaryData: expect.objectContaining({
            doughnutlabel: 100,
          }),
          incomeSummaryData: expect.objectContaining({
            doughnutlabel: 1000,
          }),
        })
      );
    });

    it('should skip sending if no data found for user', async () => {
      (PersonnelNotification.findAll as any).mockResolvedValue([mockSub1]);
      (statisticsServices.getCategoryTabData as any).mockResolvedValue([]); // Empty data

      await checkWeeklySummaryNotice();

      expect(emailService.sendWeeklySummaryNoticeEmail).not.toHaveBeenCalled();
    });
  });

  describe('checkMonthlyAnalysisNotice', () => {
    it('should send monthly analysis emails via reportService', async () => {
      // Set date to 5th of month (e.g., 2026-02-05)
      const mockToday = new Date('2026-02-05T09:00:00Z');
      vi.setSystemTime(mockToday);

      (PersonnelNotification.findAll as any).mockResolvedValue([mockSub1]);

      // Mock report service payload
      const mockPayload = { some: 'payload' };
      (reportService.monthlyReportService as any).mockResolvedValue(
        mockPayload
      );

      await checkMonthlyAnalysisNotice();

      expect(PersonnelNotification.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { monthlyAnalysisNotice: true },
        })
      );

      expect(reportService.monthlyReportService).toHaveBeenCalledWith({
        userName: mockUser1.name,
        userEmail: mockUser1.email,
        userId: mockSub1.userId,
      });
    });

    it('should NOT send monthly analysis emails if no users subscribed', async () => {
      (PersonnelNotification.findAll as any).mockResolvedValue([]);

      await checkMonthlyAnalysisNotice();

      expect(PersonnelNotification.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { monthlyAnalysisNotice: true },
        })
      );

      expect(reportService.monthlyReportService).not.toHaveBeenCalled();
      expect(
        emailService.sendMonthlyAnalysisNoticeEmail
      ).not.toHaveBeenCalled();
    });
  });
});
