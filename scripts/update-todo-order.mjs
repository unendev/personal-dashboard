import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTodoOrder() {
  try {
    console.log('开始更新Todo排序字段...');
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true }
    });
    
    for (const user of users) {
      console.log(`处理用户: ${user.id}`);
      
      // 获取该用户的所有日期
      const dates = await prisma.todo.findMany({
        where: { userId: user.id },
        select: { date: true },
        distinct: ['date']
      });
      
      for (const dateRecord of dates) {
        const date = dateRecord.date;
        console.log(`  处理日期: ${date}`);
        
        // 获取该用户该日期的所有根任务
        const rootTodos = await prisma.todo.findMany({
          where: {
            userId: user.id,
            date: date,
            parentId: null
          },
          orderBy: [
            { priority: 'desc' },
            { createdAtUnix: 'desc' }
          ]
        });
        
        // 更新根任务的order
        for (let i = 0; i < rootTodos.length; i++) {
          await prisma.todo.update({
            where: { id: rootTodos[i].id },
            data: { order: i }
          });
          
          // 获取该根任务的所有子任务
          const childTodos = await prisma.todo.findMany({
            where: {
              userId: user.id,
              date: date,
              parentId: rootTodos[i].id
            },
            orderBy: [
              { priority: 'desc' },
              { createdAtUnix: 'desc' }
            ]
          });
          
          // 更新子任务的order
          for (let j = 0; j < childTodos.length; j++) {
            await prisma.todo.update({
              where: { id: childTodos[j].id },
              data: { order: j }
            });
          }
          
          console.log(`    根任务 "${rootTodos[i].text}" 及其 ${childTodos.length} 个子任务已更新排序`);
        }
      }
    }
    
    console.log('Todo排序字段更新完成！');
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTodoOrder();



