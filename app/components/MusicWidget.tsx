'use client';

import React, { useState, useEffect } from 'react';
import MusicCard from './MusicCard';

type Track = {
  isPlaying: boolean;
  trackName: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  source: string;
};

const MusicWidget = () => {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/music/currently-playing');
        if (!response.ok) {
          throw new Error('Failed to fetch track');
        }
        const data = await response.json();
        setTrack(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchTrack, 30000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Currently Playing</h2>
      {loading && <div className="text-center">Loading...</div>}
      {error && <div className="text-center text-red-500">Error: {error}</div>}
      {track && <MusicCard {...track} />}
    </div>
  );
};

export default MusicWidget;