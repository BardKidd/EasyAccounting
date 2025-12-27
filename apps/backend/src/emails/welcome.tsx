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

interface WelcomeProps {
  userName: string;
}

const Welcome = ({ userName = 'User' }: WelcomeProps) => {
  return (
    <Html>
      <Preview>歡迎加入 EasyAccounting！開啟您的理財新篇章 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
          </Section>

          {/* Main Card */}
          <Section style={card}>
            <Heading style={h2}>👋 歡迎加入, {userName}!</Heading>
            <Text style={paragraph}>
              很高興能成為您理財路上的夥伴！ EasyAccounting
              致力於讓記帳變得簡單、直覺且有趣。
            </Text>

            <Text style={paragraph}>
              現在就開始記錄您的第一筆收支，或是設定您的預算目標吧！
              如果有任何問題，隨時歡迎回信告訴我們。
            </Text>

            {/* CTA */}
            <Section style={btnContainer}>
              <Link style={button} href="https://easyaccounting.com/dashboard">
                開始使用
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              您收到這封信是因為您剛註冊了 EasyAccounting 帳號。
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

export default Welcome;

// Styles (Consistent with DailyReminder)
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
