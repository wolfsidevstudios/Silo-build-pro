import React from 'react';

const songs = [
  {
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    link: 'https://www.youtube.com/watch?v=ekr2nIex040'
  },
  {
    title: 'Die With A Smile',
    artist: 'Lady Gaga, Bruno Mars',
    link: 'https://www.youtube.com/watch?v=kPa7bsKwL-c'
  },
  {
    title: 'The Fate of Ophelia',
    artist: 'Taylor Swift',
    link: 'https://www.youtube.com/watch?v=ko70cExuzZM'
  }
];

export const MusicPlayer: React.FC = () => {
  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="w-full max-w-md">
        <span className="material-symbols-outlined text-5xl text-blue-500">
          hourglass_top
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">This build is taking a while...</h2>
        <p className="text-gray-600 mt-2 mb-6">Enjoy some music while you wait!</p>
        
        <div className="space-y-3 text-left">
          {songs.map((song, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between transition-all hover:bg-gray-100 hover:shadow-md">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-200 w-10 h-10 rounded-md flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-500">music_note</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{song.title}</p>
                  <p className="text-sm text-gray-500">{song.artist}</p>
                </div>
              </div>
              <a 
                href={song.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                title={`Play ${song.title}`}
              >
                <span className="material-symbols-outlined">play_arrow</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
