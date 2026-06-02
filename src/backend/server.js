require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })

const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const knowledgeRoutes = require('./routes/knowledge')
const dnsRoutes = require('./routes/dns')
const chatRoutes = require('./routes/chat')
const { createVectorStore } = require('./services/vectorStore')
const { indexAllDocuments, indexSingleFile } = require('./services/knowledgeLoader')

const app = express()
const PORT = process.env.PORT || 3001

// 初始化数据库
const DB_PATH = path.join(__dirname, 'db', 'network.db')
const db = new Database(DB_PATH)

// 初始化收藏表 + 同名约束（幂等）
db.exec(`
  CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_point_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(knowledge_point_id)
  )
`)
// 清理历史重复 + 添加同名唯一索引
db.exec(`DELETE FROM knowledge_points WHERE id NOT IN (SELECT MIN(id) FROM knowledge_points GROUP BY layer, title)`)
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_kp_layer_title ON knowledge_points(layer, title)`)


// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 图片上传配置
const docsDir = path.join(__dirname, '..', '..', 'docs')
const uploadDir = path.join(docsDir, 'knowledge', 'images')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// RAG 向量存储 & 聊天接口
const vectorStore = createVectorStore(db)
app.use('/api/chat', chatRoutes(vectorStore))

// 知识点 CRUD 接口
app.use('/api/knowledge', knowledgeRoutes(db))

// DNS 缓存与历史接口
app.use('/api/dns', dnsRoutes(db))

// ---------- 收藏接口 ----------
// 获取收藏列表
app.get('/api/favorites', (req, res) => {
  const rows = db.prepare(`
    SELECT k.*, f.id as fav_id, f.created_at as fav_created
    FROM user_favorites f
    JOIN knowledge_points k ON f.knowledge_point_id = k.id
    ORDER BY f.created_at DESC
  `).all()
  res.json({ data: rows })
})

// 添加收藏
app.post('/api/favorites/:knowledgeId', (req, res) => {
  try {
    db.prepare('INSERT OR IGNORE INTO user_favorites (knowledge_point_id) VALUES (?)')
      .run(req.params.knowledgeId)
    res.json({ message: '已收藏' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 取消收藏
app.delete('/api/favorites/:knowledgeId', (req, res) => {
  db.prepare('DELETE FROM user_favorites WHERE knowledge_point_id = ?')
    .run(req.params.knowledgeId)
  res.json({ message: '已取消收藏' })
})

// ---------- Markdown 文件保存接口 ----------
// 支持 conflict 检测与 mode 参数：overwrite | merge | rename
app.post('/api/knowledge/md/save', express.text({ type: 'text/plain', limit: '10mb' }), async (req, res) => {
  const { layer, title, mode } = req.query
  if (!layer || !title) return res.status(400).json({ error: 'layer, title 必填' })

  const layerMap = { '应用层': '01-应用层', '传输层': '02-传输层', '网络层': '03-网络层', '数据链路层': '04-数据链路层', '物理层': '05-物理层' }
  const folder = layerMap[layer] || layer
  const baseName = title.replace(/[/\\?%*:|"<>]/g, '_')
  let filename = baseName + '.md'
  let filePath = path.join(docsDir, 'knowledge', folder, filename)
  const newContent = req.body || ''

  // 确保目录存在
  if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true })

  // 无 mode 且文件已存在 → 检测冲突
  if (fs.existsSync(filePath) && mode !== 'overwrite' && mode !== 'merge' && mode !== 'rename') {
    const existingContent = fs.readFileSync(filePath, 'utf-8')
    if (existingContent.trim() === newContent.trim()) {
      return res.json({ message: '内容相同，无需重复保存', duplicate_content: true, path: `docs/knowledge/${folder}/${filename}`, filename })
    }
    return res.json({ conflict: true, message: `文件 ${filename} 已存在且内容不同`, existing_file: filename, filename })
  }

  // 执行保存
  if (mode === 'merge' && fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8')
    fs.writeFileSync(filePath, existing + '\n\n---\n\n' + newContent, 'utf-8')
  } else if (mode === 'rename' && fs.existsSync(filePath)) {
    let counter = 1
    while (fs.existsSync(filePath)) {
      filename = `${baseName}_${counter}.md`
      filePath = path.join(docsDir, 'knowledge', folder, filename)
      counter++
    }
    fs.writeFileSync(filePath, newContent, 'utf-8')
  } else {
    fs.writeFileSync(filePath, newContent, 'utf-8')
  }

  res.json({ message: '保存成功', path: `docs/knowledge/${folder}/${filename}`, filename })

  // 增量索引：保存后自动更新向量库
  try {
    await indexSingleFile(filePath, vectorStore)
  } catch (err) {
    console.error('[RAG] 增量索引失败:', err.message)
  }
})

// ---------- 检查 MD 文件是否存在 ----------
app.get('/api/knowledge/md/exists', (req, res) => {
  const { layer, title } = req.query
  if (!layer || !title) return res.json({ exists: false })
  const layerMap = { '应用层': '01-应用层', '传输层': '02-传输层', '网络层': '03-网络层', '数据链路层': '04-数据链路层', '物理层': '05-物理层' }
  const folder = layerMap[layer] || layer
  const baseName = title.replace(/[/\\?%*:|"<>]/g, '_')
  const filePath = path.join(docsDir, 'knowledge', folder, baseName + '.md')
  res.json({ exists: fs.existsSync(filePath) })
})

// ---------- 图片上传接口 ----------
app.post('/api/knowledge/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' })
  res.json({ url: `/docs/knowledge/images/${req.file.filename}` })
})

// 静态资源：docs 目录（Markdown 详情资料 + 上传图片）
app.use('/docs', express.static(docsDir))

// 启动服务
app.listen(PORT, async () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`)

  // 如果知识库尚未索引，自动构建
  const chunkCount = vectorStore.count()
  if (chunkCount === 0) {
    console.log('[RAG] 检测到空索引，正在自动构建...')
    try {
      const result = await indexAllDocuments(vectorStore)
      console.log(`[RAG] 自动索引完成: ${result.totalChunks} 块, ${result.totalFiles} 文件`)
    } catch (err) {
      console.error('[RAG] 自动索引失败:', err.message)
      console.error('[RAG] 请确保 Ollama 已启动并已下载 nomic-embed-text 模型')
      console.error('[RAG] 手动索引: POST /api/chat/rebuild')
    }
  } else {
    console.log(`[RAG] 已有索引: ${chunkCount} 块`)
  }
})

// 优雅关闭
process.on('SIGINT', () => {
  db.close()
  process.exit(0)
})
