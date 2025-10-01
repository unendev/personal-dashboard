import { z } from 'zod'

/**
 * Todo 优先级枚举
 */
export const TodoPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

/**
 * 创建 Todo Schema
 */
export const createTodoSchema = z.object({
  title: z
    .string()
    .min(1, '待办标题不能为空')
    .max(500, '待办标题不能超过500字符'),
  
  description: z
    .string()
    .max(2000, '待办描述不能超过2000字符')
    .optional(),
  
  completed: z
    .boolean()
    .default(false),
  
  priority: TodoPriority.default('MEDIUM'),
  
  dueDate: z
    .string()
    .datetime('截止日期格式不正确')
    .optional(),
  
  parentId: z
    .string()
    .nullable()
    .optional(),
  
  order: z
    .number()
    .int('排序值必须是整数')
    .min(0, '排序值不能为负数')
    .default(0),
})

/**
 * 更新 Todo Schema
 */
export const updateTodoSchema = z.object({
  title: z
    .string()
    .min(1, '待办标题不能为空')
    .max(500, '待办标题不能超过500字符')
    .optional(),
  
  description: z
    .string()
    .max(2000, '待办描述不能超过2000字符')
    .optional(),
  
  completed: z.boolean().optional(),
  
  priority: TodoPriority.optional(),
  
  dueDate: z
    .string()
    .datetime('截止日期格式不正确')
    .nullable()
    .optional(),
  
  order: z
    .number()
    .int('排序值必须是整数')
    .min(0, '排序值不能为负数')
    .optional(),
})

/**
 * 类型导出
 */
export type CreateTodoInput = z.infer<typeof createTodoSchema>
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>

