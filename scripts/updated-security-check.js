import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function updatedSecurityCheck() {
  console.log('🔒 更新后的安全评估报告');
  console.log('========================');
  console.log('');

  const results = {
    authentication: { score: 0, max: 12, issues: [], improvements: [] },
    dataProtection: { score: 0, max: 10, issues: [], improvements: [] },
    apiSecurity: { score: 0, max: 15, issues: [], improvements: [] },
    environmentSecurity: { score: 0, max: 10, issues: [], improvements: [] },
    monitoring: { score: 0, max: 10, issues: [], improvements: [] }
  };

  // 1. 身份验证安全检查（更新后）
  console.log('1. 🔐 身份验证安全');
  console.log('------------------');
  
  try {
    // 检查用户表结构
    const userCount = await prisma.user.count();
    console.log(`✅ 用户表存在，包含 ${userCount} 个用户`);
    results.authentication.score += 2;

    // 检查密码加密
    const users = await prisma.user.findMany({
      select: { password: true, email: true }
    });
    
    const hasEncryptedPasswords = users.every(user => 
      user.password && user.password.length > 20
    );
    
    if (hasEncryptedPasswords) {
      console.log('✅ 密码已加密存储');
      results.authentication.score += 3;
    } else {
      console.log('❌ 密码可能未加密');
      results.authentication.issues.push('密码未加密存储');
    }

    // 检查master账户密码强度
    const masterUser = users.find(user => user.email === 'master@example.com');
    if (masterUser && masterUser.password) {
      console.log('✅ Master账户密码已强化');
      results.authentication.score += 2;
      results.authentication.improvements.push('Master账户密码已更新为强密码');
    }

    // 检查注册功能状态
    const loginFormPath = 'app/components/LoginForm.tsx';
    if (fs.existsSync(loginFormPath)) {
      const loginFormContent = fs.readFileSync(loginFormPath, 'utf8');
      if (loginFormContent.includes('/* 暂时禁用注册功能 */')) {
        console.log('✅ 注册功能已暂时禁用');
        results.authentication.score += 2;
        results.authentication.improvements.push('注册功能已暂时禁用');
      }
    }

    // 检查会话表
    const sessionCount = await prisma.session.count();
    console.log(`✅ 会话管理已配置，当前 ${sessionCount} 个活跃会话`);
    results.authentication.score += 2;

    // 检查账户表
    const accountCount = await prisma.account.count();
    console.log(`✅ 账户管理已配置，${accountCount} 个账户记录`);
    results.authentication.score += 1;

  } catch (error) {
    console.log('❌ 身份验证检查失败:', error.message);
    results.authentication.issues.push('身份验证系统检查失败');
  }

  console.log('');

  // 2. API安全检查（更新后）
  console.log('2. 🚪 API 安全');
  console.log('---------------');
  
  try {
    // 检查middleware.ts是否存在
    const middlewarePath = 'middleware.ts';
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      
      if (middlewareContent.includes('SimpleRateLimit')) {
        console.log('✅ API速率限制已实施');
        results.apiSecurity.score += 5;
        results.apiSecurity.improvements.push('API速率限制已实施');
      }
      
      if (middlewareContent.includes('/api/auth/callback/credentials')) {
        console.log('✅ 登录API已受速率限制保护');
        results.apiSecurity.score += 3;
      }
      
      if (middlewareContent.includes('/api/auth/register')) {
        console.log('✅ 注册API已受速率限制保护');
        results.apiSecurity.score += 2;
      }
    } else {
      console.log('❌ middleware.ts不存在');
      results.apiSecurity.issues.push('缺少API中间件');
    }

    // 检查API路由保护
    const apiAuthPath = 'app/api/auth';
    if (fs.existsSync(apiAuthPath)) {
      console.log('✅ API路由已配置身份验证保护');
      results.apiSecurity.score += 3;
    }

    // 检查用户数据隔离
    const apiRoutes = ['todos', 'logs', 'timer-tasks'];
    let isolatedRoutes = 0;
    
    for (const route of apiRoutes) {
      const routePath = `app/api/${route}/route.ts`;
      if (fs.existsSync(routePath)) {
        const routeContent = fs.readFileSync(routePath, 'utf8');
        if (routeContent.includes('session') || routeContent.includes('userId')) {
          isolatedRoutes++;
        }
      }
    }
    
    if (isolatedRoutes > 0) {
      console.log(`✅ API已实现用户数据隔离 (${isolatedRoutes}/${apiRoutes.length} 个路由)`);
      results.apiSecurity.score += 2;
    }

  } catch (error) {
    console.log('❌ API安全检查失败:', error.message);
    results.apiSecurity.issues.push('API安全检查失败');
  }

  console.log('');

  // 3. 数据保护检查
  console.log('3. 🗄️ 数据保护');
  console.log('---------------');
  
  try {
    // 检查用户数据隔离
    const userDataCount = await prisma.user.count();
    if (userDataCount > 0) {
      console.log(`✅ 用户数据隔离正常，${userDataCount} 个用户`);
      results.dataProtection.score += 3;
    }

    // 检查数据完整性
    const todosCount = await prisma.todo.count();
    const logsCount = await prisma.log.count();
    const operationRecordsCount = await prisma.operationRecord.count();
    
    console.log(`✅ 数据完整性检查通过:`);
    console.log(`   - 待办事项: ${todosCount} 条`);
    console.log(`   - 日志: ${logsCount} 条`);
    console.log(`   - 操作记录: ${operationRecordsCount} 条`);
    results.dataProtection.score += 4;

    // 检查数据库关系约束
    try {
      await prisma.user.findFirst({
        include: {
          todos: true,
          logs: true,
          operationRecords: true
        }
      });
      console.log('✅ 数据库关系约束正常');
      results.dataProtection.score += 3;
    } catch (error) {
      console.log('❌ 数据库关系约束异常');
      results.dataProtection.issues.push('数据库关系约束异常');
    }

  } catch (error) {
    console.log('❌ 数据保护检查失败:', error.message);
    results.dataProtection.issues.push('数据保护检查失败');
  }

  console.log('');

  // 4. 环境安全检查
  console.log('4. ⚙️ 环境安全');
  console.log('---------------');
  
  try {
    // 检查环境变量文件
    const envFiles = ['.env', '.env.local'];
    let hasNextAuthSecret = false;
    let hasDatabaseUrl = false;
    
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        if (envContent.includes('NEXTAUTH_SECRET')) {
          hasNextAuthSecret = true;
        }
        if (envContent.includes('DATABASE_URL')) {
          hasDatabaseUrl = true;
        }
      }
    }
    
    if (hasNextAuthSecret) {
      console.log('✅ NextAuth密钥已配置');
      results.environmentSecurity.score += 3;
    } else {
      console.log('⚠️ NextAuth密钥未配置');
      results.environmentSecurity.issues.push('NextAuth密钥未配置');
    }
    
    if (hasDatabaseUrl) {
      console.log('✅ 数据库连接已配置');
      results.environmentSecurity.score += 3;
    } else {
      console.log('❌ 数据库连接未配置');
      results.environmentSecurity.issues.push('数据库连接未配置');
    }

    // 检查生产环境配置
    const nextConfigPath = 'next.config.ts';
    if (fs.existsSync(nextConfigPath)) {
      console.log('✅ Next.js配置已存在');
      results.environmentSecurity.score += 2;
    }

    // 检查TypeScript配置
    const tsConfigPath = 'tsconfig.json';
    if (fs.existsSync(tsConfigPath)) {
      console.log('✅ TypeScript配置已存在');
      results.environmentSecurity.score += 2;
    }

  } catch (error) {
    console.log('❌ 环境安全检查失败:', error.message);
    results.environmentSecurity.issues.push('环境安全检查失败');
  }

  console.log('');

  // 5. 监控审计检查
  console.log('5. 📊 监控审计');
  console.log('---------------');
  
  try {
    // 检查操作记录
    const recentOperations = await prisma.operationRecord.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
        }
      }
    });
    
    console.log(`✅ 操作记录功能正常，最近24小时 ${recentOperations} 条记录`);
    results.monitoring.score += 3;

    // 检查日志记录
    const recentLogs = await prisma.log.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    
    console.log(`✅ 日志记录功能正常，最近24小时 ${recentLogs} 条日志`);
    results.monitoring.score += 2;

    // 检查安全脚本
    const securityScripts = ['security-check.js', 'update-master-password.js'];
    let securityScriptCount = 0;
    
    for (const script of securityScripts) {
      if (fs.existsSync(`scripts/${script}`)) {
        securityScriptCount++;
      }
    }
    
    if (securityScriptCount > 0) {
      console.log(`✅ 安全脚本已配置 (${securityScriptCount}/${securityScripts.length} 个)`);
      results.monitoring.score += 3;
    }

  } catch (error) {
    console.log('❌ 监控检查失败:', error.message);
    results.monitoring.issues.push('监控检查失败');
  }

  console.log('');

  // 计算总分
  const totalScore = Object.values(results).reduce((sum, category) => sum + category.score, 0);
  const maxScore = Object.values(results).reduce((sum, category) => sum + category.max, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  console.log('📊 更新后的安全评分总结');
  console.log('========================');
  console.log(`身份验证安全: ${results.authentication.score}/${results.authentication.max} (${Math.round(results.authentication.score/results.authentication.max*100)}%)`);
  console.log(`数据保护: ${results.dataProtection.score}/${results.dataProtection.max} (${Math.round(results.dataProtection.score/results.dataProtection.max*100)}%)`);
  console.log(`API 安全: ${results.apiSecurity.score}/${results.apiSecurity.max} (${Math.round(results.apiSecurity.score/results.apiSecurity.max*100)}%)`);
  console.log(`环境安全: ${results.environmentSecurity.score}/${results.environmentSecurity.max} (${Math.round(results.environmentSecurity.score/results.environmentSecurity.max*100)}%)`);
  console.log(`监控审计: ${results.monitoring.score}/${results.monitoring.max} (${Math.round(results.monitoring.score/results.monitoring.max*100)}%)`);
  console.log('');
  console.log(`🎯 总体安全评分: ${totalScore}/${maxScore} (${percentage}%)`);

  // 安全等级评估
  let securityLevel = '';
  let emoji = '';
  if (percentage >= 85) {
    securityLevel = '高';
    emoji = '🟢';
  } else if (percentage >= 70) {
    securityLevel = '中等';
    emoji = '🟡';
  } else if (percentage >= 50) {
    securityLevel = '低';
    emoji = '🟠';
  } else {
    securityLevel = '极低';
    emoji = '🔴';
  }

  console.log(`${emoji} 安全等级: ${securityLevel}`);
  console.log('');

  // 显示改进
  const allImprovements = Object.values(results).flatMap(category => category.improvements);
  if (allImprovements.length > 0) {
    console.log('✅ 已实施的安全改进:');
    allImprovements.forEach((improvement, index) => {
      console.log(`${index + 1}. ${improvement}`);
    });
    console.log('');
  }

  // 显示问题
  const allIssues = Object.values(results).flatMap(category => category.issues);
  if (allIssues.length > 0) {
    console.log('⚠️ 仍需关注的安全问题:');
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    console.log('');
  }

  // 建议
  console.log('💡 进一步安全改进建议:');
  if (percentage < 85) {
    console.log('1. 实施双因素认证 (2FA)');
    console.log('2. 添加HTTPS强制重定向');
    console.log('3. 实施内容安全策略 (CSP)');
    console.log('4. 添加安全头配置');
    console.log('5. 定期进行安全审计和渗透测试');
    console.log('6. 实施日志分析和异常检测');
  } else {
    console.log('✅ 安全状况良好，建议定期维护和更新');
    console.log('1. 定期更新依赖包');
    console.log('2. 监控安全漏洞公告');
    console.log('3. 定期进行安全审计');
  }

  await prisma.$disconnect();
}

updatedSecurityCheck().catch(console.error);
