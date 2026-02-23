import { Resend } from 'resend';
import { render } from '@react-email/render';
import DailyReminder from '@/emails/dailyReminder';
import Welcome from '@/emails/welcome';
import { quickChartDoughnutProps } from '@/types/email';
import WeeklySummary from '@/emails/weeklySummary';
import MonthlyAnalysis, {
  MonthlyAnalysisProps,
} from '@/emails/monthlyAnalysis';
import BillParseComplete from '@/emails/billParseComplete';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDailyReminderProps {
  userName: string;
  to: string;
}

interface SendWeeklySummaryProps extends SendDailyReminderProps {
  startDate: string;
  endDate: string;
  expenseSummaryData: quickChartDoughnutProps;
  incomeSummaryData: quickChartDoughnutProps;
}

interface MonthlyAnalysisEmailProps {
  to: string;
  payload: MonthlyAnalysisProps;
}

export const sendDailyReminderEmail = async ({
  userName,
  to,
}: SendDailyReminderProps) => {
  try {
    const html = await render(DailyReminder({ userName }));
    const data = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
      to,
      subject: 'Daily Reminder',
      html,
    });
    console.log('[Email] Send daily reminder success');
    return data;
  } catch (error) {
    console.error('[Email] Send daily reminder error', error);
    throw error;
  }
};

export const sendWelcomeEmail = async ({
  userName,
  to,
}: SendDailyReminderProps) => {
  try {
    const html = await render(Welcome({ userName }));
    const data = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
      to,
      subject: '歡迎加入 EasyAccounting！🎉',
      html,
    });
    console.log('[Email] Send welcome email success');
    return data;
  } catch (error) {
    console.error('[Email] Send welcome email error', error);
    throw error;
  }
};

export const sendWeeklySummaryNoticeEmail = async ({
  userName,
  to,
  startDate,
  endDate,
  expenseSummaryData,
  incomeSummaryData,
}: SendWeeklySummaryProps) => {
  try {
    const html = await render(
      WeeklySummary({
        userName,
        startDate,
        endDate,
        expenseSummaryData,
        incomeSummaryData,
      }),
    );
    const data = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
      to,
      subject: 'Weekly Summary Notice',
      html,
    });
    console.log('[Email] Send weekly summary notice success');
    return data;
  } catch (error) {
    console.error('[Email] Send weekly summary notice error', error);
    throw error;
  }
};

export const sendMonthlyAnalysisNoticeEmail = async ({
  to,
  payload,
}: MonthlyAnalysisEmailProps) => {
  try {
    const html = await render(MonthlyAnalysis(payload));
    const data = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
      to,
      subject: 'Monthly Analysis Notice',
      html,
    });
    console.log('[Email] Send monthly analysis notice success');
    return data;
  } catch (error) {
    console.error('[Email] Send monthly analysis notice error', error);
    throw error;
  }
};

interface SendBillParseCompleteProps {
  userName: string;
  to: string;
  transactionCount: number;
}

export const sendBillParseCompleteEmail = async ({
  userName,
  to,
  transactionCount,
}: SendBillParseCompleteProps) => {
  try {
    const html = await render(
      BillParseComplete({ userName, transactionCount }),
    );
    const data = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
      to,
      subject: 'EasyAccounting: 您的帳單解析已完成 🎉',
      html,
    });
    console.log('[Email] Send bill parse complete email success');
    return data;
  } catch (error) {
    console.error('[Email] Send bill parse complete email error', error);
    throw error;
  }
};

export default {
  sendDailyReminderEmail,
  sendWelcomeEmail,
  sendWeeklySummaryNoticeEmail,
  sendMonthlyAnalysisNoticeEmail,
  sendBillParseCompleteEmail,
};
