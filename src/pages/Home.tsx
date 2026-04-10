import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Smartphone, Wind, Leaf, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-32 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              专为乐器设计的 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                “本体集成”式电子乐谱
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              突破传统谱架与乐器的物理分离模式，实现 69 克级无感化集成。基于陀螺仪的姿态识别算法将翻页动作融入演奏动作，让演奏更加连贯自然。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/market"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
              >
                探索乐谱市场
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/library"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
              >
                管理我的乐谱
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-48 -right-24 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">四大核心创新</h2>
            <p className="mt-4 text-lg text-gray-600">解决物理载体制约、人机交互割裂、资源消耗和乐谱管理困难</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Smartphone className="h-8 w-8 text-indigo-600" />}
              title="本体集成范式"
              description="突破传统谱架与乐器的物理分离，采用 M5Stack Core2 一体化模组，总重量仅 69 克，无损安装，不影响音色。"
            />
            <FeatureCard 
              icon={<Wind className="h-8 w-8 text-indigo-600" />}
              title="人机交互革命"
              description="首创“演奏姿态价值复用”理论。内置六轴陀螺仪，将管体上抬等自然演奏动作转化为翻页指令，零延迟。"
            />
            <FeatureCard 
              icon={<Music className="h-8 w-8 text-indigo-600" />}
              title="乐谱管理革新"
              description="自主研发 MusicXML 渲染引擎。支持五线谱矢量渲染，单页显示 16 小节无失真，通过 WiFi 无线传输乐谱。"
            />
            <FeatureCard 
              icon={<Leaf className="h-8 w-8 text-indigo-600" />}
              title="环保与可持续"
              description="单设备全生命周期可减少 300 公斤纸张消耗，相当于 4 棵成年杨树固碳量，彻底告别纸质乐谱。"
            />
          </div>
        </div>
      </section>

      {/* Supported Instruments */}
      <section className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">多乐器普适适配工程</h2>
              <p className="text-lg text-gray-600 mb-6">
                虽然 OmniScore 起源于单簧管，但我们的 MusicXML 渲染引擎和乐谱管理系统是通用的。我们正在开发支持其他类型乐器的集成范式：
              </p>
              <ul className="space-y-4">
                {[
                  '单簧管（已完美适配 Jean Paul, 雅马哈等品牌）',
                  '萨克斯管（专用磁性快拆支架研发中）',
                  '提琴类弓弦乐器（震动传感翻页方案研发中）',
                  '钢琴及键盘乐器（通用电子乐谱显示）'
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/2 bg-gray-100 rounded-2xl p-8 aspect-video flex items-center justify-center">
              <div className="text-center">
                <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">通用 MusicXML 渲染引擎</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="bg-indigo-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
