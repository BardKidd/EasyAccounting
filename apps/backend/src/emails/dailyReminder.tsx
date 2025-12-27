import React from 'react';
import {
  Html,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Section,
  Heading,
  Hr,
  Img,
} from '@react-email/components';

interface DailyReminderProps {
  userName: string;
}

const DailyReminder = ({ userName = 'User' }: DailyReminderProps) => {
  return (
    <Html>
      <Preview>今天別忘了記帳喔！EasyAccounting 貼心提醒</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header & Logo Placeholder */}
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
          </Section>

          {/* Main Card Content */}
          <Section style={card}>
            <Heading style={h2}>👋 嗨, {userName}</Heading>
            <Text style={paragraph}>
              忙碌了一整天，別忘了留點時間整理今天的收支。
              養成記帳的好習慣，是理財的第一步！
            </Text>

            {/* Call To Action */}
            <Section style={btnContainer}>
              <Link style={button} href="https://easyaccounting.com">
                立即記帳
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              如果這是一個誤發的提醒，或者您想調整通知頻率，
              <Link href="https://easyaccounting.com/settings" style={link}>
                請點此管理通知設定
              </Link>
              。
            </Text>
          </Section>

          <Text style={footerCopyright}>
            © 2025 EasyAccounting. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyReminder;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 0',
  width: '580px',
};

const header = {
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const brand = {
  color: '#4f46e5', // Indigo-600
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const card = {
  backgroundColor: '#ffffff',
  padding: '40px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const h2 = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#333',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#555',
  margin: '0 0 24px',
};

const btnContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const link = {
  color: '#4f46e5',
  textDecoration: 'underline',
};

const footerText = {
  fontSize: '12px',
  color: '#8898aa',
  lineHeight: '18px',
};

const footerCopyright = {
  textAlign: 'center' as const,
  fontSize: '12px',
  color: '#8898aa',
  marginTop: '20px',
};
