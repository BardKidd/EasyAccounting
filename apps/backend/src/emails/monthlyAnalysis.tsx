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
  Img,
} from '@react-email/components';
import { formatCurrency } from '@/utils/format';

// --- Interfaces ---

export interface ComparisonCategory {
  name: string;
  amount: number;
  percentageChange: string;
}

export interface MonthlyAnalysisProps {
  userName: string;
  yearString: string;
  twoMonths: string[];
  summary: {
    income: number;
    expense: number;
    balance: number;
  };
  balanceTrend: {
    lastLastMonthBalance: number;
    lastMonthBalance: number;
    totalChangeAmount: number;
    totalChangePercent: string;
  };
  topExpenses: {
    labels: string[];
    data: string[];
    colors: string[];
    maxTransaction: {
      title: string;
      amount: string;
      date: string;
    };
  };
  expenseComparison: {
    newCategories: string[];
    increasedCategories: ComparisonCategory[];
  };
  incomeComparison: {
    newCategories: string[];
    increasedCategories: ComparisonCategory[];
  };
}

// 塞假資料寄信才不會壞掉，反正之後會被換掉
const MonthlyAnalysis = ({
  userName = 'User',
  yearString = '2025',
  twoMonths = ['十二月', '一月'],
  summary = {
    income: 85000,
    expense: 42000,
    balance: 43000,
  },
  balanceTrend = {
    lastLastMonthBalance: 28000,
    lastMonthBalance: 43000,
    totalChangeAmount: 15000,
    totalChangePercent: '53.6',
  },
  topExpenses = {
    labels: ['飲食', '交通', '購物'],
    data: ['15000', '8000', '5000'],
    colors: ['#ef4444', '#f97316', '#3b82f6'],
    maxTransaction: {
      title: '豪華自助餐',
      amount: '2500',
      date: '2025/12/25',
    },
  },
  expenseComparison = {
    newCategories: ['健身', '線上課程'],
    increasedCategories: [
      { name: '飲食', amount: 15000, percentageChange: '15' },
      { name: '娛樂', amount: 5000, percentageChange: '20' },
      { name: '交通', amount: 8000, percentageChange: '5' },
    ],
  },
  incomeComparison = {
    newCategories: ['股息'],
    increasedCategories: [
      { name: '薪資', amount: 80000, percentageChange: '5' },
      { name: '獎金', amount: 5000, percentageChange: '12' },
    ],
  },
}: MonthlyAnalysisProps) => {
  const sortedExpenseIncreases = [
    ...expenseComparison.increasedCategories,
  ].sort((a, b) => b.amount - a.amount);
  const sortedIncomeIncreases = [...incomeComparison.increasedCategories].sort(
    (a, b) => b.amount - a.amount
  );

  const renderSummaryParams = {
    incomeColor: '#10b981',
    expenseColor: '#ef4444',
    balanceColor: Number(summary.balance) >= 0 ? '#3b82f6' : '#ef4444',
  };

  const valN2 = Number(balanceTrend.lastLastMonthBalance);
  const valN1 = Number(balanceTrend.lastMonthBalance);
  const chartLabels = twoMonths;
  const m1Label = twoMonths[1] as string; // 上個月
  const m2Label = twoMonths[0] as string; // 上上個月
  const chartData = [valN2, valN1];

  // 把 Y 軸拉高
  const maxVal = Math.max(valN2, valN1);
  const suggestedMax = Math.ceil(maxVal * 1.2);

  const lineChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify({
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [
          {
            type: 'bar',
            label: '總收支',
            backgroundColor: ['#9ca3af', '#3b82f6'],
            data: chartData,
            barPercentage: 0.5,
            datalabels: { display: false },
          },
          {
            type: 'line',
            label: '趨勢',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            data: chartData,
            pointRadius: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#f59e0b',
            datalabels: {
              display: true,
              align: 'top',
              anchor: 'start',
              offset: 10,
              color: '#333',
              font: { weight: 'bold', size: 14 },
            },
          },
        ],
      },
      options: {
        legend: { display: false },
        scales: {
          xAxes: [{ gridLines: { display: false } }],
          yAxes: [
            {
              gridLines: { color: '#f3f4f6' },
              ticks: {
                beginAtZero: true,
                padding: 10,
                suggestedMax: suggestedMax,
              },
            },
          ],
        },
        plugins: {
          datalabels: { display: false },
        },
      },
    })
  )}&width=500&height=300&backgroundColor=transparent&v=2.9.4`;

  const pieChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify({
      type: 'pie',
      data: {
        labels: topExpenses.labels,
        datasets: [
          {
            data: topExpenses.data.map((item) => Number(item)),
            backgroundColor: topExpenses.colors,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        plugins: {
          datalabels: {
            display: true,
            color: '#fff',
            font: { weight: 'bold', size: 12 },
          },
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              fontSize: 13,
              fontFamily: 'sans-serif',
              fontColor: '#333',
            },
          },
        },
      },
    })
  )}&width=500&height=300&backgroundColor=transparent&v=2.9.4`;

  return (
    <Html>
      <Preview>
        {yearString} 年 {m1Label} 月報：總收支變動{' '}
        {Number(balanceTrend.totalChangePercent) > 0 ? '+' : ''}
        {balanceTrend.totalChangePercent.toString()}%
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
            <Text style={subtitle}>
              {yearString} 年 {m1Label} 財務洞察報告
            </Text>
          </Section>

          <Section style={card}>
            {/* Greeting */}
            <Heading style={h2}>👋 {userName}</Heading>
            <Text style={paragraph}>
              這是您的 {yearString} 年 {m1Label} 財務健康檢查。
              在過去的一個月裡，您的總收支
              <strong
                style={{
                  color:
                    Number(balanceTrend.totalChangeAmount) >= 0
                      ? '#10b981'
                      : '#ef4444',
                }}
              >
                {Number(balanceTrend.totalChangeAmount) >= 0
                  ? ' 增加 '
                  : ' 減少 '}
                {formatCurrency(
                  Math.abs(Number(balanceTrend.totalChangeAmount))
                )}
                {' ('}
                {Number(balanceTrend.totalChangePercent) > 0 ? '+' : ''}
                {balanceTrend.totalChangePercent}%{')'}
              </strong>
              。
            </Text>

            <Hr style={hr} />

            {/* 1. Summary Cards */}
            <Section style={statsContainer}>
              <Row>
                <Column style={statCol}>
                  <Text style={statLabel}>上月收入</Text>
                  <Text
                    style={{
                      ...statValue,
                      color: renderSummaryParams.incomeColor,
                    }}
                  >
                    +{formatCurrency(summary.income)}
                  </Text>
                </Column>
                <Column style={statColBorder}>
                  <Text style={statLabel}>上月支出</Text>
                  <Text
                    style={{
                      ...statValue,
                      color: renderSummaryParams.expenseColor,
                    }}
                  >
                    -{formatCurrency(summary.expense)}
                  </Text>
                </Column>
                <Column style={statColBorder}>
                  <Text style={statLabel}>淨值增長</Text>
                  <Text
                    style={{
                      ...statValue,
                      color: renderSummaryParams.balanceColor,
                    }}
                  >
                    {Number(summary.balance) >= 0 ? '+' : ''}
                    {formatCurrency(summary.balance)}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* 2. Balance Trend Chart */}
            <Section style={sectionBlock}>
              <Heading style={h3}>📈 總收支趨勢 (近兩月比較)</Heading>
              <Img
                src={lineChartUrl}
                alt="Balance Trend"
                width="100%"
                height="auto"
                style={{ maxWidth: '500px', margin: '0 auto' }}
              />
              <Section
                style={{ textAlign: 'center' as const, marginTop: '12px' }}
              >
                <Text style={infoTag}>上月總結餘：{formatCurrency(valN1)}</Text>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* 3. Top Expenses (Pie) & Max Spend */}
            <Section style={sectionBlock}>
              <Heading style={h3}>🍰 前三大支出類別</Heading>
              <Img
                src={pieChartUrl}
                alt="Top Expenses Pie"
                width="100%"
                height="auto"
                style={{ maxWidth: '500px', margin: '0 auto' }}
              />

              <Section style={highlightBox}>
                <Row>
                  <Column style={{ width: '40px', verticalAlign: 'middle' }}>
                    <Text style={{ fontSize: '24px', margin: 0 }}>💸</Text>
                  </Column>
                  <Column style={{ verticalAlign: 'middle' }}>
                    <Text style={highlightTitle}>上月最大筆消費</Text>
                    <Text style={highlightItemName}>
                      {topExpenses.maxTransaction.title} (
                      {topExpenses.maxTransaction.date})
                    </Text>
                  </Column>
                  <Column
                    style={{ textAlign: 'right', verticalAlign: 'middle' }}
                  >
                    <Text style={highlightItemAmount}>
                      -
                      {formatCurrency(
                        Number(topExpenses.maxTransaction.amount)
                      )}
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>

            <Hr style={hr} />

            {/* 4. Expense Comparison (Sorted) */}
            <Section style={sectionBlock}>
              <Heading style={h3}>⚠️ 消費類別重點觀察</Heading>

              {expenseComparison.newCategories.length > 0 && (
                <Section style={{ marginBottom: '16px' }}>
                  <Text style={subHeader}>🆕 新增類別</Text>
                  <div style={tagContainer}>
                    {expenseComparison.newCategories.map((cat, i) => (
                      <span key={i} style={tag}>
                        {cat}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {sortedExpenseIncreases.length > 0 && (
                <Section>
                  <Text style={subHeader}>🔥 支出增長類別 (依金額排序)</Text>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>類別</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>金額</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>增幅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExpenseIncreases.map((cat, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{cat.name}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {formatCurrency(cat.amount)}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: 'right',
                              color: '#ef4444',
                              fontWeight: 'bold',
                            }}
                          >
                            +{Number(cat.percentageChange)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}
            </Section>

            {/* 5. Income Comparison (Sorted) */}
            <Section style={sectionBlock}>
              <Heading style={h3}>💰 收入變動觀察</Heading>
              {incomeComparison.newCategories.length > 0 && (
                <Section style={{ marginBottom: '16px' }}>
                  <Text style={subHeader}>🎉 新增收入來源</Text>
                  <div style={tagContainer}>
                    {incomeComparison.newCategories.map((cat, i) => (
                      <span
                        key={i}
                        style={{
                          ...tag,
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {sortedIncomeIncreases.length > 0 && (
                <Section>
                  <Text style={subHeader}>🚀 收入成長 (依金額排序)</Text>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>來源</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>金額</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>增幅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedIncomeIncreases.map((cat, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>{cat.name}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {formatCurrency(cat.amount)}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: 'right',
                              color: '#10b981',
                              fontWeight: 'bold',
                            }}
                          >
                            +{Number(cat.percentageChange)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}
            </Section>

            {/* CTA */}
            <Section style={btnContainer}>
              <Link style={button} href="https://easyaccounting.com/dashboard">
                進入儀表板查看詳情
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

// --- Styles ---

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
  marginBottom: '16px',
};

const h3 = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '16px',
  borderLeft: '4px solid #4f46e5',
  paddingLeft: '12px',
};

const subHeader = {
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: '600',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '26px',
  color: '#4b5563',
  margin: '0',
};

const infoTag = {
  display: 'inline-block',
  backgroundColor: '#eff6ff',
  color: '#1e40af',
  fontSize: '13px',
  padding: '6px 12px',
  borderRadius: '20px',
  fontWeight: '500',
};

const statsContainer = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
  marginTop: '24px',
};

const statCol = {
  textAlign: 'center' as const,
  width: '33.33%',
  verticalAlign: 'middle' as const,
};

const statColBorder = {
  ...statCol,
  borderLeft: '1px solid #e5e7eb',
};

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  fontWeight: '600',
};

const statValue = {
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const sectionBlock = {
  marginBottom: '32px',
};

const highlightBox = {
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#fff1f2',
  borderRadius: '12px',
  border: '1px solid #ffe4e6',
};

const highlightTitle = {
  fontSize: '12px',
  color: '#be123c',
  fontWeight: 'bold',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
};

const highlightItemName = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#374151',
  margin: '0',
};

const highlightItemAmount = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#ef4444',
  margin: '0',
};

const tagContainer = {
  marginBottom: '12px',
};

const tag = {
  display: 'inline-block',
  backgroundColor: '#f3f4f6', // gray-100
  color: '#4b5563', // gray-600
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '6px',
  marginRight: '8px',
  marginBottom: '4px',
  fontWeight: '500',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '14px',
  marginTop: '8px',
};

const thStyle = {
  padding: '8px 0',
  borderBottom: '2px solid #e5e7eb',
  color: '#9ca3af',
  fontSize: '12px',
  fontWeight: '600',
};

const tdStyle = {
  padding: '12px 0',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
};

const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '40px',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  display: 'inline-block',
  boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerCopyright = {
  textAlign: 'center' as const,
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '32px',
};
