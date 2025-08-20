/**
 * @file AnimationDemo.tsx
 * @description AnimationDemo component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// =================================================================================================
// Component
// =================================================================================================

const AnimationDemo: React.FC = () => {
  return (
    <div className="bg-white rounded-none p-6 border-4 border-black" style={{
      boxShadow: '6px 6px 0px #000'
    }}>
      <h3 className="text-xl font-black text-gray-800 mb-4" style={{
        textShadow: '2px 2px 0px #fff',
        fontFamily: 'Impact, Arial Black, sans-serif'
      }}>
        动画速度演示
      </h3>
      
      {/* 预定义速度演示 */}
      <div className="mb-6">
        <h4 className="text-lg font-black text-gray-800 mb-3" style={{
          textShadow: '1px 1px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          预定义速度类
        </h4>
        <div className="flex justify-center items-center space-x-8">
          <div className="text-center">
            <div className="w-8 h-8 bg-red-400 rounded-full opacity-60 animate-ping-very-fast mx-auto mb-2"></div>
            <span className="text-sm font-bold text-gray-700">很快 (0.2s)</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-orange-400 rounded-full opacity-60 animate-ping-fast mx-auto mb-2"></div>
            <span className="text-sm font-bold text-gray-700">快 (0.5s)</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-yellow-400 rounded-full opacity-60 animate-ping mx-auto mb-2"></div>
            <span className="text-sm font-bold text-gray-700">正常 (1s)</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-green-400 rounded-full opacity-60 animate-ping-slow mx-auto mb-2"></div>
            <span className="text-sm font-bold text-gray-700">慢 (3s)</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-400 rounded-full opacity-60 animate-ping-very-slow mx-auto mb-2"></div>
            <span className="text-sm font-bold text-gray-700">很慢 (5s)</span>
          </div>
        </div>
      </div>
      
      {/* 自定义速度控制示例 */}
      <div className="bg-gray-100 rounded-none p-4 border-4 border-black" style={{
        boxShadow: '4px 4px 0px #000'
      }}>
        <h4 className="text-lg font-black text-gray-800 mb-3" style={{
          textShadow: '1px 1px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          自定义速度控制
        </h4>
        <div className="flex justify-center items-center space-x-4">
          <div className="text-center">
            <div 
              className="w-6 h-6 bg-purple-400 rounded-full opacity-60 mx-auto mb-1"
              style={{
                animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            ></div>
            <span className="text-xs font-bold text-gray-700">0.8s</span>
          </div>
          <div className="text-center">
            <div 
              className="w-6 h-6 bg-pink-400 rounded-full opacity-60 mx-auto mb-1"
              style={{
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            ></div>
            <span className="text-xs font-bold text-gray-700">1.5s</span>
          </div>
          <div className="text-center">
            <div 
              className="w-6 h-6 bg-indigo-400 rounded-full opacity-60 mx-auto mb-1"
              style={{
                animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }}
            ></div>
            <span className="text-xs font-bold text-gray-700">2.5s</span>
          </div>
        </div>
      </div>
      
      {/* 使用说明 */}
      <div className="mt-4 bg-blue-50 rounded-none p-3 border-2 border-blue-300" style={{
        boxShadow: '2px 2px 0px #000'
      }}>
        <h5 className="text-sm font-black text-gray-800 mb-2" style={{
          textShadow: '1px 1px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          使用方法
        </h5>
        <div className="text-xs text-gray-700 space-y-1">
          <p><strong>预定义类：</strong>使用 <code>animate-ping-very-fast</code>、<code>animate-ping-fast</code> 等</p>
          <p><strong>自定义速度：</strong>使用内联样式 <code>animation: &apos;ping 2s cubic-bezier(0, 0, 0.2, 1) infinite&apos;</code></p>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export { AnimationDemo };
