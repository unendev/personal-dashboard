'use client';

import React from 'react';
import MusicCard from './MusicCard';

// 示例 mock data
const currentTrack = {
  isPlaying: true,
  trackName: 'Yesterday',
  artist: 'The Beatles',
  album: 'Help!',
  albumArtUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e7/Help_album_cover.jpg',
  source: 'Spotify'
};

const MusicWidget = () => {
  return (
    <div className="w-full max-w-sm mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Currently Playing</h2>
      <MusicCard {...currentTrack} />
    </div>
  );
};

export default MusicWidget;