#!/usr/bin/env node

/**
 * 数据迁移脚本：将 Todo.mdContent 迁移到 Note 表
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 开始迁移 mdContent 到 Notes 表...\n')

  try {
    // 1. 查询所有包含 mdContent 的 Todo 记录
    const todosWithContent = await prisma.todo.findMany({
      where: {
        mdContent: {
          not: null,
        },
      },
      select: {
        userId: true,
        mdContent: true,
      },
    })

    console.log(`📊 找到 ${todosWithContent.length} 条包含 mdContent 的记录`)

    // 2. 按用户分组
    const userContentMap = new Map()
    
    for (const todo of todosWithContent) {
      if (!userContentMap.has(todo.userId)) {
        userContentMap.set(todo.userId, [])
      }
      userContentMap.get(todo.userId).push(todo.mdContent)
    }

    console.log(`👥 涉及 ${userContentMap.size} 个用户\n`)

    let migratedCount = 0
    let skippedCount = 0

    // 3. 为每个用户创建或更新 Note 记录
    for (const [userId, contents] of userContentMap.entries()) {
      try {
        // 合并该用户的所有 mdContent（如果有多条）
        const mergedContent = contents.filter(c => c).join('\n\n---\n\n')
        
        if (!mergedContent.trim()) {
          console.log(`⏭️  用户 ${userId}: 内容为空，跳过`)
          skippedCount++
          continue
        }

        // 检查用户是否已有 Note
        const existingNote = await prisma.note.findFirst({
          where: { userId },
        })

        if (existingNote) {
          // 更新现有笔记（追加内容）
          await prisma.note.update({
            where: { id: existingNote.id },
            data: {
              content: existingNote.content + '\n\n---\n\n' + mergedContent,
            },
          })
          console.log(`✅ 用户 ${userId}: 已追加到现有笔记`)
        } else {
          // 创建新笔记
          await prisma.note.create({
            data: {
              userId,
              content: mergedContent,
            },
          })
          console.log(`✅ 用户 ${userId}: 已创建新笔记`)
        }

        migratedCount++
      } catch (error) {
        console.error(`❌ 用户 ${userId} 迁移失败:`, error.message)
      }
    }

    console.log('\n📊 迁移统计:')
    console.log(`   ✅ 成功迁移: ${migratedCount} 个用户`)
    console.log(`   ⏭️  跳过: ${skippedCount} 个用户`)

    // 4. 可选：清空 Todo 的 mdContent 字段（取消注释以启用）
    // console.log('\n🧹 清理 Todo.mdContent 字段...')
    // const clearResult = await prisma.todo.updateMany({
    //   where: {
    //     mdContent: {
    //       not: null,
    //     },
    //   },
    //   data: {
    //     mdContent: null,
    //   },
    // })
    // console.log(`✅ 已清理 ${clearResult.count} 条记录`)

    console.log('\n✨ 迁移完成！')
  } catch (error) {
    console.error('❌ 迁移过程出错:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

