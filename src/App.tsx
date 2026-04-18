/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Market from './pages/Market';
import Library from './pages/Library';
import AuthModal from './components/AuthModal';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
          <Navbar />
          <AuthModal />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/market" element={<Market />} />
              <Route path="/library" element={<Library />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-200 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
              <p>© {new Date().getFullYear()} OmniScore. 全能乐谱 - 专为乐器设计的“本体集成”式电子乐谱.</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
