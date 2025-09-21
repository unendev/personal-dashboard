import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 禁用静态优化，避免构建时执行数据库查询
  output: 'standalone',
};
