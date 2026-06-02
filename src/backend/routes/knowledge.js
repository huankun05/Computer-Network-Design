const express = require('express')
const router = express.Router()

module.exports = function (db) {
  // 获取所有知识点（支持分层、分页、模糊查询）
  router.get('/', (req, res) => {
    const { layer, keyword, page = 1, pageSize = 10 } = req.query
    let sql = 'SELECT * FROM knowledge_points WHERE 1=1'
    const params = []

    if (layer) {
      sql += ' AND layer = ?'
      params.push(layer)
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    // 计算总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const { total } = db.prepare(countSql).get(...params)

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), offset)

    const rows = db.prepare(sql).all(...params)
    res.json({ data: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  })

  // 获取某层全部知识点摘要（不分页，用于展示区块）
  router.get('/summary', (req, res) => {
    const { layer } = req.query
    let sql = 'SELECT * FROM knowledge_points WHERE 1=1'
    const params = []
    if (layer) {
      sql += ' AND layer = ?'
      params.push(layer)
    }
    sql += ' ORDER BY category, title'
    const rows = db.prepare(sql).all(...params)
    res.json({ data: rows })
  })

  // 新增知识点
  router.post('/', (req, res) => {
    const { layer, category, title, description } = req.body
    if (!layer || !category || !title) {
      return res.status(400).json({ error: 'layer, category, title 为必填项' })
    }

    // 检查同层是否已存在同名知识点
    const existing = db.prepare('SELECT id, title FROM knowledge_points WHERE layer=? AND title=?').get(layer, title)
    if (existing) {
      return res.status(409).json({ error: `知识点「${title}」已在「${layer}」中存在`, existingId: existing.id })
    }

    try {
      const result = db.prepare(
        'INSERT INTO knowledge_points (layer, category, title, description) VALUES (?, ?, ?, ?)'
      ).run(layer, category, title, description || '')
      res.json({ id: result.lastInsertRowid, message: '创建成功' })
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: `知识点「${title}」已在「${layer}」中存在` })
      }
      res.status(500).json({ error: err.message })
    }
  })

  // 修改知识点
  router.put('/:id', (req, res) => {
    const { id } = req.params
    const { layer, category, title, description } = req.body

    // 检查修改后的 (layer, title) 是否与其他记录冲突
    const conflict = db.prepare(
      'SELECT id FROM knowledge_points WHERE layer=? AND title=? AND id!=?'
    ).get(layer, title, id)
    if (conflict) {
      return res.status(409).json({ error: `知识点「${title}」已在「${layer}」中存在` })
    }

    const result = db.prepare(
      'UPDATE knowledge_points SET layer=?, category=?, title=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run(layer, category, title, description || '', id)
    if (result.changes === 0) {
      return res.status(404).json({ error: '知识点不存在' })
    }
    res.json({ message: '修改成功' })
  })

  // 删除知识点
  router.delete('/:id', (req, res) => {
    const { id } = req.params
    const result = db.prepare('DELETE FROM knowledge_points WHERE id=?').run(id)
    if (result.changes === 0) {
      return res.status(404).json({ error: '知识点不存在' })
    }
    res.json({ message: '删除成功' })
  })

  return router
}
