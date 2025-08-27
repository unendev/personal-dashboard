'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// MVP版本：硬编码用户ID
const MOCK_USER_ID = 'user-1'

export async function createSkill(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name || name.trim().length === 0) {
    throw new Error('技能名称不能为空')
  }

  try {
    await prisma.skill.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: MOCK_USER_ID,
      },
    })

    // 重新验证页面数据
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('创建技能失败:', error)
    throw new Error('创建技能失败，请重试')
  }
}

export async function levelUpSkill(skillId: string) {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new Error('技能不存在')
    }

    await prisma.skill.update({
      where: { id: skillId },
      data: {
        level: { increment: 1 },
        experience: 0, // 升级后重置经验值
      },
    })

    revalidatePath('/dashboard')
  } catch (error) {
    console.error('升级技能失败:', error)
    throw new Error('升级技能失败，请重试')
  }
}

export async function createQuest(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const skillId = formData.get('skillId') as string
  const priority = formData.get('priority') as string

  if (!title || title.trim().length === 0) {
    throw new Error('任务标题不能为空')
  }

  try {
    await prisma.quest.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        skillId: skillId || null,
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' || 'MEDIUM',
        userId: MOCK_USER_ID,
      },
    })

    revalidatePath('/quests')
  } catch (error) {
    console.error('创建任务失败:', error)
    throw new Error('创建任务失败，请重试')
  }
}

export async function updateQuestStatus(questId: string, status: string) {
  try {
    await prisma.quest.update({
      where: { id: questId },
      data: {
        status: status as 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
        updatedAt: new Date(),
      },
    })

    revalidatePath('/quests')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    throw new Error('更新任务状态失败，请重试')
  }
}

export async function createLog(formData: FormData) {
  const content = formData.get('content') as string | null
  const questId = formData.get('questId') as string
  const dailySummaryString = formData.get('dailySummary') as string

  let dailySummaryJson = null;
  if (dailySummaryString) {
    try {
      dailySummaryJson = JSON.parse(dailySummaryString);
    } catch (error) {
      console.error('解析 dailySummary 失败:', error);
      throw new Error('每日总结数据格式不正确');
    }
  }

  // content 字段现在是可选的，不再强制校验
  // if (!content || content.trim().length === 0) {
  //   throw new Error('日志内容不能为空')
  // }

  try {
    await prisma.log.create({
      data: {
        content: content?.trim() || null,
        questId: questId || null,
        userId: MOCK_USER_ID,
        dailySummary: dailySummaryJson,
      },
    })

    revalidatePath('/log')
  } catch (error) {
    console.error('创建日志失败:', error)
    throw new Error('创建日志失败，请重试')
  }
}