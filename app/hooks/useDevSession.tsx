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
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：优先使用真实会话，未登录时才提供开发用户
      if (session?.user) {
        console.log('✅ 使用真实NextAuth会话:', session.user.email)
        setDevSession({
          data: session,
          status: 'authenticated'
        })
      } else if (status === 'unauthenticated') {
        // 检查是否禁用开发用户自动登录
        const disableDevAutoLogin = process.env.NEXT_PUBLIC_DISABLE_DEV_AUTO_LOGIN === 'true'
        
        if (disableDevAutoLogin) {
          console.log('🚫 开发用户自动登录已禁用')
          setDevSession({
            data: null,
            status: 'unauthenticated'
          })
        } else {
          console.log('🔓 使用开发用户会话（回退模式）')
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
        }
      } else {
        setDevSession({
          data: null,
          status: status as 'loading' | 'authenticated' | 'unauthenticated'
        })
      }
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
