'use client';

import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';

type FeedItem = {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  url: string;
};

const InfoStreamWidget = () => {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/feeds');
        if (!response.ok) {
          throw new Error('Failed to fetch feeds');
        }
        const data = await response.json();
        setFeeds(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  if (loading) {
    return <div className="text-center">Loading feeds...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        {feeds.map((feed, index) => (
          <a href={feed.url} key={index} target="_blank" rel="noopener noreferrer" className="block">
            <InfoCard
              source={feed.source}
              avatar={feed.avatar}
              author={feed.author}
              title={feed.title}
              summary={feed.summary}
              timestamp={new Date(feed.timestamp).toLocaleString()}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default InfoStreamWidget;