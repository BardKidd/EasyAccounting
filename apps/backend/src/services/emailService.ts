import { Resend } from 'resend';
import { render } from '@react-email/render';
import DailyReminder from '@/emails/dailyReminder';
import Welcome from '@/emails/welcome';
import { quickChartDoughnutProps } from '@/types/email';
import WeeklySummary from '@/emails/weeklySummary';

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
      })
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

// export const sendMonthlyAnalysisNoticeEmail = async ({
//   userName,
//   to,
// }: SendWeeklySummaryProps) => {
//   try {
//     const html = await render();
//     const data = await resend.emails.send({
//       from:
//         process.env.EMAIL_FROM || 'EasyAccounting <easyaccounting@resend.dev>',
//       to,
//       subject: 'Monthly Analysis Notice',
//       html,
//     });
//     console.log('[Email] Send monthly analysis notice success');
//     return data;
//   } catch (error) {
//     console.error('[Email] Send monthly analysis notice error', error);
//     throw error;
//   }
// };

export default {
  sendDailyReminderEmail,
  sendWelcomeEmail,
  sendWeeklySummaryNoticeEmail,
  // sendMonthlyAnalysisNoticeEmail,
};
