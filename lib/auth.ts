import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  // 暂时移除 PrismaAdapter，使用纯 JWT 策略
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !('password' in user) || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    // 开发环境下延长会话时间，减少重新登录的麻烦
    maxAge: process.env.NODE_ENV === 'development' ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 开发环境30天，生产环境7天
  },
  jwt: {
    // JWT配置优化
    maxAge: process.env.NODE_ENV === 'development' ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // 开发环境下添加特殊标记
        if (process.env.NODE_ENV === 'development') {
          token.isDev = true
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        // 开发环境下添加特殊标记
        if (process.env.NODE_ENV === 'development') {
          (session as { isDev?: boolean }).isDev = token.isDev as boolean
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  // 开发环境下的调试配置
  debug: process.env.NODE_ENV === 'development',
}
