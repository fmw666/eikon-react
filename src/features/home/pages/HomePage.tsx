import React from 'react';

import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/app/router/constants';
import { Button } from '@/shared/components/Button';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 项目简介 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            AI 快速开发项目模板
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            本项目旨在为 AI 阅读和二次开发提供清晰、易扩展的项目架构。你可以基于本模板快速搭建自己的 AI 应用或业务系统。
          </p>
        </div>

        {/* 文档指引 */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center justify-center">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                📚
              </span>
              第一次使用这个项目？
            </h2>
            <div className="text-center">
              <p className="text-gray-700 mb-4">通过以下命令查看详细使用文档：</p>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <code className="text-sm text-gray-800 font-mono">
                  cd docs-site/ && npm install && npm run dev
                </code>
              </div>
              <p className="text-gray-600">然后打开 <b>localhost:5173</b> 查看详细使用文档</p>
            </div>
          </div>
        </section>

        {/* 示例模块入口 */}
        <section className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center justify-center">
              <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                📝
              </span>
              示例模块
            </h2>
            <p className="text-gray-600 mb-6">我们为你提供了 <b>task</b> 模块作为示例：</p>
            <Button 
              onClick={() => navigate(ROUTES.TASK.ROOT)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              进入 task 模块
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
