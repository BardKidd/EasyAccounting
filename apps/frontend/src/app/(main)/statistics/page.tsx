import { StatisticsClient } from './statisticsClient';

/**
 * 必須強制動態渲染。
 * 此頁面用 `new Date()` 取得當前時間作為 initialDate 傳入 Client Component，
 * 若不加此設定，Next.js 會將此頁面做 Static Rendering，
 * 導致 initialDate 凍結在 build/deploy 時間，使用者進入統計報表時月份不會是當月。
 */
export const dynamic = 'force-dynamic';

export default function StatisticsPage() {
  const now = new Date().getTime();
  // 防治水合
  return <StatisticsClient initialDate={now} />;
}
