'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

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

/**
 * 开发环境专用的会话 Hook
 * 优先使用真实的 NextAuth 会话，只有在未登录时才提供开发用户会话
 * 在生产环境中使用正常的 NextAuth 会话
 */
export function useDevSession(): DevSession {
  const { data: session, status } = useSession()
  const [devSession, setDevSession] = useState<DevSession>({
    data: null,
    status: 'loading'
  })

  useEffect(() => {
    // 检查是否启用演示模式（默认启用）
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

    if (isDemoMode) {
      // 演示模式：优先使用真实会话，未登录时自动使用示例账户
      if (session?.user) {
        console.log('✅ 使用真实NextAuth会话:', session.user.email)
        setDevSession({
          data: session,
          status: 'authenticated'
        })
      } else if (status === 'unauthenticated') {
        // 自动获取示例账户信息
        fetch('/api/auth/ensure-demo-user', { method: 'POST' })
          .then(() => fetch('/api/auth/ensure-demo-user'))
          .then(res => res.json())
          .then(data => {
            console.log('🎭 使用演示账户:', data.email)
            setDevSession({
              data: {
                user: {
                  id: data.id,
                  email: data.email,
                  name: data.name
                }
              },
              status: 'authenticated'
            })
          })
          .catch(err => {
            console.error('获取演示账户失败:', err)
            setDevSession({
              data: null,
              status: 'unauthenticated'
            })
          })
      } else {
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
