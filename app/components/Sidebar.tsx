'use client';

import React, { useState, useEffect } from 'react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // 按ESC键关闭侧边栏
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* 侧边栏触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 left-4 z-50 w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span className="text-white font-bold text-xl">N</span>
      </button>

      {/* 背景遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col absolute top-0 left-0 z-50 overflow-hidden transition-all duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'w-72' : 'w-0'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Nexus</h1>
              <p className="text-xs text-white/60">个人数字枢纽</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-white text-lg">✕</span>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-grow p-6">
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 group">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full group-hover:scale-150 transition-transform flex-shrink-0"></div>
                <span className="font-medium">仪表盘</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 group">
                <div className="w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform flex-shrink-0"></div>
                <span className="font-medium">信息流</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 group">
                <div className="w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform flex-shrink-0"></div>
                <span className="font-medium">音乐</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 group">
                <div className="w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform flex-shrink-0"></div>
                <span className="font-medium">健康</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 group">
                <div className="w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform flex-shrink-0"></div>
                <span className="font-medium">设置</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* 底部信息 */}
        <div className="p-6 border-t border-white/10">
          <div className="text-center">
            <p className="text-xs text-white/40 mb-2">Made with ❤️</p>
            <p className="text-xs text-white/30">&copy; 2024 Nexus Hub</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;