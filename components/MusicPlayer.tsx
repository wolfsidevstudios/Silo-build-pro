
import React, { useState } from 'react';

const songs = [
  {
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    videoId: 'ekr2nIex040'
  },
  {
    title: 'Die With A Smile',
    artist: 'Lady Gaga, Bruno Mars',
    videoId: 'kPa7bsKwL-c'
  },
  {
    title: 'The Fate of Ophelia',
    artist: 'Taylor Swift',
    videoId: 'ko70cExuzZM'
  }
];

export const MusicPlayer: React.FC = () => {
    const [currentVideoId, setCurrentVideoId] = useState(songs[0].videoId);

  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="w-full max-w-xl">
        <span className="material-symbols-outlined text-5xl text-blue-500">
          hourglass_top
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">This build is taking a while...</h2>
        <p className="text-gray-600 mt-2 mb-6">Enjoy some music while you wait!</p>
        
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-4 border border-gray-200">
            <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&mute=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            ></iframe>
        </div>

        <div className="space-y-2 text-left">
          {songs.map((song) => {
            const isActive = song.videoId === currentVideoId;
            return (
                <button 
                    key={song.videoId} 
                    onClick={() => setCurrentVideoId(song.videoId)}
                    className={`w-full bg-gray-50 border rounded-lg p-2 flex items-center justify-between text-left transition-all ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:bg-gray-100'}`}
                >
                <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>
                        <span className={`material-symbols-outlined ${isActive ? 'text-white' : 'text-gray-500'}`}>{isActive ? 'volume_up' : 'music_note'}</span>
                    </div>
                    <div>
                    <p className="font-semibold text-sm text-gray-900">{song.title}</p>
                    <p className="text-xs text-gray-500">{song.artist}</p>
                    </div>
                </div>
                </button>
            )
          })}
        </div>
      </div>
    </div>
  );
};
