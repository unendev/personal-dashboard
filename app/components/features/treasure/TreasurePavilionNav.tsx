'use client'

import Link from 'next/link'
import { FileText, Network, Box } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function TreasurePavilionNav() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/treasure-pavilion',
      label: '宝藏',
      icon: Box,
      active: pathname === '/treasure-pavilion'
    },
    {
      href: '/treasure-pavilion/articles',
      label: '专题',
      icon: FileText,
      active: pathname?.startsWith('/treasure-pavilion/articles')
    },
    {
      href: '/treasure-pavilion/mindmap',
      label: '思维导图',
      icon: Network,
      active: pathname === '/treasure-pavilion/mindmap'
    }
  ]

  return (
    <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 py-2">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  item.active
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
