interface Log {
  id: string
  content: string | null // Content can be null now
  createdAt: Date
  quest?: {
    id: string
    title: string
  } | null
  dailySummary?: any | null // Add dailySummary field
}

interface LogCardProps {
  log: Log
}

export default function LogCard({ log }: LogCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const renderDailySummaryCategory = (title: string, data: any, level: number = 0) => {
    if (!data || Object.values(data).every(val => !val || (typeof val === 'object' && Object.values(val).every(subVal => !subVal)))) {
      return null; // Don't render if all children are empty
    }

    const indentClass = level === 0 ? '' : (level === 1 ? 'pl-4 border-l border-gray-200' : 'pl-2');
    const titleClass = level === 0 ? 'text-lg font-semibold text-gray-800 mb-2' : (level === 1 ? 'text-md font-medium text-gray-700' : 'text-sm font-medium text-gray-600');
    const valueClass = 'text-sm text-gray-700';

    return (
      <div key={title} className={`mt-2 ${indentClass}`}>
        <p className={titleClass}>{title}</p>
        {Object.entries(data).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const subCategoryTitle = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return renderDailySummaryCategory(subCategoryTitle, value, level + 1);
          } else if (value) {
            const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return <p key={key} className={`${valueClass} ml-2`}>{fieldName}: {value}</p>;
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {log.content && <p className="text-gray-800">{log.content}</p>}
          {!log.content && !log.dailySummary && <p className="text-gray-500 italic">无日志内容或每日总结</p>}
        </div>
        <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
          {formatDate(log.createdAt)}
        </span>
      </div>

      {log.quest && (
        <div className="text-sm text-blue-600 mt-2">
          关联任务: {log.quest.title}
        </div>
      )}

      {log.dailySummary && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-2">每日总结</h3>
          {renderDailySummaryCategory('价值投资 (Investment)', log.dailySummary.investment, 0)}
          {renderDailySummaryCategory('精力补充 (Replenishment)', log.dailySummary.replenishment, 0)}
          {renderDailySummaryCategory('系统维持 (Maintenance)', log.dailySummary.maintenance, 0)}
          {renderDailySummaryCategory('时间黑洞 (Time Sink)', log.dailySummary.timeSink, 0)}
        </div>
      )}
    </div>
  )
}