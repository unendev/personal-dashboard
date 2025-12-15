import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 注意：standalone 输出在 Windows 上需要管理员权限创建符号链接
  // Vercel 部署不需要此选项
  // output: 'standalone',
  
  // 配置图片域名
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.aliyuncs.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // 忽略 ESLint 错误，避免构建失败
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
