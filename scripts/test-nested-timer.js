import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNestedTimer() {
  console.log('🧪 测试嵌套计时器功能...\n');

  try {
    // 清理测试数据
    await prisma.timerTask.deleteMany({
      where: {
        userId: 'test-user'
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: 'test-user'
      }
    });

    console.log('✅ 清理了测试数据');

    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    console.log('✅ 创建了测试用户:', testUser.name);

    // 创建顶级任务
    const parentTask = await prisma.timerTask.create({
      data: {
        name: '学习编程',
        categoryPath: '学习',
        elapsedTime: 3600, // 1小时
        initialTime: 0,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        date: new Date().toISOString().split('T')[0],
        userId: 'test-user'
      }
    });

    console.log('✅ 创建了顶级任务:', parentTask.name);

    // 创建子任务
    const childTask1 = await prisma.timerTask.create({
      data: {
        name: '学习React',
        categoryPath: '前端开发',
        elapsedTime: 1800, // 30分钟
        initialTime: 0,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        date: new Date().toISOString().split('T')[0],
        userId: 'test-user',
        parentId: parentTask.id
      }
    });

    const childTask2 = await prisma.timerTask.create({
      data: {
        name: '学习TypeScript',
        categoryPath: '前端开发',
        elapsedTime: 1800, // 30分钟
        initialTime: 0,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        date: new Date().toISOString().split('T')[0],
        userId: 'test-user',
        parentId: parentTask.id
      }
    });

    console.log('✅ 创建了子任务:', childTask1.name, '和', childTask2.name);

    // 创建孙任务
    const grandChildTask = await prisma.timerTask.create({
      data: {
        name: '学习React Hooks',
        categoryPath: 'React',
        elapsedTime: 900, // 15分钟
        initialTime: 0,
        isRunning: false,
        startTime: null,
        isPaused: false,
        pausedTime: 0,
        date: new Date().toISOString().split('T')[0],
        userId: 'test-user',
        parentId: childTask1.id
      }
    });

    console.log('✅ 创建了孙任务:', grandChildTask.name);

    // 测试查询层级结构
    const hierarchicalTasks = await prisma.timerTask.findMany({
      where: {
        userId: 'test-user',
        parentId: null // 只查询顶级任务
      },
      include: {
        children: {
          include: {
            children: true
          }
        }
      }
    });

    console.log('\n📊 层级结构测试结果:');
    console.log('顶级任务数量:', hierarchicalTasks.length);
    
    hierarchicalTasks.forEach(task => {
      console.log(`\n📁 ${task.name} (${task.elapsedTime}秒)`);
      if (task.children && task.children.length > 0) {
        task.children.forEach(child => {
          console.log(`  📄 ${child.name} (${child.elapsedTime}秒)`);
          if (child.children && child.children.length > 0) {
            child.children.forEach(grandChild => {
              console.log(`    📄 ${grandChild.name} (${grandChild.elapsedTime}秒)`);
            });
          }
        });
      }
    });

    // 测试计算总时间
    const calculateTotalTime = (task) => {
      let total = task.elapsedTime;
      if (task.children) {
        task.children.forEach(child => {
          total += calculateTotalTime(child);
        });
      }
      return total;
    };

    const totalTime = hierarchicalTasks.reduce((sum, task) => {
      return sum + calculateTotalTime(task);
    }, 0);

    console.log('\n⏱️ 总时间计算:');
    console.log('预期总时间: 3600 + 1800 + 1800 + 900 = 8100秒');
    console.log('实际总时间:', totalTime, '秒');
    console.log('测试结果:', totalTime === 8100 ? '✅ 通过' : '❌ 失败');

    // 测试统计信息
    const allTasks = await prisma.timerTask.findMany({
      where: {
        userId: 'test-user'
      }
    });

    const topLevelTasks = allTasks.filter(task => !task.parentId);
    const tasksWithChildren = topLevelTasks.filter(task => 
      allTasks.some(child => child.parentId === task.id)
    );

    console.log('\n📈 统计信息:');
    console.log('总任务数:', allTasks.length);
    console.log('顶级任务数:', topLevelTasks.length);
    console.log('有子任务的任务数:', tasksWithChildren.length);

    console.log('\n🎉 嵌套计时器功能测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNestedTimer();
