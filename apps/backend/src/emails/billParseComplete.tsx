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

interface BillParseCompleteProps {
  userName: string;
  transactionCount: number;
}

const BillParseComplete = ({
  userName = 'User',
  transactionCount = 0,
}: BillParseCompleteProps) => {
  return (
    <Html>
      <Preview>EasyAccounting: 您的帳單解析已完成 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
          </Section>

          {/* Main Card */}
          <Section style={card}>
            <Heading style={h2}>✅ 解析完成, {userName}!</Heading>
            <Text style={paragraph}>
              您上傳的 PDF 帳單已經由 AI 處理完畢囉！我們總共為您擷取了{' '}
              <strong>{transactionCount} 筆</strong> 待確認的交易明細。
            </Text>

            <Text style={paragraph}>
              請登入 EasyAccounting
              帳單匯入頁面查看並確認這些交易，即可快速將它們加入您的帳本中！
            </Text>

            {/* CTA */}
            <Section style={btnContainer}>
              <Link
                style={button}
                href="https://easyaccounting.com/bill-import"
              >
                前往確認交易
              </Link>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              您會收到這封信是因為您在匯入 PDF 帳單時勾選了信件通知。
            </Text>
          </Section>

          <Text style={footerCopyright}>
            © 2026 EasyAccounting. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default BillParseComplete;

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

const btnContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
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
