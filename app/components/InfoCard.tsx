import React from 'react';

type InfoCardProps = {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
};

const InfoCard: React.FC<InfoCardProps> = ({ source, avatar, author, title, summary, timestamp }) => {
  // 根据来源设置不同的主题色
  const getSourceColor = (source: string) => {
    const colors = {
      'Bilibili': 'from-pink-500 to-rose-500',
      'Linux.do': 'from-blue-500 to-cyan-500',
      '阮一峰周刊': 'from-purple-500 to-indigo-500',
      'Twitter': 'from-sky-500 to-blue-500',
      'default': 'from-gray-500 to-slate-500'
    };
    return colors[source as keyof typeof colors] || colors.default;
  };

  const sourceGradient = getSourceColor(source);

  return (
    <div className="glass-effect rounded-xl p-4 hover-lift group cursor-pointer animate-fade-in-up">
      {/* 头部信息 */}
      <div className="flex items-start mb-3">
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt={`${author}'s avatar`}
            className="w-10 h-10 rounded-full mr-3 ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=667eea&color=fff&size=40`;
            }}
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r ${sourceGradient} rounded-full border-2 border-white`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm group-hover:text-white/90 transition-colors truncate">
            {author}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`px-1.5 py-0.5 rounded-full bg-gradient-to-r ${sourceGradient} text-white text-xs font-medium`}>
              {source}
            </span>
            <span className="truncate">· {timestamp}</span>
          </div>
        </div>
      </div>

      {/* 标题 */}
      <h3 className="font-bold text-lg mb-2 text-white group-hover:text-white/95 transition-colors leading-tight line-clamp-2">
        {title}
      </h3>

      {/* 摘要 */}
      <p className="text-white/70 text-xs leading-relaxed line-clamp-2 group-hover:text-white/80 transition-colors">
        {summary}
      </p>

      {/* 底部渐变条 */}
      <div className={`mt-3 h-0.5 bg-gradient-to-r ${sourceGradient} rounded-full opacity-60 group-hover:opacity-100 transition-opacity`}></div>
    </div>
  );
};

export default InfoCard;