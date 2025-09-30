// 修复旧宝藏中错误的图片 URL
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function fixImageUrls() {
  try {
    console.log('🔍 开始查找需要修复的图片...')
    
    // 查找所有图片
    const images = await prisma.image.findMany({
      include: {
        treasure: true
      }
    })
    
    console.log(`📊 总共找到 ${images.length} 张图片`)
    
    let fixedCount = 0
    
    for (const image of images) {
      // 检查 URL 是否以 / 开头（相对路径）
      if (image.url.startsWith('/')) {
        console.log(`\n❌ 发现错误的图片 URL:`)
        console.log(`   宝藏: ${image.treasure.title}`)
        console.log(`   旧 URL: ${image.url}`)
        
        // 提取文件名
        const fileName = image.url.replace('/treasure-images/', '')
        
        // 构建正确的完整 URL
        const correctUrl = `https://projectnexus.oss-cn-shenzhen.aliyuncs.com/treasure-images/${fileName}`
        
        console.log(`   新 URL: ${correctUrl}`)
        
        // 更新数据库
        await prisma.image.update({
          where: { id: image.id },
          data: { url: correctUrl }
        })
        
        fixedCount++
        console.log(`   ✅ 已修复`)
      } else if (image.url.startsWith('https://') || image.url.startsWith('http://')) {
        console.log(`✅ ${image.treasure.title} - URL 正确`)
      } else {
        console.log(`⚠️  未知格式: ${image.url}`)
      }
    }
    
    console.log(`\n\n📝 修复总结:`)
    console.log(`   总图片数: ${images.length}`)
    console.log(`   已修复: ${fixedCount}`)
    console.log(`   ✅ 完成！`)
    
  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixImageUrls()
