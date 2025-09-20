import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// 超级管理员密钥（仅在开发环境使用）
const SUPER_ADMIN_KEY = process.env.SUPER_ADMIN_KEY || 'dev-super-admin-2024';

// 开发环境标识
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 统一的认证检查函数
 * 支持多种认证方式：
 * 1. NextAuth.js 会话认证
 * 2. 超级管理员密钥认证（仅开发环境）
 * 3. API密钥认证（向后兼容）
 */
export async function getAuthenticatedUser(request: NextRequest) {
  // 方式1: 开发环境自动认证（无需任何密钥）
  if (isDevelopment) {
    // 检查是否有超级管理员密钥
    const superAdminKey = request.headers.get('x-super-admin-key') || 
                         request.nextUrl.searchParams.get('superAdminKey');
    
    if (superAdminKey === SUPER_ADMIN_KEY) {
      return {
        id: 'super-admin',
        email: 'super-admin@dev.local',
        name: '超级管理员',
        isSuperAdmin: true,
        authMethod: 'super-admin-key'
      };
    }

    // 开发环境自动认证 - 无需任何密钥
    console.log('🔓 开发环境自动认证激活');
    return {
      id: 'dev-user-1',
      email: 'dev@localhost.com',
      name: '开发用户',
      isSuperAdmin: true,
      authMethod: 'dev-auto'
    };
  }

  // 方式2: NextAuth.js 会话认证
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isSuperAdmin: false,
        authMethod: 'session'
      };
    }
  } catch (error) {
    console.warn('Session authentication failed:', error);
  }

  // 方式3: 向后兼容的API密钥认证
  const apiKey = request.headers.get('x-api-key') || 
                request.nextUrl.searchParams.get('apiKey');
  
  if (apiKey === 'dev-api-key-2024') {
    return {
      id: 'user-1',
      email: 'dev@local.com',
      name: '开发用户',
      isSuperAdmin: false,
      authMethod: 'api-key'
    };
  }

  return null;
}

/**
 * 认证中间件 - 用于API路由
 * 如果认证失败，返回401错误
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return {
      error: 'Unauthorized',
      message: '需要认证才能访问此资源',
      status: 401
    };
  }

  return { user };
}

/**
 * 获取用户ID的便捷函数
 * 支持多种认证方式，优先使用认证用户，回退到URL参数
 */
export async function getUserId(request: NextRequest): Promise<string> {
  const authResult = await requireAuth(request);
  
  if (authResult.error) {
    // 如果认证失败，尝试从URL参数获取userId（向后兼容）
    const userId = request.nextUrl.searchParams.get('userId');
    if (userId) {
      console.warn('使用URL参数userId，建议使用认证方式');
      return userId;
    }
    
    throw new Error(authResult.message);
  }

  return authResult.user!.id;
}

/**
 * 检查是否为超级管理员
 */
export async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  return user?.isSuperAdmin || false;
}

/**
 * 开发环境专用的认证绕过函数
 * 仅在开发环境下有效
 */
export function getDevUserId(): string {
  if (!isDevelopment) {
    throw new Error('开发环境认证绕过仅在开发环境下可用');
  }
  return 'user-1';
}
