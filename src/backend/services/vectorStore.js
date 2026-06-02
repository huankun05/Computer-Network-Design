/**
 * 向量存储 — 基于 SQLite（better-sqlite3）
 * 存储文本块 + 向量（JSON），检索时计算余弦相似度
 */
function createVectorStore(db) {
  // 初始化表
  db.exec(`
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_text TEXT NOT NULL,
      source_file TEXT NOT NULL,
      layer TEXT,
      title TEXT,
      embedding_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 预处理语句
  const stmtInsert = db.prepare(`
    INSERT INTO rag_chunks (chunk_text, source_file, layer, title, embedding_json)
    VALUES (?, ?, ?, ?, ?)
  `)
  const stmtAll = db.prepare('SELECT * FROM rag_chunks')
  const stmtCount = db.prepare('SELECT COUNT(*) as count FROM rag_chunks')
  const stmtClear = db.prepare('DELETE FROM rag_chunks')
  const stmtBySource = db.prepare('SELECT id FROM rag_chunks WHERE source_file = ?')

  /**
   * 清空所有向量
   */
  function clearAll() {
    stmtClear.run()
  }

  /**
   * 添加一个文本块（含向量）
   */
  function addChunk({ chunkText, sourceFile, layer, title, embedding }) {
    stmtInsert.run(chunkText, sourceFile, layer || null, title || null, JSON.stringify(embedding))
  }

  /**
   * 删除某个源文件的所有块
   */
  function removeBySource(sourceFile) {
    const ids = stmtBySource.all(sourceFile).map(r => r.id)
    if (ids.length > 0) {
      db.prepare(`DELETE FROM rag_chunks WHERE id IN (${ids.join(',')})`).run()
    }
  }

  /**
   * 获取所有块数量
   */
  function count() {
    return stmtCount.get().count
  }

  /**
   * 余弦相似度
   */
  function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  /**
   * 语义检索：返回 top-K 最相似的文本块
   */
  function search(queryEmbedding, k = 5) {
    const rows = stmtAll.all()
    const scored = rows.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding_json),
      score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding_json)),
    }))
    scored.sort((a, b) => b.score - a.score)
    // 过滤低相关度（阈值 0.3）
    const relevant = scored.filter(r => r.score > 0.3)
    return relevant.slice(0, k).map(r => ({
      chunkText: r.chunk_text,
      sourceFile: r.source_file,
      layer: r.layer,
      title: r.title,
      score: Math.round(r.score * 100) / 100,
    }))
  }

  /**
   * 批量添加（事务）
   */
  function addChunksBatch(chunks) {
    const tx = db.transaction((items) => {
      for (const item of items) {
        stmtInsert.run(
          item.chunkText, item.sourceFile,
          item.layer || null, item.title || null,
          JSON.stringify(item.embedding)
        )
      }
    })
    tx(chunks)
  }

  return { clearAll, addChunk, addChunksBatch, removeBySource, count, search }
}

module.exports = { createVectorStore }
