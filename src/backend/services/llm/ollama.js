/**
 * Ollama 本地 LLM 适配器
 * 支持流式响应（SSE）
 */
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_LLM_MODEL || 'qwen2.5:7b'

/**
 * 流式对话（返回 async generator）
 */
async function* chatStream(messages) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama chat 失败: ${res.status} — ${err}`)
  }

  // 逐行读取 NDJSON 流
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // 保留不完整的行

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        if (data.message?.content) {
          yield { content: data.message.content }
        }
        if (data.done) return
      } catch {
        // 跳过非 JSON 行
      }
    }
  }
}

/**
 * 非流式对话
 */
async function chat(messages) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama chat 失败: ${res.status} — ${err}`)
  }

  const data = await res.json()
  return data.message?.content || ''
}

module.exports = { chatStream, chat }
