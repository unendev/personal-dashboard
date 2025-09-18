'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="p-8">加载中...</div>
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">身份验证测试</h1>
        <p className="mb-4">您尚未登录</p>
        <button
          onClick={() => signIn()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          登录
        </button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">身份验证测试</h1>
      <div className="mb-4">
        <p><strong>状态:</strong> 已登录</p>
        <p><strong>用户ID:</strong> {session?.user?.id}</p>
        <p><strong>邮箱:</strong> {session?.user?.email}</p>
        <p><strong>姓名:</strong> {session?.user?.name}</p>
      </div>
      <button
        onClick={() => signOut()}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        登出
      </button>
    </div>
  )
}
