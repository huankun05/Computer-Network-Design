const express = require('express')
const router = express.Router()
const { indexAllDocuments } = require('../services/knowledgeLoader')
const { queryStream } = require('../services/rag')

module.exports = function (vectorStore) {
  // ===== 问答接口（SSE 流式） =====
  router.post('/', async (req, res) => {
    const { question, provider } = req.body

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'question 不能为空' })
    }

    // 检查是否有索引数据
    if (vectorStore.count() === 0) {
      return res.status(503).json({
        error: '知识库尚未索引，请先调用 POST /api/chat/rebuild',
      })
    }

    // SSE 流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    try {
      for await (const event of queryStream(question.trim(), vectorStore, { provider })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
        if (event.type === 'done') break
      }
    } catch (err) {
      console.error('[Chat] 错误:', err.message)
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    }

    res.end()
  })

  // ===== 重建索引 =====
  router.post('/rebuild', async (req, res) => {
    try {
      vectorStore.clearAll()
      const result = await indexAllDocuments(vectorStore, (current, total, file) => {
        console.log(`[Rebuild] ${current}/${total} — ${file}`)
      })
      res.json({ message: '索引重建完成', ...result })
    } catch (err) {
      console.error('[Rebuild] 失败:', err.message)
      res.status(500).json({ error: err.message })
    }
  })

  // ===== 索引状态 =====
  router.get('/status', (req, res) => {
    const chunkCount = vectorStore.count()
    const llmProvider = process.env.LLM_PROVIDER || 'ollama'
    const embedModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

    res.json({
      indexed: chunkCount > 0,
      chunkCount,
      llmProvider,
      embedModel,
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    })
  })

  return router
}
