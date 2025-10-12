// 里程碑系统类型定义

export interface WeeklyReviewData {
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: Array<{
    taskId: string;
    taskName: string;
    categoryPath: string;
    duration: number; // 秒
    reason?: string; // 为什么重要
  }>;
}

export interface MilestoneData {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: any; // JSON
  confirmedAchievements: any; // JSON
  userNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMilestoneInput {
  startDate: string;
  endDate: string;
  aiTitle: string;
  aiFocus: string;
  aiInsights: string[];
  aiKeyAchievements: any;
  confirmedAchievements: any;
  userNotes?: string;
}


