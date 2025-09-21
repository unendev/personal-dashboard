import { prisma } from '@/lib/prisma';

// 与路由内的 MusicData 结构保持一致（必要字段）
export type SpotifyCachePayload = {
  isPlaying: boolean;
  trackName: string;
  artist: string;
  album: string;
  albumArtUrl?: string;
  source: string;
  isFromCache?: boolean;
  cachedAt?: string;
} | { message: string; isFromCache?: boolean; cachedAt?: string };

const DEFAULT_USER_ID = 'user-1';

async function ensureTable(): Promise<void> {
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS spotify_cache (
      user_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  } catch (error) {
    // 忽略建表失败（例如权限不足或无数据库），上层会回退到文件缓存
    console.warn('ensureTable failed or skipped:', error);
  }
}

export async function readSpotifyCache(userId: string = DEFAULT_USER_ID): Promise<SpotifyCachePayload | null> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`SELECT payload FROM spotify_cache WHERE user_id = ${userId} LIMIT 1`;
    if (rows && rows.length > 0) {
      return rows[0].payload as SpotifyCachePayload;
    }
    return null;
  } catch (error) {
    console.warn('readSpotifyCache failed, fallback to file cache:', error);
    return null;
  }
}

export async function writeSpotifyCache(payload: SpotifyCachePayload, userId: string = DEFAULT_USER_ID): Promise<void> {
  try {
    await ensureTable();
    // 使用 UPSERT 保持单条记录
    await prisma.$executeRaw`INSERT INTO spotify_cache (user_id, payload, updated_at)
      VALUES (${userId}, ${JSON.stringify(payload)}::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`;
  } catch (error) {
    console.warn('writeSpotifyCache failed, will fallback to file cache:', error);
  }
}


