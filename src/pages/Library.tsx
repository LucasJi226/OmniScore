import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileMusic, Trash2, Globe, Lock, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Score {
  id: string;
  title: string;
  composer: string;
  instrument: string;
  description: string;
  is_public: boolean;
  created_at: string;
  uploader_name: string;
}

export default function Library() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [instrument, setInstrument] = useState('单簧管 (Clarinet)');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyScores();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyScores = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scores/me');
      if (res.ok) {
        const data = await res.json();
        setScores(data);
      }
    } catch (error) {
      console.error("Error fetching my scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('composer', composer);
      formData.append('instrument', instrument);
      formData.append('description', description);
      formData.append('isPublic', isPublic.toString());

      const res = await fetch('/api/scores', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      // Reset form and close modal
      setFile(null);
      setTitle('');
      setComposer('');
      setDescription('');
      setIsPublic(false);
      setIsUploadModalOpen(false);
      
      // Refresh list
      fetchMyScores();
      
    } catch (error) {
      console.error("Error uploading score:", error);
      alert("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (scoreId: string) => {
    if (!window.confirm("确定要删除这个乐谱吗？此操作不可恢复。")) return;
    
    try {
      const res = await fetch(`/api/scores/${scoreId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setScores(scores.filter(s => s.id !== scoreId));
    } catch (error) {
      console.error("Error deleting score:", error);
      alert("删除失败");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md w-full">
          <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600 mb-6">请先登录以管理您的个人乐谱库和同步到 OmniScore 设备。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">我的乐谱库</h1>
            <p className="text-gray-600">管理您的电子乐谱，它们将自动同步到您的 M5Stack Core2 设备</p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="h-5 w-5 mr-1" />
            上传新乐谱
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : scores.length > 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {scores.map((score) => (
                <li key={score.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 gap-4">
                      <div className="bg-indigo-100 p-3 rounded-lg hidden sm:block">
                        <FileMusic className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{score.title}</h3>
                          {score.is_public ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <Globe className="h-3 w-3 mr-1" /> 公开
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              <Lock className="h-3 w-3 mr-1" /> 私有
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-1">
                          <span>{score.instrument}</span>
                          {score.composer && <span>• {score.composer}</span>}
                          <span>• {format(new Date(score.created_at), 'yyyy-MM-dd')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={() => handleDelete(score.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                        title="删除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <FileMusic className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">您的乐谱库是空的</h3>
            <p className="mt-1 text-gray-500 mb-6">上传您的第一份 MusicXML 乐谱开始使用</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
            >
              <Upload className="h-5 w-5 mr-2" />
              上传乐谱
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => !uploading && setIsUploadModalOpen(false)}></div>

            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:my-8">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium leading-6 text-gray-900">上传新乐谱</h3>
                <button 
                  onClick={() => !uploading && setIsUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpload}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MusicXML 文件 *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                      <div className="space-y-1 text-center">
                        <FileMusic className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <span>选择文件</span>
                            <input 
                              ref={fileInputRef}
                              type="file" 
                              className="sr-only" 
                              accept=".xml,.musicxml"
                              onChange={handleFileChange}
                              required
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">
                          {file ? file.name : "支持 .xml 或 .musicxml 格式"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">曲名 *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作曲家</label>
                      <input
                        type="text"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">适用乐器 *</label>
                      <select
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="单簧管 (Clarinet)">单簧管 (Clarinet)</option>
                        <option value="钢琴 (Piano)">钢琴 (Piano)</option>
                        <option value="小提琴 (Violin)">小提琴 (Violin)</option>
                        <option value="长笛 (Flute)">长笛 (Flute)</option>
                        <option value="萨克斯 (Saxophone)">萨克斯 (Saxophone)</option>
                        <option value="其他 (Other)">其他 (Other)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="介绍一下这个乐谱..."
                    />
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="isPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="isPublic" className="font-medium text-gray-700">发布到乐谱市场</label>
                      <p className="text-gray-500">允许其他 OmniScore 用户下载和使用此乐谱。</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !file || !title}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? '上传中...' : '确认上传'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
