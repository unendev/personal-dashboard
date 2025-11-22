#!/usr/bin/env node

/**
 * 为 Neon 创建迁移文件的辅助脚本
 * 绕过 shadow database 限制
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const migrationName = process.argv[2]

if (!migrationName) {
  console.error('❌ 请提供迁移名称')
  console.log('用法: node scripts/create-migration.mjs <migration_name>')
  process.exit(1)
}

console.log(`📝 创建迁移: ${migrationName}`)

try {
  // 1. 使用 db push 同步到数据库
  console.log('\n1️⃣ 同步 schema 到数据库...')
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
  
  // 2. 创建空的迁移文件
  console.log('\n2️⃣ 创建迁移文件...')
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].slice(0, 14)
  const migrationDir = join(process.cwd(), 'prisma', 'migrations', `${timestamp}_${migrationName}`)
  
  execSync(`mkdir -p "${migrationDir}"`, { stdio: 'inherit' })
  
  // 3. 生成迁移 SQL（使用 prisma migrate diff）
  console.log('\n3️⃣ 生成迁移 SQL...')
  try {
    const sql = execSync(
      'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
      { encoding: 'utf-8' }
    )
    
    writeFileSync(join(migrationDir, 'migration.sql'), sql)
    console.log(`✅ 迁移文件已创建: ${migrationDir}`)
  } catch {
    // 如果 diff 失败，创建一个占位符
    writeFileSync(
      join(migrationDir, 'migration.sql'),
      '-- Migration created by create-migration.mjs\n-- Please add your SQL statements here\n'
    )
    console.log('⚠️ 自动生成 SQL 失败，请手动编辑迁移文件')
  }
  
  // 4. 标记迁移为已应用
  console.log('\n4️⃣ 标记迁移为已应用...')
  execSync(`npx prisma migrate resolve --applied ${timestamp}_${migrationName}`, { stdio: 'inherit' })
  
  console.log('\n✅ 迁移创建完成！')
  console.log(`\n📁 迁移文件位置: prisma/migrations/${timestamp}_${migrationName}/migration.sql`)
  
} catch (error) {
  console.error('\n❌ 创建迁移失败:', error.message)
  process.exit(1)
}

