import React from 'react';

type MusicCardProps = {
  isPlaying: boolean;
  trackName: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  source: string;
};

const MusicCard: React.FC<MusicCardProps> = ({ isPlaying, trackName, artist, album, albumArtUrl, source }) => {

  return (
    <div className="w-full max-w-sm p-4 rounded-lg shadow-lg bg-gray-800 text-white">
      <div className="flex">
        <img src={albumArtUrl} alt={`${album} cover`} className="w-24 h-24 rounded-md mr-4" />
        <div className="flex flex-col justify-center">
          <p className="font-bold text-xl">{trackName}</p>
          <p className="text-md">{artist}</p>
          <p className="text-sm text-gray-400">{album}</p>
          <p className="text-xs text-gray-500 mt-1">from {source}</p>
        </div>
      </div>
    </div>
  );
};

export default MusicCard;