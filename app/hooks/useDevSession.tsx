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
 * 在开发环境中自动提供用户会话，无需登录
 * 在生产环境中使用正常的 NextAuth 会话
 */
export function useDevSession(): DevSession {
  const { data: session, status } = useSession()
  const [devSession, setDevSession] = useState<DevSession>({
    data: null,
    status: 'loading'
  })

  useEffect(() => {
    // 开发环境：自动提供开发用户会话
    if (process.env.NODE_ENV === 'development') {
      setDevSession({
        data: {
          user: {
            id: 'user-1',
            email: 'dev@localhost.com',
            name: '开发用户'
          }
        },
        status: 'authenticated'
      })
    } else {
      // 生产环境：使用正常的 NextAuth 会话
      setDevSession({
        data: session,
        status: status as 'loading' | 'authenticated' | 'unauthenticated'
      })
    }
  }, [session, status])

  return devSession
}
