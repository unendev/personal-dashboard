const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建Twitter缓存表...');

  try {
    // 检查表是否已存在
    const existingUsers = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'twitter_users'
      );
    `;

    if (existingUsers[0].exists) {
      console.log('Twitter缓存表已存在，跳过创建');
      return;
    }

    // 创建TwitterUser表
    await prisma.$executeRaw`
      CREATE TABLE "twitter_users" (
        "id" TEXT NOT NULL,
        "twitterId" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "profileImageUrl" TEXT,
        "publicMetrics" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT,
        
        CONSTRAINT "twitter_users_pkey" PRIMARY KEY ("id")
      );
    `;

    // 创建TwitterTweet表
    await prisma.$executeRaw`
      CREATE TABLE "twitter_tweets" (
        "id" TEXT NOT NULL,
        "twitterId" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL,
        "publicMetrics" JSONB NOT NULL,
        "authorId" TEXT NOT NULL,
        "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "twitter_tweets_pkey" PRIMARY KEY ("id")
      );
    `;

    // 创建索引
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "twitter_users_twitterId_key" ON "twitter_users"("twitterId");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "twitter_users_username_key" ON "twitter_users"("username");
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "twitter_tweets_twitterId_key" ON "twitter_tweets"("twitterId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX "twitter_tweets_expiresAt_idx" ON "twitter_tweets"("expiresAt");
    `;

    await prisma.$executeRaw`
      CREATE INDEX "twitter_tweets_authorId_idx" ON "twitter_tweets"("authorId");
    `;

    // 添加外键约束
    await prisma.$executeRaw`
      ALTER TABLE "twitter_users" ADD CONSTRAINT "twitter_users_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    await prisma.$executeRaw`
      ALTER TABLE "twitter_tweets" ADD CONSTRAINT "twitter_tweets_authorId_fkey" 
      FOREIGN KEY ("authorId") REFERENCES "twitter_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    console.log('✅ Twitter缓存表创建成功！');
    console.log('📊 表结构:');
    console.log('  - twitter_users: 存储Twitter用户信息');
    console.log('  - twitter_tweets: 存储Twitter推文数据');
    console.log('  - 缓存有效期: 1小时');
    console.log('  - 自动清理过期数据');

  } catch (error) {
    console.error('❌ 创建Twitter缓存表失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
