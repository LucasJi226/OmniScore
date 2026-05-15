import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Play, Pause, Download, StopCircle } from 'lucide-react';
// @ts-ignore
import * as alphaTab from '@coderline/alphatab';

export default function ScorePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scoreTitle, setScoreTitle] = useState('Loading...');

  useEffect(() => {
    if (!containerRef.current || !id) return;

    // Load alphaTab
    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        useWorkers: false,
        fontDirectory: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/',
      },
      display: {
        layoutMode: alphaTab.LayoutMode.Page,
        staveProfile: alphaTab.StaveProfile.Score
      },
      player: {
        enablePlayer: true,
        soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
        scrollElement: containerRef.current.parentNode // use parent for scrolling
      }
    });

    apiRef.current = api;

    api.scoreLoaded.on((score: any) => {
      setScoreTitle(score.title || 'Score');
      setLoading(false);
    });

    api.playerStateChanged.on((args: any) => {
      setIsPlaying(args.state === 1); // 1 = playing, 0 = paused
    });

    api.error.on((e: any) => {
      console.error('alphaTab error:', e);
      setScoreTitle('Error rendering score');
      setLoading(false);
    });

    // Manually fetch and load to avoid extension/worker issues
    fetch(`/api/scores/${id}/download`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch score: ${res.statusText}`);
        }
        return res.arrayBuffer();
      })
      .then(buffer => {
        const uint8 = new Uint8Array(buffer);
        api.load(uint8);
      })
      .catch(err => {
        console.error('Failed to load score:', err);
        setScoreTitle('Error loading score');
        setLoading(false);
      });

    return () => {
      api.destroy();
    };
  }, [id]);

  const togglePlay = () => {
    if (!apiRef.current) return;
    apiRef.current.playPause();
  };
  
  const stopPlay = () => {
    if (!apiRef.current) return;
    apiRef.current.stop();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate max-w-xs sm:max-w-md">{scoreTitle}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={stopPlay}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Stop"
          >
            <StopCircle className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={togglePlay}
            disabled={loading}
            className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-50`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Score & Audio Engine...</p>
            </div>
          </div>
        )}
        
        <div className="max-w-5xl mx-auto py-8 px-4 flex justify-center">
          <div className="bg-white shadow-lg overflow-x-auto p-4 w-full" style={{ minHeight: '800px' }}>
            <div ref={containerRef} className="w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
