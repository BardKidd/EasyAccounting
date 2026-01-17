import { describe, it, expect, vi, beforeEach } from 'vitest';
import emailService from '@/services/emailService';

// Mock dependencies
// Mock @react-email/render to avoid actua rendering
vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<div>Mock Email HTML</div>'),
}));

// Mock Resend
const { mockSend } = vi.hoisted(() => {
  return { mockSend: vi.fn() };
});

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

// Mock Email Templates
vi.mock('@/emails/dailyReminder', () => ({
  default: () => 'DailyReminderComponent',
}));
vi.mock('@/emails/welcome', () => ({ default: () => 'WelcomeComponent' }));
vi.mock('@/emails/weeklySummary', () => ({
  default: () => 'WeeklySummaryComponent',
}));
vi.mock('@/emails/monthlyAnalysis', () => ({
  default: () => 'MonthlyAnalysisComponent',
}));

describe('Email Service', () => {
  const mockEmailTo = 'test@example.com';
  const mockUserName = 'Test User';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ id: 'email-id' });
  });

  describe('sendDailyReminderEmail', () => {
    it('should send daily reminder email successfully', async () => {
      const result = await emailService.sendDailyReminderEmail({
        userName: mockUserName,
        to: mockEmailTo,
      });

      expect(result).toEqual({ id: 'email-id' });
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockEmailTo,
          subject: 'Daily Reminder',
          html: '<div>Mock Email HTML</div>',
        })
      );
    });

    it('should throw error if sending fails', async () => {
      mockSend.mockRejectedValue(new Error('Send failed'));

      await expect(
        emailService.sendDailyReminderEmail({
          userName: mockUserName,
          to: mockEmailTo,
        })
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const result = await emailService.sendWelcomeEmail({
        userName: mockUserName,
        to: mockEmailTo,
      });

      expect(result).toEqual({ id: 'email-id' });
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockEmailTo,
          subject: '歡迎加入 EasyAccounting！🎉',
        })
      );
    });
  });

  // Add tests for Weekly and Monthly if needed, similar pattern
});
