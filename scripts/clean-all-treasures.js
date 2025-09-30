// 清理所有藏宝阁数据
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function cleanAllTreasures() {
  try {
    console.log('🗑️  开始清理所有藏宝阁数据...\n')
    
    // 1. 删除所有图片（会自动级联）
    const deletedImages = await prisma.image.deleteMany({})
    console.log(`✅ 已删除 ${deletedImages.count} 张图片`)
    
    // 2. 删除所有宝藏
    const deletedTreasures = await prisma.treasure.deleteMany({})
    console.log(`✅ 已删除 ${deletedTreasures.count} 个宝藏`)
    
    console.log('\n🎉 清理完成！数据库已清空。')
    
  } catch (error) {
    console.error('❌ 清理失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanAllTreasures()
