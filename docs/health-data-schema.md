# 健康数据结构设计

为了在前端展示华为手环的多日健康数据，我们定义以下 TypeScript 接口作为统一的数据规范。

## 每日健康数据 (`DailyHealthData`)

这个接口代表单日的健康数据汇总。

```typescript
export interface DailyHealthData {
  /** 日期 (格式: YYYY-MM-DD) */
  date: string;
  
  /** 当日总步数 */
  steps: number;
  
  /** 睡眠时长 (单位: 小时) */
  sleepHours: number;
  
  /** 平均心率 (次/分钟) */
  heartRate: number;
  
  /** 燃烧卡路里 (千卡) */
  calories: number;
}
```

## 模拟数据样本

在开发阶段，我们可以使用以下模拟数据来构建和测试前端组件。

```typescript
import { DailyHealthData } from '../types/health-data';

export const mockHealthData: DailyHealthData[] = [
  { date: '2023-10-20', steps: 8500, sleepHours: 7.5, heartRate: 72, calories: 2100 },
  { date: '2023-10-21', steps: 12000, sleepHours: 6.8, heartRate: 75, calories: 2500 },
  { date: '2023-10-22', steps: 9800, sleepHours: 8.1, heartRate: 69, calories: 2300 },
  { date: '2023-10-23', steps: 7600, sleepHours: 7.2, heartRate: 71, calories: 2200 },
  { date: '2023-10-24', steps: 15000, sleepHours: 6.5, heartRate: 78, calories: 2800 },
  { date: '2023-10-25', steps: 10500, sleepHours: 7.8, heartRate: 70, calories: 2400 },
  { date: '2023-10-26', steps: 9200, sleepHours: 7.0, heartRate: 73, calories: 2250 },
];