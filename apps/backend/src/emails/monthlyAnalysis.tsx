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
  Row,
  Column,
} from '@react-email/components';

interface CategoryStat {
  name: string;
  amount: number;
  color: string;
}

interface MonthlyAnalysisProps {
  userName: string;
  monthString: string; // e.g. "2025 年 1 月"
  totalExpense: number;
  topCategories: CategoryStat[];
}

const MonthlyAnalysis = ({
  userName = 'User',
  monthString = '2025 年 12 月',
  totalExpense = 45000,
  topCategories = [
    { name: '飲食', amount: 15000, color: '#ef4444' },
    { name: '交通', amount: 8000, color: '#f59e0b' },
    { name: '娛樂', amount: 5000, color: '#3b82f6' },
  ],
}: MonthlyAnalysisProps) => {
  const maxAmount = Math.max(...topCategories.map((c) => c.amount), 1);

  return (
    <Html>
      <Preview>
        {monthString} 月報：本月共支出 ${totalExpense.toLocaleString()}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
            <Text style={subtitle}>{monthString} 財務分析報告</Text>
          </Section>

          <Section style={card}>
            <Heading style={h2}>📊 {monthString} 結算報告</Heading>
            <Text style={paragraph}>
              {userName}
              ，這是您上個月的支出分析。了解錢花去哪裡，讓下個月的預算更精準！
            </Text>

            {/* Total Expense Hero */}
            <Section style={heroSection}>
              <Text style={heroLabel}>本月總支出</Text>
              <Text style={heroValue}>${totalExpense.toLocaleString()}</Text>
            </Section>

            <Hr style={hr} />

            <Heading style={h3}>💸 支出前三名類別</Heading>

            {/* Top Categories List with Progress Bars */}
            <Section>
              {topCategories.map((cat, index) => {
                const percentage = Math.round((cat.amount / maxAmount) * 100);
                return (
                  <Row key={index} style={rowStyle}>
                    <Column style={{ width: '30%' }}>
                      <Text style={catName}>{cat.name}</Text>
                    </Column>
                    <Column style={{ width: '50%' }}>
                      <div
                        style={{
                          backgroundColor: '#f3f4f6',
                          height: '8px',
                          borderRadius: '4px',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: cat.color,
                            width: `${percentage}%`,
                            height: '8px',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </Column>
                    <Column style={{ width: '20%', textAlign: 'right' }}>
                      <Text style={catAmount}>
                        ${cat.amount.toLocaleString()}
                      </Text>
                    </Column>
                  </Row>
                );
              })}
            </Section>

            <Section style={adviceSection}>
              <Text style={adviceText}>
                💡 <strong>小建議：</strong> {topCategories[0]?.name}{' '}
                是您本月最大的開銷。下個月試著為它設定一個預算上限吧？
              </Text>
            </Section>

            <Section style={btnContainer}>
              <Link style={button} href="https://easyaccounting.com/statistics">
                查看完整分析圖表
              </Link>
            </Section>
          </Section>

          <Text style={footerCopyright}>
            © 2025 EasyAccounting. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default MonthlyAnalysis;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 0',
  width: '580px',
};

const header = {
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const brand = {
  color: '#4f46e5',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const subtitle = {
  color: '#6b7280',
  fontSize: '14px',
  marginTop: '8px',
};

const card = {
  backgroundColor: '#ffffff',
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

const h2 = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  marginTop: '0',
};

const h3 = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4b5563',
};

const heroSection = {
  textAlign: 'center' as const,
  padding: '24px',
  backgroundColor: '#eff6ff', // light blue bg
  borderRadius: '8px',
  marginTop: '24px',
};

const heroLabel = {
  fontSize: '14px',
  color: '#1e40af', // dark blue
  margin: '0',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
};

const heroValue = {
  fontSize: '36px',
  fontWeight: 'bold',
  color: '#1e3a8a',
  margin: '8px 0 0',
};

const rowStyle = {
  marginBottom: '12px',
};

const catName = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: '500',
  margin: '0',
};

const catAmount = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const adviceSection = {
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#fffbeb', // amber-50
  borderRadius: '6px',
  border: '1px solid #fcd34d',
};

const adviceText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
  lineHeight: '20px',
};

const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerCopyright = {
  textAlign: 'center' as const,
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '24px',
};
