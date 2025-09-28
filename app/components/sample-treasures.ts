export const sampleTreasures = [
  {
    id: "1",
    title: "深夜思考：关于时间与存在",
    content: `**时间是什么？**

> 时间不是流逝的，流逝的是我们。

最近在读《时间简史》，霍金说时间可能只是我们感知的幻觉。这让我想到：

- 我们总是说"时间不够用"
- 但也许是我们对时间的理解有误
- 时间可能不是线性的，而是多维的

*也许真正的智慧在于：不是管理时间，而是理解时间。*

\`\`\`
时间 = 意识 × 经验 × 选择
\`\`\`

你觉得呢？时间对你来说意味着什么？`,
    type: "TEXT" as const,
    tags: ["哲学", "时间", "思考", "深夜"],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    images: []
  },
  {
    id: "2",
    title: "今日摄影：城市光影",
    content: "捕捉到了城市最美的时刻，光影交错，仿佛在诉说着什么故事。",
    type: "IMAGE" as const,
    tags: ["摄影", "城市", "光影", "艺术"],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    images: [
      {
        id: "img1",
        url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
        alt: "城市夜景",
        width: 800,
        height: 600
      },
      {
        id: "img2", 
        url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop",
        alt: "城市建筑",
        width: 800,
        height: 600
      },
      {
        id: "img3",
        url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop", 
        alt: "城市街道",
        width: 800,
        height: 600
      }
    ]
  },
  {
    id: "3",
    title: "最近在听的歌",
    content: "这首歌的旋律太治愈了，每次听都有不同的感受。",
    type: "MUSIC" as const,
    tags: ["音乐", "治愈", "旋律", "心情"],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8小时前
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    musicTitle: "Midnight City",
    musicArtist: "M83",
    musicAlbum: "Hurry Up, We're Dreaming",
    musicUrl: "https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt",
    images: []
  },
  {
    id: "4",
    title: "读书笔记：《原则》",
    content: `**达利欧的智慧**

今天读完了《原则》，收获很大：

## 核心原则
1. **极度透明** - 真相是进步的基础
2. **极度求真** - 不要被情绪左右判断
3. **系统化思考** - 建立可重复的决策框架

## 我的思考
> 原则不是教条，而是思考的工具

*最重要的不是记住原则，而是理解背后的逻辑。*

\`\`\`
问题 → 分析 → 原则 → 决策 → 反馈 → 优化
\`\`\`

这本书改变了我对工作和生活的理解。`,
    type: "TEXT" as const,
    tags: ["读书", "原则", "达利欧", "思考", "成长"],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    images: []
  },
  {
    id: "5",
    title: "旅行回忆：山间小径",
    content: "这条小径通往山顶，每一步都充满了惊喜。",
    type: "IMAGE" as const,
    tags: ["旅行", "山间", "自然", "回忆"],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    images: [
      {
        id: "img4",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
        alt: "山间小径",
        width: 800,
        height: 600
      }
    ]
  },
  {
    id: "6",
    title: "今日心情：雨后彩虹",
    content: `**雨后总会有彩虹**

今天下了一场大雨，但雨后的彩虹特别美。

- 生活就像天气，有晴有雨
- 但每一次困难后，都有新的希望
- 保持乐观，相信美好

*记住：不是所有的云都会下雨，但所有的雨都会停。*`,
    type: "TEXT" as const,
    tags: ["心情", "彩虹", "乐观", "生活"],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天前
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    images: []
  }
]
