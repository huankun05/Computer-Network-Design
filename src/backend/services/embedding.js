/**
 * Embedding 服务 — 通过 Ollama 将文本转为向量
 */
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

/**
 * 单条文本 → 向量
 */
async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama embedding 失败: ${res.status} — ${err}`)
  }
  const data = await res.json()
  return data.embedding // number[]
}

/**
 * 批量文本 → 向量（逐条调用，避免 Ollama 并发瓶颈）
 */
async function embedBatch(texts) {
  const results = []
  for (const text of texts) {
    results.push(await embed(text))
  }
  return results
}

module.exports = { embed, embedBatch }
