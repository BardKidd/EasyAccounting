import { StatisticsClient } from './statisticsClient';

export default function StatisticsPage() {
  const now = new Date().getTime();
  // 防治水合
  return <StatisticsClient initialDate={now} />;
}
