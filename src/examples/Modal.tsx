/**
 * @file Modal.tsx
 * @description Modal component example with anime style design
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState } from 'react';

// --- Third-party Libraries ---
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  CogIcon,
  PhotoIcon,
  DocumentIcon,
  StarIcon,
  HeartIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  RocketLaunchIcon,
  SparklesIcon,
  BoltIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

// --- Absolute Imports ---
import { useMemoizedThemeState } from '@/app/providers';
import { Button } from '@/shared/components/Button';
import { Modal, type ModalSize } from '@/shared/components/Modal';
import { Select } from '@/shared/components/Select';

// =================================================================================================
// Component
// =================================================================================================

const ModalExample: React.FC = () => {
  const { isDarkMode } = useMemoizedThemeState();
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [largeModalOpen, setLargeModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [nestedModalOpen, setNestedModalOpen] = useState(false);
  const [innerModalOpen, setInnerModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [currentSize, setCurrentSize] = useState<ModalSize>('md');

  const handleFileUpload = () => {
    if (!selectedFile) return;
    
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setUploadModalOpen(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardModalOpen(false);
  };

  // =================================================================================================
  // Render
  // =================================================================================================

  return (
    <div className={`space-y-8 transition-all duration-500 ease-out ${
      isDarkMode ? 'text-gray-200' : 'text-gray-800'
    }`}>
      {/* 动漫风格标题 */}
      <div className={`text-center mb-8 transition-all duration-500 ease-out ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        <h2 className={`text-4xl font-black mb-4 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode 
            ? '3px 3px 0px #374151, 6px 6px 0px #000' 
            : '3px 3px 0px #fff, 6px 6px 0px #000',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🎭 Modal 组件示例
        </h2>
        <div className={`w-24 h-2 mx-auto mb-4 transition-all duration-500 ease-out ${
          isDarkMode ? 'bg-white' : 'bg-black'
        }`}></div>
        <p className={`text-lg font-bold transition-all duration-500 ease-out ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`} style={{
          textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
        }}>
          展示 Modal 组件的各种使用场景和功能，包括基础 Modal、确认 Modal、表单 Modal、图片画廊、设置面板等
        </p>
      </div>

      {/* Basic Modal */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🎪 基础 Modal
        </h3>
        <div className="space-y-4">
          <p className={`font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            最基础的 Modal 使用方式，包含标题、内容和操作按钮。
          </p>
          <Button 
            variant="primary" 
            onClick={() => setBasicModalOpen(true)}
          >
            <RocketLaunchIcon className="w-5 h-5 mr-2" />
            打开基础 Modal
          </Button>
        </div>

        <Modal
          open={basicModalOpen}
          title="基础 Modal"
          onClose={() => setBasicModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setBasicModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setBasicModalOpen(false)}>
                确定
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              这是一个基础的 Modal 示例，展示了 Modal 组件的基本功能。
            </p>
            <p className="text-gray-600">
              您可以在这里放置任何内容，包括文本、表单、图片等。
            </p>
          </div>
        </Modal>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">🎭</div>
          <div className="text-2xl">✨</div>
        </div>
      </section>

      {/* Modal Sizes */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          📏 Modal 尺寸
        </h3>
        <div className="space-y-4">
          <p className={`font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            Modal 组件支持多种尺寸配置，适应不同的内容需求。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSize('sm');
                setSizeModalOpen(true);
              }}
            >
              <SparklesIcon className="w-4 h-4 mr-1" />
              小尺寸
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSize('md');
                setSizeModalOpen(true);
              }}
            >
              <BoltIcon className="w-4 h-4 mr-1" />
              中等尺寸
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSize('lg');
                setSizeModalOpen(true);
              }}
            >
              <FireIcon className="w-4 h-4 mr-1" />
              大尺寸
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSize('xl');
                setSizeModalOpen(true);
              }}
            >
              <StarIcon className="w-4 h-4 mr-1" />
              超大尺寸
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentSize('full');
                setSizeModalOpen(true);
              }}
            >
              <HeartIcon className="w-4 h-4 mr-1" />
              全屏尺寸
            </Button>
          </div>
        </div>

        <Modal
          open={sizeModalOpen}
          title={`${currentSize.toUpperCase()} 尺寸 Modal`}
          size={currentSize}
          onClose={() => setSizeModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setSizeModalOpen(false)}>
                关闭
              </Button>
              <Button variant="primary" onClick={() => setSizeModalOpen(false)}>
                确定
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              这是 {currentSize.toUpperCase()} 尺寸的 Modal 示例。
            </p>
            <p className="text-gray-600">
              不同尺寸适用于不同的内容展示需求。
            </p>
          </div>
        </Modal>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">📏</div>
          <div className="text-2xl">🔍</div>
        </div>
      </section>

      {/* 确认 Modal */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          ⚠️ 确认 Modal
        </h3>
        <div className="space-y-4">
          <p className={`font-bold transition-all duration-500 ease-out ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`} style={{
            textShadow: isDarkMode ? '1px 1px 0px #374151' : '1px 1px 0px #fff'
          }}>
            用于需要用户确认的重要操作，如删除、退出等。
          </p>
          <Button 
            variant="danger" 
            onClick={() => setConfirmModalOpen(true)}
          >
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            删除确认
          </Button>
        </div>

        <Modal
          open={confirmModalOpen}
          title="确认删除"
          onClose={() => setConfirmModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirmModalOpen(false)}>
                取消
              </Button>
              <Button variant="danger" onClick={() => setConfirmModalOpen(false)}>
                确认删除
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              您确定要删除这个项目吗？此操作无法撤销。
            </p>
            <p className="text-gray-600">
              删除后，所有相关数据将被永久移除。
            </p>
          </div>
        </Modal>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">⚠️</div>
          <div className="text-2xl">💥</div>
        </div>
      </section>

      {/* 成功/错误 Modal */}
      <section className={`rounded-none p-6 border-4 border-black transition-all duration-500 ease-out ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`} style={{
        boxShadow: '8px 8px 0px #000',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}>
        <h3 className={`text-2xl font-black mb-6 transition-all duration-500 ease-out ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`} style={{
          textShadow: isDarkMode ? '2px 2px 0px #374151' : '2px 2px 0px #fff',
          fontFamily: 'Impact, Arial Black, sans-serif'
        }}>
          🎉 成功/错误 Modal
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="success" 
            onClick={() => setSuccessModalOpen(true)}
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            成功消息
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setErrorModalOpen(true)}
          >
            <XCircleIcon className="w-5 h-5 mr-2" />
            错误消息
          </Button>
        </div>

        <Modal
          open={successModalOpen}
          title="操作成功"
          onClose={() => setSuccessModalOpen(false)}
          actions={
            <Button variant="primary" onClick={() => setSuccessModalOpen(false)}>
              确定
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              恭喜！您的操作已成功完成。
            </p>
            <p className="text-gray-600">
              数据已保存，您可以继续其他操作。
            </p>
          </div>
        </Modal>

        <Modal
          open={errorModalOpen}
          title="操作失败"
          onClose={() => setErrorModalOpen(false)}
          actions={
            <Button variant="danger" onClick={() => setErrorModalOpen(false)}>
              确定
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              抱歉，操作失败了。
            </p>
            <p className="text-gray-600">
              请检查网络连接或稍后重试。
            </p>
          </div>
        </Modal>
        
        {/* 漫画装饰 - 放在底部 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-300">
          <div className="text-2xl">🎉</div>
          <div className="text-2xl">💔</div>
        </div>
      </section>

      {/* Form Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">表单 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            包含表单内容的 Modal，用于数据输入和编辑。
          </p>
          <Button variant="primary" onClick={() => setFormModalOpen(true)}>
            新建用户
          </Button>
        </div>

        <Modal
          open={formModalOpen}
          title="新建用户"
          size="lg"
          onClose={() => setFormModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setFormModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setFormModalOpen(false)}>
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              {/* 示例使用新的 Select 组件 */}
              <div className="w-full">
                {/* 该示例为静态展示，若需要交互可引入 useState 管理 value */}
                <Select
                  value={"viewer"}
                  onChange={() => {}}
                  options={[
                    { value: 'placeholder', label: '请选择角色' },
                    { value: 'admin', label: '管理员' },
                    { value: 'editor', label: '编辑者' },
                    { value: 'viewer', label: '查看者' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户描述"
              />
            </div>
          </div>
        </Modal>
      </section>

      {/* Gallery Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">图片画廊 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            用于展示图片或媒体内容的 Modal，包含图片浏览和操作功能。
          </p>
          <Button variant="outline" onClick={() => setGalleryModalOpen(true)}>
            查看图片画廊
          </Button>
        </div>

        <Modal
          open={galleryModalOpen}
          title="图片画廊"
          size="lg"
          onClose={() => setGalleryModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
                下载
              </Button>
              <Button variant="ghost" leftIcon={<ShareIcon className="w-4 h-4" />}>
                分享
              </Button>
              <Button variant="primary" onClick={() => setGalleryModalOpen(false)}>
                关闭
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"
                alt="Gallery"
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                1 / 5
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeftIcon className="w-4 h-4" />}>
                  上一张
                </Button>
                <Button variant="ghost" size="sm" icon={<ArrowRightIcon className="w-4 h-4" />}>
                  下一张
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" icon={<HeartIcon className="w-4 h-4" />}>
                  收藏
                </Button>
                <Button variant="ghost" size="sm" icon={<StarIcon className="w-4 h-4" />}>
                  评分
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">山景照片</h4>
              <p className="text-gray-600 text-sm">
                这是一张美丽的山景照片，拍摄于清晨时分，展现了自然的壮丽景色。
              </p>
            </div>
          </div>
        </Modal>
      </section>

      {/* Settings Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">设置面板 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            用于展示应用设置和配置选项的 Modal，包含多个设置分类。
          </p>
          <Button variant="outline" onClick={() => setSettingsModalOpen(true)}>
            打开设置
          </Button>
        </div>

        <Modal
          open={settingsModalOpen}
          title="应用设置"
          size="xl"
          onClose={() => setSettingsModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setSettingsModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setSettingsModalOpen(false)}>
                保存设置
              </Button>
            </>
          }
        >
          <div className="space-y-6 max-h-96 overflow-y-auto">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CogIcon className="w-5 h-5 mr-2" />
                通用设置
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">深色模式</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">自动保存</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                用户设置
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    语言
                  </label>
                  <Select
                    value={"zh"}
                    onChange={() => {}}
                    options={[
                      { value: 'zh', label: '简体中文' },
                      { value: 'en', label: 'English' },
                      { value: 'jp', label: '日本語' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时区
                  </label>
                  <Select
                    value={"utc+8"}
                    onChange={() => {}}
                    options={[
                      { value: 'utc+8', label: 'UTC+8 (北京时间)' },
                      { value: 'utc+0', label: 'UTC+0 (格林威治时间)' },
                      { value: 'utc-5', label: 'UTC-5 (东部时间)' },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentIcon className="w-5 h-5 mr-2" />
                通知设置
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">邮件通知</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">推送通知</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </section>

      {/* Upload Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">文件上传 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            用于文件上传的 Modal，包含拖拽上传、进度条等功能。
          </p>
          <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
            上传文件
          </Button>
        </div>

        <Modal
          open={uploadModalOpen}
          title="文件上传"
          size="lg"
          onClose={() => setUploadModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>
                取消
              </Button>
              <Button 
                variant="primary" 
                onClick={handleFileUpload}
                disabled={!selectedFile || uploadProgress > 0}
              >
                {uploadProgress > 0 ? '上传中...' : '开始上传'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">拖拽文件到此处或点击选择文件</p>
              <p className="text-sm text-gray-500">支持 JPG, PNG, PDF 格式，最大 10MB</p>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".jpg,.jpeg,.png,.pdf"
              />
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              >
                选择文件
              </Button>
            </div>
            
            {selectedFile && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>上传进度</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </section>

      {/* Wizard Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">向导 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            多步骤的向导 Modal，用于引导用户完成复杂操作。
          </p>
          <Button variant="outline" onClick={() => setWizardModalOpen(true)}>
            开始向导
          </Button>
        </div>

        <Modal
          open={wizardModalOpen}
          title={`设置向导 (${wizardStep}/3)`}
          size="lg"
          onClose={() => setWizardModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setWizardModalOpen(false)}>
                取消
              </Button>
              {wizardStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setWizardStep(wizardStep - 1)}
                >
                  上一步
                </Button>
              )}
              {wizardStep < 3 ? (
                <Button 
                  variant="primary" 
                  onClick={() => setWizardStep(wizardStep + 1)}
                >
                  下一步
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={resetWizard}
                >
                  完成
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= wizardStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step < wizardStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {wizardStep === 1 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <UserIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">欢迎使用</h3>
                <p className="text-gray-600">
                  欢迎使用我们的应用！这个向导将帮助您完成初始设置。
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-blue-900 mb-2">接下来您将：</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 配置基本信息</li>
                    <li>• 选择偏好设置</li>
                    <li>• 完成初始设置</li>
                  </ul>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      显示名称
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入显示名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      个人简介
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入个人简介"
                    />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">设置完成</h3>
                <p className="text-gray-600">
                  恭喜！您已成功完成初始设置。现在可以开始使用应用的所有功能了。
                </p>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">设置摘要：</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ 基本信息已配置</li>
                    <li>✓ 偏好设置已保存</li>
                    <li>✓ 账户已激活</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </section>

      {/* Nested Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">嵌套 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            演示如何在 Modal 中打开另一个 Modal，用于复杂的交互场景。
          </p>
          <Button variant="outline" onClick={() => setNestedModalOpen(true)}>
            打开嵌套 Modal
          </Button>
        </div>

        <Modal
          open={nestedModalOpen}
          title="外层 Modal"
          size="md"
          onClose={() => setNestedModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setNestedModalOpen(false)}>
                关闭
              </Button>
              <Button variant="primary" onClick={() => setInnerModalOpen(true)}>
                打开内层 Modal
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              这是外层 Modal 的内容。您可以在这里看到一些基本信息。
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">外层 Modal 信息</h4>
              <p className="text-sm text-gray-600">
                点击&quot;打开内层 Modal&quot;按钮可以在当前 Modal 的基础上再打开一个 Modal。
              </p>
            </div>
          </div>
        </Modal>

        <Modal
          open={innerModalOpen}
          title="内层 Modal"
          size="sm"
          onClose={() => setInnerModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setInnerModalOpen(false)}>
                关闭
              </Button>
              <Button variant="primary" onClick={() => {
                setInnerModalOpen(false);
                setNestedModalOpen(false);
              }}>
                关闭所有
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              这是内层 Modal 的内容。您可以在这里进行更详细的操作。
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">内层 Modal 信息</h4>
              <p className="text-sm text-blue-800">
                内层 Modal 会显示在外层 Modal 之上，形成层级关系。
              </p>
            </div>
          </div>
        </Modal>
      </section>

      {/* Large Modal */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">大尺寸 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            用于显示更多内容的 Modal，通常用于详情页面或复杂表单。
          </p>
          <Button variant="outline" onClick={() => setLargeModalOpen(true)}>
            查看详情
          </Button>
        </div>

        <Modal
          open={largeModalOpen}
          title="项目详情"
          size="xl"
          onClose={() => setLargeModalOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setLargeModalOpen(false)}>
                关闭
              </Button>
              <Button variant="primary" onClick={() => setLargeModalOpen(false)}>
                编辑
              </Button>
            </>
          }
        >
          <div className="space-y-6 max-h-96 overflow-y-auto">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">项目信息</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">项目名称：</span>
                  <span className="text-gray-900">AI 快速开发模板</span>
                </div>
                <div>
                  <span className="text-gray-500">创建时间：</span>
                  <span className="text-gray-900">2024-01-15</span>
                </div>
                <div>
                  <span className="text-gray-500">项目状态：</span>
                  <span className="text-green-600">进行中</span>
                </div>
                <div>
                  <span className="text-gray-500">负责人：</span>
                  <span className="text-gray-900">张三</span>
                </div>
                <div>
                  <span className="text-gray-500">项目类型：</span>
                  <span className="text-gray-900">Web 应用</span>
                </div>
                <div>
                  <span className="text-gray-500">优先级：</span>
                  <span className="text-orange-600">高</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">项目描述</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                这是一个基于 React + TypeScript + Vite 的快速开发模板，集成了现代化的开发工具和最佳实践。
                模板包含了完整的项目结构、路由配置、状态管理、UI 组件库等，可以帮助开发者快速搭建项目。
                项目采用模块化设计，支持热重载、代码分割、类型检查等功能，大大提升了开发效率。
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">技术栈</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">React</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">TypeScript</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Vite</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Tailwind CSS</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Zustand</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">React Router</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Heroicons</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">项目进度</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>整体进度</span>
                    <span>75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">12</div>
                    <div className="text-gray-500">已完成</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">4</div>
                    <div className="text-gray-500">进行中</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">2</div>
                    <div className="text-gray-500">待开始</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </section>

      {/* Alert Modals */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">提示 Modal</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" onClick={() => setAlertModalOpen(true)}>
            警告提示
          </Button>
          <Button variant="outline" onClick={() => setSuccessModalOpen(true)}>
            成功提示
          </Button>
          <Button variant="outline" onClick={() => setErrorModalOpen(true)}>
            错误提示
          </Button>
          <Button variant="outline" onClick={() => setInfoModalOpen(true)}>
            信息提示
          </Button>
        </div>

        {/* Warning Alert */}
        <Modal
          open={alertModalOpen}
          title="警告"
          onClose={() => setAlertModalOpen(false)}
          actions={
            <Button variant="primary" onClick={() => setAlertModalOpen(false)}>
              我知道了
            </Button>
          }
        >
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-gray-900 font-medium mb-2">系统维护通知</p>
              <p className="text-gray-600 text-sm">
                系统将于今晚 22:00-24:00 进行维护，期间可能无法正常访问，请提前做好准备。
              </p>
            </div>
          </div>
        </Modal>

        {/* Success Alert */}
        <Modal
          open={successModalOpen}
          title="成功"
          onClose={() => setSuccessModalOpen(false)}
          actions={
            <Button variant="primary" onClick={() => setSuccessModalOpen(false)}>
              确定
            </Button>
          }
        >
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5" />
            <div>
              <p className="text-gray-900 font-medium mb-2">操作成功</p>
              <p className="text-gray-600 text-sm">
                您的数据已成功保存，可以在列表中查看最新信息。
              </p>
            </div>
          </div>
        </Modal>

        {/* Error Alert */}
        <Modal
          open={errorModalOpen}
          title="错误"
          onClose={() => setErrorModalOpen(false)}
          actions={
            <Button variant="primary" onClick={() => setErrorModalOpen(false)}>
              确定
            </Button>
          }
        >
          <div className="flex items-start space-x-3">
            <XCircleIcon className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <p className="text-gray-900 font-medium mb-2">操作失败</p>
              <p className="text-gray-600 text-sm">
                网络连接异常，请检查网络设置后重试。如果问题持续存在，请联系技术支持。
              </p>
            </div>
          </div>
        </Modal>

        {/* Info Alert */}
        <Modal
          open={infoModalOpen}
          title="信息"
          onClose={() => setInfoModalOpen(false)}
          actions={
            <Button variant="primary" onClick={() => setInfoModalOpen(false)}>
              了解
            </Button>
          }
        >
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-500 mt-0.5" />
            <div>
              <p className="text-gray-900 font-medium mb-2">新功能上线</p>
              <p className="text-gray-600 text-sm">
                我们刚刚上线了新的数据分析功能，现在您可以更直观地查看项目数据统计。
              </p>
            </div>
          </div>
        </Modal>
      </section>

      {/* Modal without Actions */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">无操作按钮 Modal</h3>
        <div className="space-y-4">
          <p className="text-gray-600">
            Modal 可以不包含操作按钮，只通过关闭按钮或点击遮罩层关闭。
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              • 点击右上角的 X 按钮关闭
            </p>
            <p className="text-sm text-gray-500">
              • 点击遮罩层关闭
            </p>
            <p className="text-sm text-gray-500">
              • 按 ESC 键关闭
            </p>
          </div>
        </div>
      </section>

      {/* Modal Usage Tips */}
      <section className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">使用说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Modal 属性</h4>
            <div className="space-y-2 text-sm">
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">open</code>
                <span className="text-gray-600 ml-2">控制 Modal 的显示状态</span>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">title</code>
                <span className="text-gray-600 ml-2">Modal 标题（可选）</span>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">children</code>
                <span className="text-gray-600 ml-2">Modal 内容</span>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">onClose</code>
                <span className="text-gray-600 ml-2">关闭回调函数</span>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">actions</code>
                <span className="text-gray-600 ml-2">操作按钮区域（可选）</span>
              </div>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded">size</code>
                <span className="text-gray-600 ml-2">Modal 尺寸：sm, md, lg, xl, full（可选）</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">最佳实践</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 使用有意义的标题来描述 Modal 的用途</li>
              <li>• 在操作按钮中使用清晰的文本</li>
              <li>• 对于危险操作，使用不同的按钮样式</li>
              <li>• 保持 Modal 内容简洁，避免过长</li>
              <li>• 考虑使用图标来增强视觉效果</li>
              <li>• 确保 Modal 在移动设备上也能正常使用</li>
              <li>• 避免在 Modal 中嵌套过多的 Modal</li>
              <li>• 提供清晰的关闭方式</li>
              <li>• 根据内容选择合适的 Modal 尺寸</li>
              <li>• 小尺寸适合简单确认，大尺寸适合复杂内容</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { ModalExample };
