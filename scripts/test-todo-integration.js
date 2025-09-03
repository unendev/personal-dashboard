// 测试TodoList集成功能
async function testTodoIntegration() {
  try {
    console.log('测试TodoList集成功能...');
    
    const baseUrl = 'http://localhost:3000';
    const userId = 'user-1';
    const date = new Date().toISOString().split('T')[0];
    
    console.log(`用户ID: ${userId}`);
    console.log(`日期: ${date}`);
    
    // 1. 测试获取任务列表
    console.log('\n1. 测试获取任务列表...');
    const getResponse = await fetch(`${baseUrl}/api/todos?userId=${userId}&date=${date}`);
    
    if (getResponse.ok) {
      const todos = await getResponse.json();
      console.log(`✅ 获取任务列表成功，共 ${todos.length} 个任务`);
      todos.forEach(todo => {
        console.log(`  - ${todo.text} (${todo.priority}) ${todo.completed ? '✅' : '⏳'}`);
      });
    } else {
      console.log('❌ 获取任务列表失败:', getResponse.status);
    }
    
    // 2. 测试创建任务
    console.log('\n2. 测试创建任务...');
    const createResponse = await fetch(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        text: '测试任务 - 完成TodoList集成',
        priority: 'high',
        category: '开发',
        date
      }),
    });
    
    if (createResponse.ok) {
      const newTodo = await createResponse.json();
      console.log('✅ 创建任务成功');
      console.log(`  任务ID: ${newTodo.id}`);
      console.log(`  任务内容: ${newTodo.text}`);
      console.log(`  优先级: ${newTodo.priority}`);
      console.log(`  分类: ${newTodo.category}`);
      
      // 3. 测试更新任务
      console.log('\n3. 测试更新任务...');
      const updateResponse = await fetch(`${baseUrl}/api/todos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newTodo.id,
          text: newTodo.text,
          completed: true,
          priority: 'medium',
          category: newTodo.category
        }),
      });
      
      if (updateResponse.ok) {
        const updatedTodo = await updateResponse.json();
        console.log('✅ 更新任务成功');
        console.log(`  完成状态: ${updatedTodo.completed ? '已完成' : '未完成'}`);
        console.log(`  新优先级: ${updatedTodo.priority}`);
      } else {
        console.log('❌ 更新任务失败:', updateResponse.status);
      }
      
      // 4. 测试删除任务
      console.log('\n4. 测试删除任务...');
      const deleteResponse = await fetch(`${baseUrl}/api/todos?id=${newTodo.id}`, {
        method: 'DELETE',
      });
      
      if (deleteResponse.ok) {
        console.log('✅ 删除任务成功');
      } else {
        console.log('❌ 删除任务失败:', deleteResponse.status);
      }
    } else {
      console.log('❌ 创建任务失败:', createResponse.status);
    }
    
    // 5. 测试不同日期的任务
    console.log('\n5. 测试不同日期的任务...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const yesterdayResponse = await fetch(`${baseUrl}/api/todos?userId=${userId}&date=${yesterday}`);
    if (yesterdayResponse.ok) {
      const yesterdayTodos = await yesterdayResponse.json();
      console.log(`✅ 获取昨日任务成功，共 ${yesterdayTodos.length} 个任务`);
    } else {
      console.log('❌ 获取昨日任务失败:', yesterdayResponse.status);
    }
    
    console.log('\n✅ TodoList集成功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(() => {
  testTodoIntegration();
}, 2000);
