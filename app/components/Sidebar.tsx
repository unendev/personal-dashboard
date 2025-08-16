import React from 'react';

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-gray-100 dark:bg-gray-900 p-6 flex flex-col shadow-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Project Nexus</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your Digital Hub</p>
      </div>
      <nav className="flex-grow">
        <ul>
          <li className="mb-4">
            <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 font-semibold">Dashboard</a>
          </li>
          <li className="mb-4">
            <a href="#" className="text-gray-700 dark:text-gray-300 hover:text-blue-500">Settings</a>
          </li>
        </ul>
      </nav>
      <div>
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">&copy; 2024 Nexus Hub</p>
      </div>
    </aside>
  );
};

export default Sidebar;