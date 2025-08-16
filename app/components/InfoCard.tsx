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
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center mb-2">
        <img src={avatar} alt={`${author}'s avatar`} className="w-8 h-8 rounded-full mr-3" />
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-xs text-gray-500">{source} · {timestamp}</p>
        </div>
      </div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-gray-700 text-sm">{summary}</p>
    </div>
  );
};

export default InfoCard;