<template>
  <div class="mermaid-container">
    <div class="mermaid-controls">
      <button @click="toggleCode" class="control-btn" title="查看代码">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16,18 22,12 16,6"></polyline>
          <polyline points="8,6 2,12 8,18"></polyline>
        </svg>
      </button>
      <button @click="zoomIn" class="control-btn" title="放大">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      <button @click="zoomOut" class="control-btn" title="缩小">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>
      <button @click="resetZoom" class="control-btn" title="重置">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
          <path d="M3 21v-5h5"></path>
        </svg>
      </button>
      <button @click="toggleFullscreen" class="control-btn" title="全屏">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,3 21,3 21,9"></polyline>
          <polyline points="9,21 3,21 3,15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      </button>
    </div>
    
         <div 
       ref="mermaidWrapper" 
       class="mermaid-wrapper"
       @mousedown="startDrag"
       @mousemove="onDrag"
       @mouseup="stopDrag"
       @mouseleave="stopDrag"
       @wheel="onWheel"
     >
               <div 
          ref="mermaidRef" 
          class="mermaid" 
          :style="{ 
            transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
        ></div>
        
        <!-- 缩放比例指示器 -->
        <div v-show="showZoomIndicator" class="zoom-indicator">
          {{ zoomPercentage }}%
        </div>
      </div>
     
     <!-- 全屏遮罩 -->
     <div v-if="isFullscreen" class="fullscreen-overlay" @click="closeFullscreen">
       <div class="fullscreen-content" @click.stop>
         <div class="fullscreen-header">
           <span>Mermaid 图表</span>
           <button @click="closeFullscreen" class="close-btn" title="关闭全屏">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <line x1="18" y1="6" x2="6" y2="18"></line>
               <line x1="6" y1="6" x2="18" y2="18"></line>
             </svg>
           </button>
         </div>
         <div 
           ref="fullscreenWrapper" 
           class="fullscreen-wrapper"
           @mousedown="startDrag"
           @mousemove="onDrag"
           @mouseup="stopDrag"
           @mouseleave="stopDrag"
           @wheel="onWheel"
         >
                       <div 
              ref="fullscreenMermaidRef"
              class="mermaid fullscreen-mermaid" 
              :style="{ 
                transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`,
                cursor: isDragging ? 'grabbing' : 'grab'
              }"
            ></div>
            
            <!-- 全屏模式缩放比例指示器 -->
            <div v-show="showZoomIndicator" class="zoom-indicator fullscreen-zoom-indicator">
              {{ zoomPercentage }}%
            </div>
          </div>
       </div>
     </div>
    
    <div v-if="showCode" class="mermaid-code">
      <div class="code-header">
        <span>Mermaid 代码</span>
        <button @click="copyCode" class="copy-btn">复制</button>
      </div>
      <pre><code>{{ originalCode }}</code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import mermaid from 'mermaid'

const props = defineProps({
  chart: {
    type: String,
    required: true
  }
})

const mermaidRef = ref(null)
const mermaidWrapper = ref(null)
const fullscreenMermaidRef = ref(null)
const showCode = ref(false)
const zoomLevel = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const originalCode = ref('')
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const lastTranslate = ref({ x: 0, y: 0 })
const isFullscreen = ref(false)
const chartId = ref('mermaid-' + Math.random().toString(36).substr(2, 9))
const initialZoomLevel = ref(1)
const showZoomIndicator = ref(false)

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace'
})

const renderChart = async () => {
  if (mermaidRef.value) {
    try {
      // 清除之前的内容
      mermaidRef.value.innerHTML = ''
      // 解码 HTML 转义
      const decodedChart = props.chart
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
      
      originalCode.value = decodedChart
      
      // 确保每个图表使用唯一的ID
      const uniqueId = chartId.value + '-' + Date.now()
      
      // 渲染新的图表
      const { svg } = await mermaid.render(uniqueId, decodedChart)
      mermaidRef.value.innerHTML = svg
      
      // 计算并设置初始缩放比例
      nextTick(() => {
        setTimeout(() => {
          calculateInitialZoom()
        }, 100)
      })
    } catch (error) {
      console.error('Mermaid 渲染错误:', error)
      mermaidRef.value.innerHTML = `<div class="error">图表渲染失败: ${error.message}</div>`
    }
  }
}

const toggleCode = () => {
  showCode.value = !showCode.value
}

const zoomIn = () => {
  const maxZoom = initialZoomLevel.value * 3
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, maxZoom)
  showZoomIndicator.value = true
  setTimeout(() => {
    showZoomIndicator.value = false
  }, 2000)
}

const zoomOut = () => {
  const minZoom = initialZoomLevel.value * 0.5
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, minZoom)
  showZoomIndicator.value = true
  setTimeout(() => {
    showZoomIndicator.value = false
  }, 2000)
}

// 计算相对于初始缩放的百分比
const zoomPercentage = computed(() => {
  if (initialZoomLevel.value === 0) return 100
  return Math.round((zoomLevel.value / initialZoomLevel.value) * 100)
})

const resetZoom = () => {
  // 重置到初始缩放比例
  zoomLevel.value = initialZoomLevel.value
  translateX.value = 0
  translateY.value = 0
}

const toggleFullscreen = () => {
  if (!isFullscreen.value) {
    isFullscreen.value = true
    // 隐藏页面滚动条
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    // 复制图表内容到全屏容器
    nextTick(() => {
      if (fullscreenMermaidRef.value && mermaidRef.value) {
        fullscreenMermaidRef.value.innerHTML = mermaidRef.value.innerHTML
      }
    })
  } else {
    closeFullscreen()
  }
}

const closeFullscreen = () => {
  isFullscreen.value = false
  // 恢复页面滚动条
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
}

// 监听 ESC 键
const handleKeydown = (e) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    closeFullscreen()
  }
}

const startDrag = (e) => {
  if (e.target.closest('.control-btn')) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  lastTranslate.value = { x: translateX.value, y: translateY.value }
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  translateX.value = lastTranslate.value.x + deltaX
  translateY.value = lastTranslate.value.y + deltaY
  e.preventDefault()
}

const stopDrag = () => {
  isDragging.value = false
}

const onWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  // 限制缩放范围在 50% - 300% 之间
  const minZoom = initialZoomLevel.value * 0.5
  const maxZoom = initialZoomLevel.value * 3
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel.value + delta))
  
  // 计算鼠标位置相对于容器的偏移
  const rect = mermaidWrapper.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // 计算容器中心点
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // 计算鼠标相对于中心的位置
  const mouseFromCenterX = mouseX - centerX
  const mouseFromCenterY = mouseY - centerY
  
  // 计算缩放比例变化
  const zoomRatio = newZoom / zoomLevel.value
  
  // 更新位置，保持鼠标位置不变
  translateX.value = mouseFromCenterX - (mouseFromCenterX - translateX.value) * zoomRatio
  translateY.value = mouseFromCenterY - (mouseFromCenterY - translateY.value) * zoomRatio
  
  zoomLevel.value = newZoom
  
  // 显示缩放指示器
  showZoomIndicator.value = true
  clearTimeout(window.zoomIndicatorTimer)
  window.zoomIndicatorTimer = setTimeout(() => {
    showZoomIndicator.value = false
  }, 2000)
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(originalCode.value)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 计算初始缩放比例，使图表占满容器
const calculateInitialZoom = () => {
  if (!mermaidRef.value || !mermaidWrapper.value) return
  
  const svg = mermaidRef.value.querySelector('svg')
  if (!svg) return
  
  // 等待 SVG 完全渲染
  setTimeout(() => {
    // 获取容器尺寸
    const containerRect = mermaidWrapper.value.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height
    
    // 获取 SVG 的实际尺寸
    const svgRect = svg.getBoundingClientRect()
    const svgWidth = svgRect.width
    const svgHeight = svgRect.height
    
    // 如果 SVG 尺寸为 0，说明还未完全渲染，延迟重试
    if (svgWidth === 0 || svgHeight === 0) {
      setTimeout(() => calculateInitialZoom(), 100)
      return
    }
    
    // 计算缩放比例，留出适当的边距
    const margin = 30 // 边距像素
    const availableWidth = containerWidth - margin * 2
    const availableHeight = containerHeight - margin * 2
    
    const scaleX = availableWidth / svgWidth
    const scaleY = availableHeight / svgHeight
    
         // 使用较小的缩放比例，确保图表完全显示在容器内
     // 允许适当放大，但不超过 1.2 倍
     const initialScale = Math.min(scaleX, scaleY, 1.2)
     
     // 确保最小缩放比例
     const finalScale = Math.max(initialScale, 0.3)
     
     // 设置初始缩放
     zoomLevel.value = finalScale
     initialZoomLevel.value = finalScale
     translateX.value = 0
     translateY.value = 0
  }, 50)
}

onMounted(() => {
  // 延迟渲染，确保DOM完全加载
  nextTick(() => {
    setTimeout(() => {
      renderChart()
    }, 100)
  })
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
  // 确保恢复页面滚动条
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  // 清理定时器
  if (window.zoomIndicatorTimer) {
    clearTimeout(window.zoomIndicatorTimer)
  }
  // 清理 Mermaid 缓存
  try {
    mermaid.reset()
  } catch (error) {
    console.warn('清理 Mermaid 缓存时出错:', error)
  }
})

watch(() => props.chart, () => {
  nextTick(() => {
    setTimeout(() => {
      renderChart()
    }, 50)
  })
})
</script>

<style scoped>
.mermaid-container {
  margin: 1rem 0;
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #f9fafb;
}

.mermaid-controls {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  z-index: 10;
}

.control-btn {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #9ca3af;
}

.mermaid-wrapper {
  position: relative;
  width: 100%;
  height: 400px;
  overflow: hidden;
  border-radius: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  text-align: center;
}

/* 全屏遮罩 */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 确保全屏时隐藏滚动条 */
  overflow: hidden;
}

.fullscreen-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  /* 确保内容区域不产生滚动条 */
  overflow: hidden;
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 1.125rem;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: #64748b;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.fullscreen-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
  text-align: center;
}

.fullscreen-mermaid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
  transition: transform 0.1s ease;
  user-select: none;
}

.mermaid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
  transition: transform 0.1s ease;
  user-select: none;
}

.mermaid svg {
  max-width: none;
  height: auto;
}

.zoom-indicator {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  z-index: 5;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
  opacity: 1;
}

.fullscreen-zoom-indicator {
  bottom: 1rem;
  right: 1rem;
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}

.error {
  color: #ef4444;
  padding: 1rem;
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  background-color: #fef2f2;
}

.mermaid-code {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  font-weight: 500;
}

.copy-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background: #2563eb;
}

.mermaid-code pre {
  margin: 0;
  padding: 1rem;
  background: var(--vp-code-block-bg);
  color: var(--vp-code-block-color);
  overflow-x: auto;
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: left;
}

/* 暗色主题适配 */
:root[class~='dark'] .mermaid-container {
  background: #1f2937;
  border-color: #374151;
}

:root[class~='dark'] .control-btn {
  background: rgba(31, 41, 55, 0.9);
  border-color: #4b5563;
  color: #f9fafb;
}

:root[class~='dark'] .control-btn:hover {
  background: rgba(31, 41, 55, 1);
  border-color: #6b7280;
}

:root[class~='dark'] .mermaid-wrapper {
  background: #111827;
  border-color: #374151;
}

:root[class~='dark'] .zoom-indicator {
  background: rgba(255, 255, 255, 0.2);
  color: #f9fafb;
}

/* 暗色主题全屏适配 */
:root[class~='dark'] .fullscreen-content {
  background: #111827;
}

:root[class~='dark'] .fullscreen-header {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

:root[class~='dark'] .close-btn {
  color: #9ca3af;
}

:root[class~='dark'] .close-btn:hover {
  background: #374151;
  color: #f9fafb;
}

:root[class~='dark'] .fullscreen-wrapper {
  background: #111827;
}

:root[class~='dark'] .mermaid-code {
  border-color: #374151;
}

:root[class~='dark'] .code-header {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .mermaid-wrapper {
    height: 300px;
  }
  
  .mermaid-controls {
    flex-wrap: wrap;
    gap: 0.125rem;
  }
  
  .control-btn {
    padding: 0.125rem;
  }
}
</style>
