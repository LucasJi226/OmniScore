import React, { useState, useEffect } from 'react';
import { Smartphone, Plus, Trash2, Loader2, Link as LinkIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  last_seen: string;
  created_at: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [bindingCode, setBindingCode] = useState('');
  const [deviceName, setDeviceName] = useState('My M5Stack');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices/me');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/devices/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: bindingCode, device_name: deviceName }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('设备绑定成功！');
        setBindingCode('');
        fetchDevices();
      } else {
        setError(data.error || '绑定失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const unbindDevice = async (id: string) => {
    if (!confirm('确定要解除此设备的绑定吗？')) return;
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDevices();
      }
    } catch (err) {
      console.error('Failed to unbind device:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-100 p-3 rounded-xl border border-indigo-200">
          <Smartphone className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">我的设备 (OmniScore M5)</h1>
          <p className="text-gray-500 mt-1">管理已连接的硬件播放器</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Binding Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-500" />
            绑定新设备
          </h2>
          <form onSubmit={handleBind} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">绑定码 (Binding Code)</label>
              <input
                type="text"
                maxLength={6}
                value={bindingCode}
                onChange={(e) => setBindingCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                请输入 M5Stack 屏幕上显示的 6 位数字绑定码。
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">设备名称</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="我的 M5Stack Core2"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
              立即绑定
            </button>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm border border-green-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}
          </form>
        </div>

        {/* Device List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            已绑定设备 ({devices.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          ) : devices.length > 0 ? (
            devices.map((device) => (
              <div key={device.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="bg-gray-100 p-3 rounded-xl">
                      <Smartphone className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{device.device_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                         <span className="text-xs font-mono text-gray-400">UID: {device.id}</span>
                         <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                         <div className="flex items-center gap-1 text-gray-500 text-xs">
                           <Clock className="w-3 h-3" />
                           {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 在线
                         </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => unbindDevice(device.id)}
                    className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
              <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>暂无已绑定的设备</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
