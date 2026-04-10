import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Download, Search, Music, User as UserIcon, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { format } from 'date-fns';

interface Score {
  id: string;
  title: string;
  composer: string;
  instrument: string;
  description: string;
  uploaderName: string;
  downloads: number;
  createdAt: string;
}

export default function Market() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstrument, setFilterInstrument] = useState('All');

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    setLoading(true);
    try {
      // In a real app, we'd add pagination and more complex querying
      const q = query(
        collection(db, 'scores'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedScores: Score[] = [];
      querySnapshot.forEach((doc) => {
        fetchedScores.push({ id: doc.id, ...doc.data() } as Score);
      });
      
      setScores(fetchedScores);
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = scores.filter(score => {
    const matchesSearch = score.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (score.composer && score.composer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesInstrument = filterInstrument === 'All' || score.instrument === filterInstrument;
    return matchesSearch && matchesInstrument;
  });

  const instruments = ['All', '单簧管 (Clarinet)', '钢琴 (Piano)', '小提琴 (Violin)', '长笛 (Flute)', '萨克斯 (Saxophone)', '其他 (Other)'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">乐谱市场 (Maker World)</h1>
          <p className="text-gray-600">发现、下载并分享适用于 OmniScore 的 MusicXML 电子乐谱</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索曲名、作曲家..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-shrink-0">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
              value={filterInstrument}
              onChange={(e) => setFilterInstrument(e.target.value)}
            >
              {instruments.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredScores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScores.map((score) => (
              <ScoreCard key={score.id} score={score} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <Music className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">没有找到匹配的乐谱</h3>
            <p className="mt-1 text-gray-500">尝试调整搜索词或乐器分类</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ score }: { score: Score }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={score.title}>{score.title}</h3>
            <p className="text-sm text-gray-500">{score.composer || '未知作曲家'}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {score.instrument}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10">
          {score.description || '暂无描述'}
        </p>
        
        <div className="flex items-center text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{score.uploaderName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(score.createdAt), 'yyyy-MM-dd')}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center text-sm text-gray-500">
          <Download className="h-4 w-4 mr-1" />
          {score.downloads} 次下载
        </div>
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
          下载 MusicXML
        </button>
      </div>
    </div>
  );
}
