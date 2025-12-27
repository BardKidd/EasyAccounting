import { Resend } from 'resend';
import { render } from '@react-email/render';
import DailyReminder from '@/emails/dailyReminder';
import { simplifyTryCatch } from '@/utils/common';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDailyReminderProps {
  userName: string;
  to: string;
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

export default {
  sendDailyReminderEmail,
};
