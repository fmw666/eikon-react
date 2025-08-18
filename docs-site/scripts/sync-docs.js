const fs = require('fs');
const path = require('path');

// 源文档目录
const SOURCE_DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
// 目标文档目录
const TARGET_DOCS_DIR = path.join(__dirname, '..');

// 文档映射配置
const DOC_MAPPING = {
  '快速开始指南.md': 'guide/getting-started.md',
  '产品说明文档.md': 'guide/product.md',
  'Toast集成指南.md': 'guide/toast-integration.md',
  'README.md': 'guide/overview.md',
  'prompts/AI开发提示词模板.md': 'prompts/ai-templates.md',
  'prompts/CodeFileBestTemplate.md': 'prompts/code-templates.md'
};

// 添加VitePress前置配置的函数
function addVitePressFrontmatter(content, title, description = '') {
  const frontmatter = `---
title: ${title}
description: ${description}
---

`;
  return frontmatter + content;
}

// 处理markdown内容的函数
function processMarkdownContent(content, filename) {
  // 移除原有的标题（如果存在）
  const lines = content.split('\n');
  let processedLines = lines;
  
  // 如果第一行是标题，跳过它
  if (lines[0].startsWith('# ')) {
    processedLines = lines.slice(1);
  }
  
  // 清理内容
  let processedContent = processedLines.join('\n').trim();
  
  // 根据文件名添加特定的处理
  switch (filename) {
    case '快速开始指南.md':
      return addVitePressFrontmatter(processedContent, '快速开始指南', '5分钟上手AI DevKit');
    case '产品说明文档.md':
      return addVitePressFrontmatter(processedContent, '产品说明文档', 'AI DevKit功能详细介绍');
    case 'Toast集成指南.md':
      return addVitePressFrontmatter(processedContent, 'Toast集成指南', '如何在项目中使用Toast通知组件');
    case 'README.md':
      return addVitePressFrontmatter(processedContent, '项目概览', 'AI DevKit项目介绍');
    case 'prompts/AI开发提示词模板.md':
      return addVitePressFrontmatter(processedContent, 'AI开发提示词模板', '高效的AI辅助开发提示词集合');
    case 'prompts/CodeFileBestTemplate.md':
      return addVitePressFrontmatter(processedContent, '代码文件模板', '标准化的代码文件模板');
    default:
      return addVitePressFrontmatter(processedContent, filename.replace('.md', ''), '');
  }
}

// 复制文件的函数
function copyFile(sourcePath, targetPath) {
  try {
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 读取源文件
    const content = fs.readFileSync(sourcePath, 'utf-8');
    
    // 处理内容
    const processedContent = processMarkdownContent(content, path.relative(SOURCE_DOCS_DIR, sourcePath));
    
    // 写入目标文件
    fs.writeFileSync(targetPath, processedContent, 'utf-8');
    
    console.log(`✅ 已同步: ${path.relative(SOURCE_DOCS_DIR, sourcePath)} -> ${path.relative(TARGET_DOCS_DIR, targetPath)}`);
  } catch (error) {
    console.error(`❌ 同步失败: ${sourcePath}`, error.message);
  }
}

// 主同步函数
function syncDocs() {
  console.log('🔄 开始同步文档...');
  console.log(`源目录: ${SOURCE_DOCS_DIR}`);
  console.log(`目标目录: ${TARGET_DOCS_DIR}`);
  console.log('');
  
  // 检查源目录是否存在
  if (!fs.existsSync(SOURCE_DOCS_DIR)) {
    console.error(`❌ 源文档目录不存在: ${SOURCE_DOCS_DIR}`);
    return;
  }
  
  // 遍历文档映射
  Object.entries(DOC_MAPPING).forEach(([sourceFile, targetFile]) => {
    const sourcePath = path.join(SOURCE_DOCS_DIR, sourceFile);
    const targetPath = path.join(TARGET_DOCS_DIR, targetFile);
    
    if (fs.existsSync(sourcePath)) {
      copyFile(sourcePath, targetPath);
    } else {
      console.warn(`⚠️  源文件不存在: ${sourceFile}`);
    }
  });
  
  console.log('');
  console.log('🎉 文档同步完成！');
}

// 运行同步
syncDocs(); 