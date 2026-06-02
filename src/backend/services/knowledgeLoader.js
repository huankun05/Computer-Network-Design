/**
 * 知识文档加载与索引
 * 1. 遍历 docs/knowledge/ 下的 .md 文件
 * 2. 按 ## 标题分块（~300-800 字符/块）
 * 3. 调用 embedding 服务生成向量
 * 4. 存入向量库
 */
const fs = require('fs')
const path = require('path')
const { embed } = require('./embedding')

const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs', 'knowledge')

// 目录名 → 层级名 映射
const LAYER_MAP = {
  '01-应用层': '应用层',
  '02-传输层': '传输层',
  '03-网络层': '网络层',
  '04-数据链路层': '数据链路层',
  '05-物理层': '物理层',
  '06-综合场景': '综合场景',
}

/**
 * 递归获取所有 .md 文件路径
 */
function collectMarkdownFiles(dir) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md' || entry.name === 'images') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * 将 Markdown 文本按 ## 标题分块
 * 每个块包含：标题行 + 紧随其后的段落
 */
function chunkMarkdown(content, maxLen = 500) {
  const lines = content.split('\n')
  const chunks = []
  let currentHeading = ''
  let currentLines = []
  let currentLen = 0

  function flush() {
    const text = currentLines.join('\n').trim()
    if (text.length > 20) {
      // 如果当前块太长，进一步按段落拆分
      if (currentLen > maxLen * 2) {
        const subChunks = splitLongChunk(currentHeading, text, maxLen)
        chunks.push(...subChunks)
      } else {
        chunks.push({
          heading: currentHeading,
          text: (currentHeading ? currentHeading + '\n\n' : '') + text,
        })
      }
    }
    currentLines = []
    currentLen = 0
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 遇到 ## / ### 标题 → 切分
    if (/^#{2,3}\s/.test(line)) {
      flush()
      currentHeading = line.trim()
      continue
    }
    // 跳过空行但保留（用于段落分隔）
    if (line.trim() === '') {
      if (currentLines.length > 0 && currentLines[currentLines.length - 1] !== '') {
        currentLines.push('')
        currentLen += 1
      }
      continue
    }
    currentLines.push(line)
    currentLen += line.length
  }
  flush() // 最后一个块

  return chunks
}

/**
 * 拆分过长的块
 */
function splitLongChunk(heading, text, maxLen) {
  const paragraphs = text.split(/\n\n+/)
  const result = []
  let buffer = []
  let bufferLen = 0

  function flushBuf() {
    const t = buffer.join('\n\n').trim()
    if (t.length > 10) {
      result.push({ heading, text: (heading ? heading + '\n\n' : '') + t })
    }
    buffer = []
    bufferLen = 0
  }

  for (const p of paragraphs) {
    if (bufferLen + p.length > maxLen && buffer.length > 0) {
      flushBuf()
    }
    buffer.push(p)
    bufferLen += p.length
  }
  flushBuf()
  return result
}

/**
 * 提取文档标题（第一个 # 或 ## 行，去掉 # 符号）
 */
function extractTitle(content) {
  const match = content.match(/^#+\s*(.+)/m)
  return match ? match[1].trim() : ''
}

/**
 * 从文件路径推导层级
 */
function inferLayer(filePath) {
  const relative = path.relative(DOCS_DIR, filePath)
  const parts = relative.split(path.sep)
  if (parts.length >= 1) {
    return LAYER_MAP[parts[0]] || parts[0]
  }
  return ''
}

/**
 * 索引所有知识文档
 * @param {object} vectorStore - 向量存储实例
 * @param {function} onProgress - 进度回调 (current, total, file)
 */
async function indexAllDocuments(vectorStore, onProgress) {
  const files = collectMarkdownFiles(DOCS_DIR)
  console.log(`[RAG] 找到 ${files.length} 个知识文档，开始索引...`)

  let totalChunks = 0
  let processed = 0

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const layer = inferLayer(filePath)
    const title = extractTitle(content)
    const relativePath = path.relative(DOCS_DIR, filePath)

    // 移除旧块
    vectorStore.removeBySource(relativePath)

    // 分块
    const chunks = chunkMarkdown(content, parseInt(process.env.RAG_CHUNK_SIZE) || 500)
    if (chunks.length === 0) continue

    // 批量 embedding
    for (const chunk of chunks) {
      try {
        const embedding = await embed(chunk.text)
        vectorStore.addChunk({
          chunkText: chunk.text,
          sourceFile: relativePath,
          layer,
          title,
          embedding,
        })
        totalChunks++
        processed++
        if (onProgress) onProgress(processed, files.length, relativePath)
      } catch (err) {
        console.error(`[RAG] 索引失败: ${relativePath} — ${err.message}`)
      }
    }
  }

  console.log(`[RAG] 索引完成，共 ${totalChunks} 个文本块`)
  return { totalChunks, totalFiles: files.length }
}

/**
 * 索引单个文件（增量更新用）
 */
async function indexSingleFile(filePath, vectorStore) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const layer = inferLayer(filePath)
  const title = extractTitle(content)
  const relativePath = path.relative(DOCS_DIR, filePath)

  // 移除旧块
  vectorStore.removeBySource(relativePath)

  // 分块
  const chunks = chunkMarkdown(content, parseInt(process.env.RAG_CHUNK_SIZE) || 500)
  if (chunks.length === 0) return 0

  let count = 0
  for (const chunk of chunks) {
    try {
      const embedding = await embed(chunk.text)
      vectorStore.addChunk({ chunkText: chunk.text, sourceFile: relativePath, layer, title, embedding })
      count++
    } catch (err) {
      console.error(`[RAG] 单文件索引失败: ${relativePath} — ${err.message}`)
    }
  }

  console.log(`[RAG] 增量索引: ${relativePath} → ${count} 块`)
  return count
}

module.exports = { indexAllDocuments, indexSingleFile, collectMarkdownFiles, chunkMarkdown }
