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
} from '@react-email/components';

interface PasswordResetProps {
  userName: string;
  resetUrl: string;
  ipAddress: string;
  location: string;
  operationTime: string;
  supportEmail: string;
}

const PasswordReset = ({
  userName = 'User',
  resetUrl = '#',
  ipAddress = '未知',
  location = '未知',
  operationTime = '未知',
  supportEmail = 'support@example.com',
}: PasswordResetProps) => {
  return (
    <Html>
      <Preview>EasyAccounting 密碼重設請求</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
          </Section>

          {/* Main Card */}
          <Section style={card}>
            <Heading style={h2}>🔐 密碼重設請求</Heading>
            <Text style={paragraph}>
              您好 {userName}，我們收到了您的密碼重設請求。
              請點擊下方按鈕來設定您的新密碼：
            </Text>

            {/* CTA */}
            <Section style={btnContainer}>
              <Link style={button} href={resetUrl}>
                重設密碼
              </Link>
            </Section>

            <Text style={smallText}>此連結將在 15 分鐘後失效。</Text>

            <Hr style={hr} />

            {/* Security Info */}
            <Text style={securityHeading}>📍 操作資訊</Text>
            <Text style={infoText}>
              IP 位址：{ipAddress}
              <br />
              位置：{location}
              <br />
              時間：{operationTime}
            </Text>

            <Hr style={hr} />

            {/* Warning */}
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ 若此操作非您本人進行，請立即聯繫管理員：
                <Link href={`mailto:${supportEmail}`} style={warningLink}>
                  {supportEmail}
                </Link>
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              您收到這封信是因為有人對您的 EasyAccounting
              帳號發起了密碼重設請求。 如果您沒有進行此操作，請忽略此信件。
            </Text>
          </Section>

          <Text style={footerCopyright}>
            © {new Date().getFullYear()} EasyAccounting. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordReset;

// Styles (Consistent with welcome.tsx)
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
  color: '#0d9488', // Teal-600
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

const smallText = {
  fontSize: '13px',
  color: '#8898aa',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const btnContainer = {
  textAlign: 'center' as const,
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '9999px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  boxShadow: '0 4px 6px rgba(13, 148, 136, 0.2)',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const securityHeading = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  margin: '0 0 8px',
};

const infoText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#555',
  margin: '0 0 8px',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  padding: '16px',
  border: '1px solid #f59e0b',
};

const warningText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#92400e',
  margin: '0',
};

const warningLink = {
  color: '#92400e',
  fontWeight: '600',
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
