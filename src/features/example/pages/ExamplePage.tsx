import { useState, useEffect } from 'react';
import type { FC } from 'react';

import { getStaticExampleComponents, type ExampleComponent } from '../utils/componentDiscovery';

const ExamplePage: FC = () => {
  const [exampleComponents, setExampleComponents] = useState<ExampleComponent[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const components = getStaticExampleComponents();
        setExampleComponents(components);
        if (components.length > 0) {
          setActiveTab(components[0].id);
        }
      } catch (error) {
        console.error('Failed to load example components:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComponents();
  }, []);

  const ActiveComponent = exampleComponents.find(comp => comp.id === activeTab)?.component;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载组件示例...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">组件示例</h1>
            <p className="mt-2 text-lg text-gray-600">
              浏览和测试项目中的所有组件
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {exampleComponents.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto">
              {exampleComponents.map((component) => (
                <button
                  key={component.id}
                  onClick={() => setActiveTab(component.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                    activeTab === component.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {component.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Component Display Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ActiveComponent ? (
          <ActiveComponent />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无组件</h3>
            <p className="text-gray-500">
              请在 src/examples 目录中添加更多组件示例
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>当前发现的组件数量: {exampleComponents.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamplePage;
