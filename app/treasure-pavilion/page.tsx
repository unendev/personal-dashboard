import { TreasureList } from '../components/TreasureList'

export default function TreasurePavilionPage() {
  return (
    <div className="log-page-layout">
      <div className="container mx-auto px-4 py-8">
        {/* 宝藏列表 */}
        <TreasureList />
      </div>
    </div>
  )
}
