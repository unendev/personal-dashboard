import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateMasterPassword() {
  try {
    const newPassword = 'Mw!vc_18$' // 新的强密码
    const masterEmail = 'master@example.com'
    
    console.log('正在更新master账户密码...')
    
    // 检查master账户是否存在
    const masterUser = await prisma.user.findUnique({
      where: { email: masterEmail }
    })
    
    if (!masterUser) {
      console.log('❌ master账户不存在')
      return
    }
    
    console.log(`✅ 找到master账户: ${masterUser.email}`)
    
    // 生成新的密码哈希
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    console.log('🔐 生成新的密码哈希...')
    
    // 更新密码
    await prisma.user.update({
      where: { email: masterEmail },
      data: { password: hashedPassword }
    })
    
    console.log('✅ master账户密码已成功更新！')
    console.log(`📧 邮箱: ${masterEmail}`)
    console.log(`🔑 新密码: ${newPassword}`)
    console.log('⚠️  请妥善保管新密码，建议立即登录并再次修改密码')
    
  } catch (error) {
    console.error('❌ 更新密码时出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行脚本
updateMasterPassword()
