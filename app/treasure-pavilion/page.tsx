import { TreasureList } from '../components/TreasureList'

export default function TreasurePavilionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">藏宝阁</h1>
          <p className="text-gray-600">
            记录你的想法、感受和收藏，打造属于你的数字宝藏库
          </p>
        </div>

        {/* 宝藏列表 */}
        <TreasureList />
      </div>
    </div>
  )
}
