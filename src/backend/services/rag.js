/**
 * RAG 核心引擎
 * 1. 嵌入用户问题
 * 2. 语义检索相关上下文
 * 3. 构建 Prompt → 调用 LLM
 */
const { embed } = require('./embedding')
const { chatStream } = require('./llm')

const TOP_K = parseInt(process.env.RAG_TOP_K) || 5

/**
 * 构建 RAG Prompt
 */
function buildPrompt(question, contexts) {
  const contextText = contexts
    .map((c, i) => `[来源${i + 1}] (${c.layer || '综合'} - ${c.title || c.sourceFile})\n${c.chunkText}`)
    .join('\n\n---\n\n')

  return [
    {
      role: 'system',
      content: `你是计算机网络知识助手，专门解答 TCP/IP 五层模型相关的问题。
请根据以下知识库内容回答用户问题。如果知识库中没有相关信息，请诚实说明。
回答要准确、简洁，使用中文，适当引用来源编号。

知识库内容：
${contextText}`,
    },
    {
      role: 'user',
      content: question,
    },
  ]
}

/**
 * 执行 RAG 查询（流式）
 * @param {string} question - 用户问题
 * @param {object} vectorStore - 向量存储实例
 * @param {object} options - { provider, topK }
 */
async function* queryStream(question, vectorStore, options = {}) {
  const provider = options.provider || null
  const topK = options.topK || TOP_K

  // 1. 嵌入问题
  const queryEmbedding = await embed(question)

  // 2. 语义检索
  const contexts = vectorStore.search(queryEmbedding, topK)

  // 3. 构建 Prompt
  const messages = buildPrompt(question, contexts)

  // 4. 调用 LLM（流式）
  yield { type: 'sources', sources: contexts }

  for await (const chunk of chatStream(messages, provider)) {
    yield { type: 'content', content: chunk.content }
  }

  yield { type: 'done' }
}

module.exports = { queryStream, buildPrompt }
