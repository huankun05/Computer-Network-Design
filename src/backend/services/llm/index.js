/**
 * LLM Provider 路由器
 * 根据 LLM_PROVIDER / FALLBACK_LLM_PROVIDER 环境变量选择适配器
 */
const ollama = require('./ollama')
const deepseek = require('./deepseek')

const PROVIDERS = {
  ollama,
  deepseek,
}

/**
 * 获取当前使用的 Provider
 */
function getProvider(name) {
  const provider = PROVIDERS[name]
  if (!provider) {
    console.warn(`[LLM] 未知 provider "${name}"，回退到 ollama`)
    return ollama
  }
  return provider
}

/**
 * 流式对话生成器
 */
async function* chatStream(messages, providerName) {
  const name = providerName || process.env.LLM_PROVIDER || 'ollama'
  const provider = getProvider(name)

  try {
    for await (const chunk of provider.chatStream(messages)) {
      yield chunk
    }
  } catch (err) {
    // 主 provider 失败时尝试回退
    const fallback = process.env.FALLBACK_LLM_PROVIDER
    if (fallback && fallback !== name) {
      console.warn(`[LLM] ${name} 失败: ${err.message}，尝试 ${fallback} 回退`)
      const fb = getProvider(fallback)
      for await (const chunk of fb.chatStream(messages)) {
        yield chunk
      }
    } else {
      throw err
    }
  }
}

/**
 * 非流式对话
 */
async function chat(messages, providerName) {
  const name = providerName || process.env.LLM_PROVIDER || 'ollama'
  const provider = getProvider(name)
  return provider.chat(messages)
}

module.exports = { chatStream, chat, getProvider, PROVIDERS }
