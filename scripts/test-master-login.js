import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testMasterLogin() {
  try {
    console.log('测试 master 账户登录:');
    console.log('==================');
    
    // 查找 master 账户
    const masterUser = await prisma.user.findUnique({
      where: { email: 'master@example.com' }
    });
    
    if (!masterUser) {
      console.log('❌ master 账户不存在');
      return;
    }
    
    console.log('✅ master 账户存在');
    console.log('邮箱:', masterUser.email);
    console.log('姓名:', masterUser.name);
    console.log('用户ID:', masterUser.id);
    
    // 测试密码验证
    const isValidPassword = await bcrypt.compare('masterPswd', masterUser.password);
    console.log('密码验证:', isValidPassword ? '✅ 正确' : '❌ 错误');
    
    // 检查数据
    const timerTasksCount = await prisma.timerTask.count({
      where: { userId: masterUser.id }
    });
    
    const todosCount = await prisma.todo.count({
      where: { userId: masterUser.id }
    });
    
    const logsCount = await prisma.log.count({
      where: { userId: masterUser.id }
    });
    
    const operationRecordsCount = await prisma.operationRecord.count({
      where: { userId: masterUser.id }
    });
    
    const aiSummariesCount = await prisma.aISummary.count({
      where: { userId: masterUser.id }
    });
    
    console.log('');
    console.log('数据统计:');
    console.log(`计时任务: ${timerTasksCount} 个`);
    console.log(`待办事项: ${todosCount} 个`);
    console.log(`日志: ${logsCount} 个`);
    console.log(`操作记录: ${operationRecordsCount} 个`);
    console.log(`AI总结: ${aiSummariesCount} 个`);
    
    console.log('');
    console.log('🎉 master 账户配置完成！');
    console.log('现在可以使用以下信息登录:');
    console.log('邮箱: master@example.com');
    console.log('密码: masterPswd');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMasterLogin();
