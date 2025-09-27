import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function setPassword() {
  try {
    const email = 'a1634358912@gmail.com';
    const newPassword = 'Mw!vc_18$'; // 用户指定的密码
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // 更新用户密码
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: { id: true, email: true, name: true }
    });
    
    console.log('=== 密码设置成功 ===');
    console.log('用户:', updatedUser.name);
    console.log('邮箱:', updatedUser.email);
    console.log('新密码:', newPassword);
    console.log('密码已加密并保存到数据库');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('设置密码时出错:', error);
    await prisma.$disconnect();
  }
}

setPassword();
