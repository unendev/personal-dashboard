'use client'

import { useSession, signIn } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'

interface DevSession {
  data: {
    user: {
      id: string
      email?: string | null | undefined
      name?: string | null | undefined
    }
  } | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
}

// 本地存储键，用于标记用户是否手动登出
const MANUAL_LOGOUT_KEY = 'manual_logout'
const AUTO_LOGIN_ATTEMPTED_KEY = 'auto_login_attempted'
const AUTH_PERSISTENT_KEY = 'auth_persistent' // 认证缓存，用于断网时保持登录状态

/**
 * 开发环境专用的会话 Hook
 * 优先使用真实的 NextAuth 会话，只有在未登录时才自动登录示例账户
 * 在演示模式下，会自动触发真实的 NextAuth 登录
 */
export function useDevSession(): DevSession {
  const { data: session, status } = useSession()
  const [devSession, setDevSession] = useState<DevSession>({
    data: null,
    status: 'loading'
  })
  const autoLoginAttemptedRef = useRef(false)

  useEffect(() => {
    // 检查是否启用演示模式（默认启用）
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'
    
    // 检查是否手动登出
    const hasManualLogout = typeof window !== 'undefined' && localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true'

    if (isDemoMode) {
      // 演示模式：优先使用真实会话，未登录时自动登录示例账户
      if (session?.user) {
        // 用户已登录，清除手动登出标记和自动登录尝试标记
        if (typeof window !== 'undefined') {
          localStorage.removeItem(MANUAL_LOGOUT_KEY)
          localStorage.removeItem(AUTO_LOGIN_ATTEMPTED_KEY)
          
          // 【新增】缓存认证状态，用于断网时保持登录
          localStorage.setItem(AUTH_PERSISTENT_KEY, JSON.stringify({
            authenticated: true,
            userId: session.user.id,
            email: session.user.email,
            name: session.user.name,
            timestamp: Date.now()
          }))
        }
        autoLoginAttemptedRef.current = false
        console.log('✅ 使用真实NextAuth会话:', session.user.email)
        setDevSession({
          data: session,
          status: 'authenticated'
        })
      } else if (status === 'unauthenticated') {
        // 【新增】未登录时，先检查缓存的认证状态（用于断网场景）
        if (typeof window !== 'undefined' && !hasManualLogout) {
          const authCache = localStorage.getItem(AUTH_PERSISTENT_KEY)
          if (authCache) {
            try {
              const cached = JSON.parse(authCache)
              const cacheAge = Date.now() - cached.timestamp
              const maxAge = 24 * 60 * 60 * 1000 // 24小时
              
              if (cacheAge < maxAge) {
                // 缓存未过期，使用缓存的认证状态
                console.log('🔌 检测到网络问题，使用缓存的认证状态保持登录')
                setDevSession({
                  data: {
                    user: {
                      id: cached.userId,
                      email: cached.email,
                      name: cached.name
                    }
                  },
                  status: 'authenticated'
                })
                return // 直接返回，不执行后续的自动登录逻辑
              } else {
                // 缓存已过期，清除
                localStorage.removeItem(AUTH_PERSISTENT_KEY)
              }
            } catch (error) {
              console.error('解析认证缓存失败:', error)
              localStorage.removeItem(AUTH_PERSISTENT_KEY)
            }
          }
        }
        
        // 如果没有缓存或缓存已过期，尝试自动登录示例账户
        if (!hasManualLogout && !autoLoginAttemptedRef.current) {
        autoLoginAttemptedRef.current = true
        console.log('🎭 尝试自动登录演示账户...')
        
        // 确保演示用户存在
        fetch('/api/auth/ensure-demo-user', { method: 'POST' })
          .then(() => fetch('/api/auth/ensure-demo-user'))
          .then(res => res.json())
          .then(async (data) => {
            console.log('🔐 使用演示账户登录:', data.email)
            // 使用 NextAuth 的 signIn 函数进行真实登录
            const result = await signIn('credentials', {
              email: data.email,
              password: data.password,
              redirect: false,
            })
            
            if (result?.ok) {
              console.log('✅ 演示账户登录成功')
              if (typeof window !== 'undefined') {
                localStorage.setItem(AUTO_LOGIN_ATTEMPTED_KEY, 'true')
              }
            } else {
              console.error('❌ 演示账户登录失败:', result?.error)
              setDevSession({
                data: null,
                status: 'unauthenticated'
              })
            }
          })
          .catch(err => {
            console.error('获取演示账户信息失败:', err)
            setDevSession({
              data: null,
              status: 'unauthenticated'
            })
          })
        } else {
          // 手动登出或已尝试自动登录
          setDevSession({
            data: null,
            status: 'unauthenticated'
          })
        }
      } else if (status === 'loading') {
        setDevSession({
          data: null,
          status: 'loading'
        })
      } else {
        // 其他状态
        setDevSession({
          data: null,
          status: status as 'loading' | 'authenticated' | 'unauthenticated'
        })
      }
    } else {
      // 非演示模式：使用正常的 NextAuth 会话
      setDevSession({
        data: session,
        status: status as 'loading' | 'authenticated' | 'unauthenticated'
      })
    }
  }, [session, status])

  return devSession
}

/**
 * 标记用户手动登出
 * 调用此函数后，useDevSession 将不会自动登录示例账户
 */
export function markManualLogout() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true')
    // 【新增】清除认证缓存
    localStorage.removeItem(AUTH_PERSISTENT_KEY)
  }
}

/**
 * 清除手动登出标记
 * 调用此函数后，useDevSession 将恢复自动登录示例账户的行为
 */
export function clearManualLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MANUAL_LOGOUT_KEY)
  }
}
