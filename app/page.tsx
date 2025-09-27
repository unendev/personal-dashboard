import Link from 'next/link'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { 
  FileText, 
  Image, 
  Music, 
  ArrowRight,
  Sparkles
} from 'lucide-react'

export default function TreasurePavilionIntro() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        {/* 英雄区域 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            全新功能
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            藏宝阁
            <span className="block text-3xl text-gray-600 font-normal mt-2">
              Treasure Pavilion
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            记录你的想法、感受和收藏，打造属于你的数字宝藏库。
            无摩擦的输入体验，精美的展示效果，移动端优先的设计。
          </p>
          
          <Link href="/treasure-pavilion">
            <Button size="lg" className="gap-2 text-lg px-8 py-4">
              开始探索
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* 功能特性 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">文本宝藏</h3>
            <p className="text-gray-600">
              记录小说随笔、人生感悟、学习笔记等文字内容，支持 Markdown 格式。
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">图片画廊</h3>
            <p className="text-gray-600">
              上传和展示图片集合，支持多图展示和图片查看器，集成阿里云 OSS 存储。
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">音乐收藏</h3>
            <p className="text-gray-600">
              记录喜欢的音乐，支持手动输入歌曲信息，可链接到 Spotify 等平台。
            </p>
          </Card>
        </div>

        {/* 技术特性 */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-8">技术特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">无摩擦</div>
              <p className="text-gray-600">悬浮按钮快速创建，Discord 风格编辑器</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">响应式</div>
              <p className="text-gray-600">移动端优先设计，完美适配各种设备</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">标签系统</div>
              <p className="text-gray-600">灵活的标签分类和筛选功能</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">云存储</div>
              <p className="text-gray-600">集成阿里云 OSS，安全可靠</p>
            </div>
          </div>
        </div>

        {/* 底部 CTA */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">准备好开始你的宝藏之旅了吗？</h2>
          <p className="text-gray-600 mb-8">立即体验无摩擦的价值输入平台</p>
          <Link href="/treasure-pavilion">
            <Button size="lg" variant="create" className="gap-2 text-lg px-8 py-4">
              进入藏宝阁
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}