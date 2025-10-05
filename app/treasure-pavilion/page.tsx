import { TreasureList } from '../components/features/treasure/TreasureList'
import { TreasurePavilionNav } from '../components/features/treasure/TreasurePavilionNav'

export default function TreasurePavilionPage() {
  return (
    <div className="log-page-layout">
      <TreasurePavilionNav />
      <div className="container mx-auto px-4 py-8">
        {/* 宝藏列表 */}
        <TreasureList />
      </div>
    </div>
  )
}
