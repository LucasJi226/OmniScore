import React, { useState, useEffect, useRef } from 'react';
import abcjs from 'abcjs';
import 'abcjs/abcjs-audio.css';
import { Loader2, Music, Play, Square, Sparkles, RefreshCcw } from 'lucide-react';

export default function Composer() {
  const [prompt, setPrompt] = useState('生成一段适合初学者弹奏的 C 大调欢快旋律，长度 8 个小节');
  const [model, setModel] = useState('Qwen/Qwen2.5-72B-Instruct');
  const [abcText, setAbcText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const paperRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<any>(null);

  useEffect(() => {
    if (abcText && paperRef.current) {
      try {
        const visualObj = abcjs.renderAbc(paperRef.current, abcText, {
          responsive: 'resize',
          add_classes: true,
        });

        // Setup audio synth
        if (!synthRef.current) {
          synthRef.current = new abcjs.synth.CreateSynth();
        }

        if (!audioContextRef.current) {
          // @ts-ignore
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
        }

        synthRef.current.init({
          audioContext: audioContextRef.current,
          visualObj: visualObj[0],
        }).then(() => {
          synthRef.current.prime();
        }).catch((err: any) => {
          console.error("Audio init error:", err);
        });

      } catch (err) {
        console.error("ABC rendering error:", err);
      }
    }
  }, [abcText]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setIsPlaying(false);
    if (synthRef.current) synthRef.current.stop();

    try {
      const res = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setAbcText(data.abc);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!synthRef.current || !audioContextRef.current) return;

    if (isPlaying) {
      synthRef.current.stop();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      synthRef.current.start();
      setIsPlaying(true);
      // Optional: Handle the end of playback to reset the button
      // `abcjs.synth` does not have a clear "onended" event in simple usage,
      // so we might just leave the user to click stop.
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-100 p-3 rounded-xl border border-indigo-200">
          <Sparkles className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Composer</h1>
          <p className="text-gray-500 mt-1">使用大型语言模型自动谱写一段乐谱</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 border border-gray-200 bg-white shadow-sm rounded-2xl p-6">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">模型 (Model)</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              >
                <option value="Qwen/Qwen2.5-72B-Instruct">Qwen2.5-72B-Instruct</option>
                <option value="deepseek-ai/DeepSeek-V3">DeepSeek-V3</option>
                <option value="meta-llama/Llama-3-70b-chat-hf">Llama-3-70b</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">均通过硅基流动 API 调用。</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">提示词 (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none font-medium text-gray-800"
                placeholder="例如：生成一段适合初学者弹奏的 C 大调欢快旋律..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成乐谱
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-2">
          {abcText ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Music className="w-5 h-5 text-indigo-500" />
                  生成结果
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={togglePlayback}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
                  >
                    {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    {isPlaying ? '停止' : '播放'}
                  </button>
                  <button
                    onClick={() => {
                        setIsPlaying(false);
                        if (synthRef.current) synthRef.current.stop();
                        handleGenerate({ preventDefault: () => {} } as any);
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    重新生成
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-auto flex-grow flex items-center justify-center bg-gray-50/50">
                <div ref={paperRef} className="w-full max-w-full overflow-x-auto bg-white p-4 rounded-xl border border-gray-100 shadow-sm"></div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <details className="text-sm">
                  <summary className="font-medium text-gray-500 cursor-pointer select-none">
                    查看 ABC 代码
                  </summary>
                  <pre className="mt-4 p-4 bg-gray-900 border border-gray-200 rounded-xl overflow-auto text-gray-100 font-mono text-xs shadow-inner">
                    {abcText}
                  </pre>
                </details>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-6 text-center">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Music className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">等待生成</p>
              <p className="mt-2 text-sm text-gray-400 max-w-sm">
                在左侧输入您想要的音乐描述，AI 将为您谱写出对应的琴谱。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
