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
import { quickChartDoughnutProps } from '@/types/email';
import { formatCurrency } from '@/utils/format';

interface WeeklySummaryProps {
  userName: string;
  startDate: string; // e.g., "2025/12/22"
  endDate: string; // e.g., "2025/12/28"
  expenseSummaryData: quickChartDoughnutProps;
  incomeSummaryData: quickChartDoughnutProps;
}

const WeeklySummary = ({
  userName = 'User',
  startDate = '2025/12/22',
  endDate = '2025/12/28',
  // 防止預覽報錯的預設值
  expenseSummaryData = {
    labels: ['飲食', '交通', '娛樂', '其他'],
    datasets: [3000, 1500, 1000, 500],
    doughnutlabel: 6000,
  },
  incomeSummaryData = {
    labels: ['薪水', '獎金'],
    datasets: [50000, 5000],
    doughnutlabel: 55000,
  },
}: WeeklySummaryProps) => {
  const expense = expenseSummaryData.doughnutlabel || 0;
  const income = incomeSummaryData.doughnutlabel || 0;
  const balance = income - expense;

  const chartData = {
    type: 'doughnut',
    data: {
      labels: expenseSummaryData.labels,
      datasets: [{ data: expenseSummaryData.datasets }],
    },
    options: {
      plugins: {
        doughnutlabel: {
          labels: [
            { text: expenseSummaryData.doughnutlabel, font: { size: 20 } },
            { text: 'total' },
          ],
        },
      },
    },
  };
  return (
    <Html>
      <Preview>
        本週收支概況：支出 ${formatCurrency(expense) || '0'}，結餘 $
        {formatCurrency(balance) || '0'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>EasyAccounting</Heading>
            <Text style={subtitle}>
              每週收支摘要 ({startDate} - {endDate})
            </Text>
          </Section>

          <Section style={card}>
            <Heading style={h2}>👋 {userName}，這週過得如何？</Heading>
            <Text style={paragraph}>
              又到了回顧這週財務狀況的時候了。保持關注您的現金流是達成財務自由的關鍵！
            </Text>

            {/* Dashboard Stats */}
            <Section style={statsContainer}>
              <Row>
                <Column style={statCol}>
                  <Text style={statLabel}>總收入</Text>
                  <Text style={{ ...statValue, color: '#10b981' }}>
                    +{formatCurrency(income) || '0'}
                  </Text>
                </Column>
                <Column style={statColBorder}>
                  <Text style={statLabel}>總支出</Text>
                  <Text style={{ ...statValue, color: '#ef4444' }}>
                    -{formatCurrency(expense) || '0'}
                  </Text>
                </Column>
              </Row>
              <Row style={{ marginTop: '20px' }}>
                <Column style={{ textAlign: 'center' as const }}>
                  <Text style={statLabel}>本週結餘</Text>
                  <Text
                    style={{
                      ...statValue,
                      color: balance >= 0 ? '#333' : '#ef4444',
                      fontSize: '28px',
                    }}
                  >
                    {balance >= 0 ? '+' : ''}${balance.toLocaleString()}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Chart Section */}
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Heading style={h3}>消費類別分佈</Heading>
              <Img
                src={`https://quickchart.io/chart?c=${encodeURIComponent(
                  JSON.stringify({
                    type: 'doughnut',
                    data: {
                      labels: expenseSummaryData.labels,
                      datasets: [
                        {
                          data: expenseSummaryData.datasets,
                          backgroundColor: [
                            '#ef4444', // red-500
                            '#f97316', // orange-500
                            '#f59e0b', // amber-500
                            '#84cc16', // lime-500
                            '#10b981', // emerald-500
                            '#06b6d4', // cyan-500
                            '#3b82f6', // blue-500
                            '#6366f1', // indigo-500
                            '#8b5cf6', // violet-500
                            '#d946ef', // fuchsia-500
                            '#f43f5e', // rose-500
                            '#64748b', // slate-500
                          ],
                          borderWidth: 0,
                        },
                      ],
                    },
                    options: {
                      cutoutPercentage: 70,
                      legend: {
                        position: 'right',
                        align: 'center',
                        labels: {
                          fontColor: '#333',
                          fontSize: 14,
                          boxWidth: 12,
                          padding: 15,
                          fontFamily: 'sans-serif',
                        },
                      },
                      plugins: {
                        datalabels: {
                          display: true,
                          color: '#fff',
                          font: {
                            weight: 'bold',
                            size: 12,
                          },
                          formatter: (value: any, ctx: any) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map((data: number) => {
                              sum += data;
                            });
                            let percentage =
                              ((value * 100) / sum).toFixed(0) + '%';
                            return percentage;
                          },
                        },
                        doughnutlabel: {
                          labels: [
                            {
                              text: expenseSummaryData.doughnutlabel.toLocaleString(),
                              font: {
                                size: 24,
                                weight: 'bold',
                                family: 'sans-serif',
                              },
                              color: '#333',
                            },
                            {
                              text: 'Total',
                              font: {
                                size: 14,
                                family: 'sans-serif',
                              },
                              color: '#888',
                            },
                          ],
                        },
                      },
                    },
                  })
                )}&width=500&height=300&backgroundColor=transparent`}
                alt="Spending Chart"
                width="500"
                height="300"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </Section>

            <Hr style={hr} />

            <Section style={btnContainer}>
              <Link style={button} href="https://easyaccounting.com/dashboard">
                查看詳細收支明細
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

export default WeeklySummary;

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
  color: '#333',
  margin: '0 0 16px',
};

const h3 = {
  fontSize: '16px',
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

const statsContainer = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const statCol = {
  textAlign: 'center' as const,
  width: '50%',
};

const statColBorder = {
  ...statCol,
  borderLeft: '1px solid #e5e7eb',
};

const statLabel = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  fontWeight: '600',
};

const statValue = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const btnContainer = {
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 28px',
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
