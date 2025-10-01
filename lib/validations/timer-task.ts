import { z } from 'zod'

/**
 * 创建计时任务 Schema
 */
export const createTimerTaskSchema = z.object({
  name: z
    .string()
    .min(1, '任务名称不能为空')
    .max(200, '任务名称不能超过200字符'),
  
  categoryPath: z
    .string()
    .max(500, '分类路径不能超过500字符')
    .default('未分类'),
  
  parentId: z
    .string()
    .nullable()
    .optional(),
  
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
    .optional(),
  
  elapsedTime: z
    .number()
    .int('运行时间必须是整数')
    .min(0, '运行时间不能为负数')
    .default(0),
  
  initialTime: z
    .number()
    .int('初始时间必须是整数')
    .min(0, '初始时间不能为负数')
    .default(0),
  
  instanceTag: z
    .string()
    .max(100, '事务标签不能超过100字符')
    .optional(),
})

/**
 * 更新计时任务 Schema
 */
export const updateTimerTaskSchema = z.object({
  name: z
    .string()
    .min(1, '任务名称不能为空')
    .max(200, '任务名称不能超过200字符')
    .optional(),
  
  categoryPath: z
    .string()
    .max(500, '分类路径不能超过500字符')
    .optional(),
  
  elapsedTime: z
    .number()
    .int('运行时间必须是整数')
    .min(0, '运行时间不能为负数')
    .optional(),
  
  isRunning: z.boolean().optional(),
  
  isPaused: z.boolean().optional(),
  
  pausedTime: z
    .number()
    .int('暂停时间必须是整数')
    .min(0, '暂停时间不能为负数')
    .optional(),
  
  instanceTag: z
    .string()
    .max(100, '事务标签不能超过100字符')
    .optional(),
})

/**
 * 类型导出
 */
export type CreateTimerTaskInput = z.infer<typeof createTimerTaskSchema>
export type UpdateTimerTaskInput = z.infer<typeof updateTimerTaskSchema>

