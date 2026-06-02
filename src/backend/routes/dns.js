const express = require('express')
const router = express.Router()

module.exports = function (db) {
  // 查询 DNS 缓存列表
  router.get('/cache', (req, res) => {
    const { domain, page = 1, pageSize = 20 } = req.query
    let sql = 'SELECT * FROM dns_cache WHERE 1=1'
    const params = []

    if (domain) {
      sql += ' AND domain LIKE ?'
      params.push(`%${domain}%`)
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const { total } = db.prepare(countSql).get(...params)

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), offset)

    const rows = db.prepare(sql).all(...params)
    res.json({ data: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  })

  // 新增 DNS 缓存记录
  router.post('/cache', (req, res) => {
    const { domain, ip_address, ttl = 3600, query_type = 'A' } = req.body
    if (!domain || !ip_address) {
      return res.status(400).json({ error: 'domain 和 ip_address 为必填项' })
    }
    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM dns_cache WHERE domain = ? AND ip_address = ?').get(domain, ip_address)
    if (existing) {
      // 更新 TTL
      db.prepare(`UPDATE dns_cache SET ttl = ?, expires_at = datetime('now', '+' || ? || ' seconds') WHERE id = ?`)
        .run(ttl, ttl, existing.id)
      return res.json({ id: existing.id, message: '缓存已更新' })
    }
    const result = db.prepare(
      `INSERT INTO dns_cache (domain, ip_address, ttl, query_type, expires_at) VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))`
    ).run(domain, ip_address, ttl, query_type, ttl)
    res.json({ id: result.lastInsertRowid, message: '缓存创建成功' })
  })

  // 删除 DNS 缓存记录
  router.delete('/cache/:id', (req, res) => {
    const { id } = req.params
    const result = db.prepare('DELETE FROM dns_cache WHERE id = ?').run(id)
    if (result.changes === 0) {
      return res.status(404).json({ error: '缓存记录不存在' })
    }
    res.json({ message: '删除成功' })
  })

  // 清空 DNS 缓存
  router.delete('/cache', (req, res) => {
    db.prepare('DELETE FROM dns_cache').run()
    res.json({ message: '缓存已清空' })
  })

  // 查询 DNS 历史记录
  router.get('/history', (req, res) => {
    const { domain, page = 1, pageSize = 20 } = req.query
    let sql = 'SELECT * FROM dns_history WHERE 1=1'
    const params = []

    if (domain) {
      sql += ' AND domain LIKE ?'
      params.push(`%${domain}%`)
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const { total } = db.prepare(countSql).get(...params)

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), offset)

    const rows = db.prepare(sql).all(...params)
    res.json({ data: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  })

  // 记录 DNS 查询历史
  router.post('/history', (req, res) => {
    const { domain, result_ip, query_steps, cache_hit = 0 } = req.body
    if (!domain) {
      return res.status(400).json({ error: 'domain 为必填项' })
    }
    const result = db.prepare(
      'INSERT INTO dns_history (domain, result_ip, query_steps, cache_hit) VALUES (?, ?, ?, ?)'
    ).run(domain, result_ip || null, query_steps ? JSON.stringify(query_steps) : null, cache_hit ? 1 : 0)
    res.json({ id: result.lastInsertRowid, message: '历史记录已保存' })
  })

  // 清空 DNS 历史
  router.delete('/history', (req, res) => {
    db.prepare('DELETE FROM dns_history').run()
    res.json({ message: '历史记录已清空' })
  })

  return router
}
