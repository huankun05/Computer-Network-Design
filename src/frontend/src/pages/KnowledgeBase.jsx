import { useState, useEffect, useRef, useCallback } from 'react'
import { Typography, Table, Button, Input, Select, Modal, Form, Space, Tag, message, Tabs, Divider, Spin, Descriptions, Tooltip, Drawer, List, Popconfirm, Upload, Radio } from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, FileTextOutlined, FullscreenOutlined, FullscreenExitOutlined,
  SaveOutlined, StarOutlined, StarFilled, UploadOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const { Title, Paragraph, Text } = Typography
const { Search } = Input
const { Option } = Select

// 五层模型配置
const LAYERS = [
  { key: '应用层', name: '应用层', color: '#1890ff', description: '为用户的应用进程提供网络通信服务' },
  { key: '传输层', name: '传输层', color: '#52c41a', description: '为主机之间的进程提供端到端的逻辑通信' },
  { key: '网络层', name: '网络层', color: '#722ed1', description: '负责数据包的寻址和路由' },
  { key: '数据链路层', name: '数据链路层', color: '#fa8c16', description: '提供节点到节点的数据传输' },
  { key: '物理层', name: '物理层', color: '#f5222d', description: '在物理媒介上传输原始比特流' },
]

const LAYER_META = {
  '应用层': { devices: 'PC、服务器、防火墙', dataUnit: '消息 / 报文 (Message)', desc: '应用进程间通信的数据单元' },
  '传输层': { devices: '（端到端逻辑通信）', dataUnit: '段 / 数据报 (Segment / Datagram)', desc: 'TCP 使用段，UDP 使用数据报' },
  '网络层': { devices: '路由器', dataUnit: '数据包 (Packet)', desc: '包含源/目的 IP 地址的传输单元' },
  '数据链路层': { devices: '交换机、网桥、网卡', dataUnit: '帧 (Frame)', desc: '包含源/目的 MAC 地址的传输单元' },
  '物理层': { devices: '集线器、中继器、网线、光纤', dataUnit: '比特 (Bit)', desc: '原始比特流，0 和 1' },
}

const CATEGORY_COLORS = {
  '协议': '#1890ff',
  '概念': '#52c41a',
  '技术': '#722ed1',
  '设备': '#fa8c16',
}

const LAYER_MAP = {
  '应用层': '01-应用层', '传输层': '02-传输层', '网络层': '03-网络层',
  '数据链路层': '04-数据链路层', '物理层': '05-物理层',
}

// Markdown 渲染样式常量
const MARKDOWN_STYLES = {
  h1: { fontSize: 22, fontWeight: 700, color: '#1f2937', margin: '20px 0 12px', borderBottom: '2px solid #e5e7eb', paddingBottom: 6 },
  h2: { fontSize: 18, fontWeight: 600, color: '#374151', margin: '16px 0 10px' },
  h3: { fontSize: 15, fontWeight: 600, color: '#4b5563', margin: '12px 0 8px' },
  h4: { fontSize: 14, fontWeight: 600, color: '#6b7280', margin: '10px 0 6px' },
  p: { fontSize: 14, lineHeight: 1.85, color: '#374151', margin: '6px 0' },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: 3, fontSize: 13, fontFamily: 'Consolas, Monaco, monospace' },
  pre: { background: '#1e293b', color: '#e2e8f0', padding: 14, borderRadius: 8, overflowX: 'auto', fontSize: 13, lineHeight: 1.6, margin: '10px 0' },
  table: { borderCollapse: 'collapse', width: '100%', margin: '10px 0', fontSize: 13 },
  th: { border: '1px solid #d1d5db', padding: '8px 12px', background: '#f9fafb', fontWeight: 600, textAlign: 'left' },
  td: { border: '1px solid #d1d5db', padding: '6px 12px' },
  blockquote: { borderLeft: '4px solid #3b82f6', padding: '8px 16px', margin: '10px 0', background: '#f0f7ff', borderRadius: '0 6px 6px 0' },
  ul: { paddingLeft: 20, margin: '6px 0' },
  ol: { paddingLeft: 20, margin: '6px 0' },
  li: { margin: '3px 0', fontSize: 14, lineHeight: 1.8, color: '#374151' },
  strong: { fontWeight: 600, color: '#1f2937' },
  a: { color: '#2563eb', textDecoration: 'underline' },
  hr: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' },
  img: { maxWidth: '100%', borderRadius: 6, margin: '8px 0' },
}

function KnowledgeBase() {
  const navigate = useNavigate()
  const [activeLayer, setActiveLayer] = useState('应用层')
  const [knowledgeList, setKnowledgeList] = useState([])
  const [layerItems, setLayerItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form] = Form.useForm()
  const [mdContent, setMdContent] = useState('')  // 新增/编辑时的 MD 内容

  // 冲突处理
  const [conflictVisible, setConflictVisible] = useState(false)
  const [conflictData, setConflictData] = useState(null) // { layer, title, mdContent, source: 'modal'|'detail' }
  const [conflictResolve, setConflictResolve] = useState('rename')

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [detailMd, setDetailMd] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFullscreen, setDetailFullscreen] = useState(false)
  const [detailEditing, setDetailEditing] = useState(false)
  const [editMdText, setEditMdText] = useState('')
  const [savingMd, setSavingMd] = useState(false)
  const textareaRef = useRef(null)

  // 收藏
  const [favIds, setFavIds] = useState(new Set())
  const [favList, setFavList] = useState([])
  const [favDrawerOpen, setFavDrawerOpen] = useState(false)

  // 获取知识点列表（分页）
  const fetchKnowledge = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        layer: activeLayer, page: page.toString(), pageSize: pageSize.toString(),
      })
      if (keyword) params.append('keyword', keyword)
      const res = await fetch(`/api/knowledge?${params}`)
      const data = await res.json()
      setKnowledgeList(data.data || [])
      setTotal(data.total || 0)
    } catch { message.error('获取知识点失败') }
    finally { setLoading(false) }
  }

  const fetchLayerSummary = async () => {
    try {
      const res = await fetch(`/api/knowledge/summary?layer=${encodeURIComponent(activeLayer)}`)
      const data = await res.json()
      setLayerItems(data.data || [])
    } catch { /* 静默 */ }
  }

  // 获取收藏
  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites')
      const data = await res.json()
      setFavList(data.data || [])
      setFavIds(new Set((data.data || []).map((f) => f.id)))
    } catch { /* 静默 */ }
  }

  useEffect(() => {
    fetchKnowledge()
    fetchLayerSummary()
  }, [activeLayer, page, pageSize, keyword])

  useEffect(() => { fetchFavorites() }, [])

  // 新增/编辑（含 MD 内容保存 + 冲突处理）
  const doSaveMd = async (layer, title, content, mode) => {
    const raw = title.replace(/[/\\?%*:|"<>]/g, '_')
    const params = new URLSearchParams({ layer, title: raw })
    if (mode) params.append('mode', mode)
    const res = await fetch(`/api/knowledge/md/save?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    })
    return res.json()
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const body = { ...values, layer: activeLayer }
      let knowledgeId = editingItem?.id
      if (editingItem) {
        const res = await fetch(`/api/knowledge/${editingItem.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          message.error(err.error || '修改失败')
          return
        }
        message.success('修改成功')
      } else {
        const res = await fetch('/api/knowledge', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          message.error(data.error || '新增失败')
          return
        }
        knowledgeId = data.id
        message.success('新增成功')
      }

      // 同步保存 MD 详细内容
      if (mdContent.trim()) {
        const result = await doSaveMd(activeLayer, values.title, mdContent)
        if (result.conflict) {
          setConflictData({ layer: activeLayer, title: values.title, mdContent, source: 'modal' })
          setConflictResolve('rename')
          setConflictVisible(true)
          return // 等待用户选择
        }
        if (result.duplicate_content) {
          message.info('存在相同内容，已跳过')
        }
      }

      setModalVisible(false)
      form.resetFields()
      setMdContent('')
      setEditingItem(null)
      fetchKnowledge()
    } catch { /* 验证失败 */ }
  }

  // 冲突弹窗：执行用户选择
  const handleConflictConfirm = async () => {
    setConflictVisible(false)
    if (!conflictData) return
    const { layer, title, mdContent: content, source } = conflictData
    const result = await doSaveMd(layer, title, content, conflictResolve)
    if (result.message) message.success(result.message)

    if (source === 'detail') {
      // 详情弹窗：更新显示内容并退出编辑
      setDetailMd(content)
      setDetailEditing(false)
    } else {
      // 编辑弹窗：关闭并刷新列表
      setModalVisible(false)
      form.resetFields()
      setMdContent('')
      setEditingItem(null)
      fetchKnowledge()
    }
    setConflictData(null)
  }

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除', content: '删除后不可恢复，是否继续？',
      onOk: async () => {
        try {
          await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
          message.success('删除成功')
          fetchKnowledge()
        } catch { message.error('删除失败') }
      },
    })
  }

  const handleEdit = async (record) => {
    setEditingItem(record)
    setMdContent('')
    form.setFieldsValue({ category: record.category, title: record.title, description: record.description })
    setModalVisible(true)
    // 加载已有 MD 内容
    const folder = LAYER_MAP[record.layer] || record.layer
    const raw = record.title.replace(/[/\\?%*:|"<>]/g, '_')
    const candidates = [...new Set([raw, raw.toLowerCase()])]
    for (const fn of candidates) {
      try {
        const res = await fetch(`/docs/knowledge/${folder}/${fn}.md`)
        if (res.ok) { setMdContent(await res.text()); break }
      } catch { /* 继续 */ }
    }
  }

  // 查看详情
  const handleDetail = async (record) => {
    setDetailItem(record)
    setDetailVisible(true)
    setDetailLoading(true)
    setDetailMd('')
    setDetailEditing(false)
    setDetailFullscreen(false)

    const folder = LAYER_MAP[record.layer] || record.layer
    const raw = record.title.replace(/[/\\?%*:|"<>]/g, '_')
    const candidates = [...new Set([raw, raw.toLowerCase()])]
    let text = null
    for (const fn of candidates) {
      try {
        const res = await fetch(`/docs/knowledge/${folder}/${fn}.md`)
        if (res.ok) { text = await res.text(); break }
      } catch { /* 继续尝试 */ }
    }
    setDetailMd(text)
    setDetailLoading(false)
  }

  // 切换全屏
  const toggleFullscreen = () => setDetailFullscreen(!detailFullscreen)

  // 进入编辑模式
  const startEditMd = () => {
    setEditMdText(detailMd || '')
    setDetailEditing(true)
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus()
    }, 100)
  }

  // 保存 Markdown（详情弹窗）—— 含冲突处理
  const saveMd = async () => {
    if (!detailItem) return
    setSavingMd(true)
    try {
      const result = await doSaveMd(detailItem.layer, detailItem.title, editMdText)
      if (result.conflict) {
        setConflictData({ layer: detailItem.layer, title: detailItem.title, mdContent: editMdText, source: 'detail' })
        setConflictResolve('rename')
        setConflictVisible(true)
        setSavingMd(false)
        return
      }
      if (result.duplicate_content) {
        message.info('存在相同内容，已跳过')
        setDetailEditing(false)
        setSavingMd(false)
        return
      }
      message.success('保存成功')
      setDetailMd(editMdText)
      setDetailEditing(false)
    } catch { message.error('保存失败') }
    finally { setSavingMd(false) }
  }

  // 粘贴图片
  const handleImagePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        const formData = new FormData()
        formData.append('image', blob)
        try {
          const res = await fetch('/api/knowledge/upload-image', { method: 'POST', body: formData })
          const data = await res.json()
          if (data.url) {
            const imgMd = `\n![图片](${data.url})\n`
            setEditMdText((prev) => prev + imgMd)
            message.success('图片已插入')
          }
        } catch { message.error('图片上传失败') }
        break
      }
    }
  }, [])

  // 收藏/取消收藏
  const toggleFavorite = async (record) => {
    const id = record.id
    try {
      if (favIds.has(id)) {
        await fetch(`/api/favorites/${id}`, { method: 'DELETE' })
        setFavIds((prev) => { const s = new Set(prev); s.delete(id); return s })
        setFavList((prev) => prev.filter((f) => f.id !== id))
        message.info('已取消收藏')
      } else {
        await fetch(`/api/favorites/${id}`, { method: 'POST' })
        setFavIds((prev) => new Set(prev).add(id))
        setFavList((prev) => [{ ...record, fav_created: new Date().toISOString() }, ...prev])
        message.success('已收藏')
      }
    } catch { message.error('操作失败') }
  }

  // 表格列
  const columns = [
    {
      title: '', key: 'fav', width: 40, align: 'center',
      render: (_, record) => (
        <span style={{ cursor: 'pointer', fontSize: 16 }} onClick={() => toggleFavorite(record)}>
          {favIds.has(record.id) ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined style={{ color: '#d1d5db' }} />}
        </span>
      ),
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 90,
      render: (text) => <Tag color={CATEGORY_COLORS[text] || '#888'}>{text}</Tag>,
    },
    { title: '标题', dataIndex: 'title', key: 'title', width: 160 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '操作', key: 'action', width: 130, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="查看详情"><Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleDetail(record)} /></Tooltip>
          <Tooltip title="编辑"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Tooltip title="删除"><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} /></Tooltip>
        </Space>
      ),
    },
  ]

  const protocolItems = layerItems.filter((i) => i.category === '协议')
  const conceptItems = layerItems.filter((i) => i.category === '概念')
  const techItems = layerItems.filter((i) => i.category === '技术')
  const deviceItems = layerItems.filter((i) => i.category === '设备')
  const allTagItems = [...protocolItems, ...techItems, ...deviceItems, ...conceptItems]
  const meta = LAYER_META[activeLayer]
  const currentLayer = LAYERS.find((l) => l.key === activeLayer)

  // 详情 Modal 的标题栏
  const detailTitle = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 }}>
      <span>{detailItem ? `${detailItem.title} — 详细资料` : '详细资料'}</span>
      <Space size={8}>
        {detailMd !== null && !detailEditing && (
          <Tooltip title="编辑资料"><Button size="small" icon={<EditOutlined />} onClick={startEditMd} /></Tooltip>
        )}
        {detailEditing && (
          <Tooltip title="保存"><Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveMd} loading={savingMd} /></Tooltip>
        )}
        <Tooltip title={detailFullscreen ? '退出全屏' : '全屏查看'}>
          <Button size="small" icon={detailFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={toggleFullscreen} />
        </Tooltip>
      </Space>
    </div>
  )

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa', overflow: 'hidden' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, color: '#1f2937' }}>计算机网络知识体系</Title>
      </div>

      {/* 层级标签页 */}
      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Tabs
          activeKey={activeLayer}
          onChange={(key) => { setActiveLayer(key); setPage(1); setKeyword('') }}
          size="small"
          items={LAYERS.map((layer) => ({ key: layer.key, label: <span><Tag color={layer.color} style={{ marginRight: 4 }}>{layer.name}</Tag></span> }))}
        />
      </div>

      {/* 层级信息 */}
      <div style={{ marginBottom: 12, padding: '14px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Title level={5} style={{ margin: '0 0 8px 0', color: currentLayer?.color }}>{currentLayer?.name}</Title>
        <Paragraph style={{ color: '#6b7280', fontSize: 12, margin: '0 0 10px 0' }}>{currentLayer?.description}</Paragraph>

        {allTagItems.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ marginBottom: 4 }}><Text strong style={{ fontSize: 12, color: '#374151' }}>本层知识点：</Text></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {allTagItems.map((item) => (
                <Tag key={item.id} color={CATEGORY_COLORS[item.category] || '#888'} style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => handleDetail(item)}>
                  {item.title}<span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>({item.category})</span>
                </Tag>
              ))}
            </div>
          </>
        )}

        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
          <div><Text type="secondary">相关设备：</Text><Text style={{ color: '#374151' }}>{meta?.devices}</Text></div>
          <div><Text type="secondary">数据单位：</Text><Text style={{ color: '#374151' }}>{meta?.dataUnit}</Text></div>
          <div><Text type="secondary" style={{ fontSize: 13, color: '#6b7280' }}>{meta?.desc}</Text></div>
        </div>
      </div>

      {/* 搜索和操作栏 */}
      <div style={{ marginBottom: 12, padding: '10px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size={12}>
            <Search placeholder="搜索知识点..." allowClear size="small" onSearch={(v) => { setKeyword(v); setPage(1) }} style={{ width: 250 }} />
            <Tooltip title="收藏夹">
              <Button size="small" icon={<StarFilled style={{ color: '#f59e0b' }} />} onClick={() => { fetchFavorites(); setFavDrawerOpen(true) }}>
                收藏夹 {favList.length > 0 && `(${favList.length})`}
              </Button>
            </Tooltip>
          </Space>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
            setEditingItem(null); form.resetFields(); setMdContent(''); setModalVisible(true)
          }}>新增</Button>
        </div>
      </div>

      {/* 知识点列表 */}
      <div style={{ flex: 1, minHeight: 0, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 12, overflow: 'auto' }}>
        <Table
          columns={columns} dataSource={knowledgeList} rowKey="id" loading={loading} size="small"
          pagination={{
            current: page, pageSize, total, size: 'small', showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </div>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingItem ? '编辑知识点' : '新增知识点'} open={modalVisible} onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); setMdContent(''); setEditingItem(null) }}
        width={750}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              <Option value="协议">协议</Option><Option value="概念">概念</Option>
              <Option value="技术">技术</Option><Option value="设备">设备</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入知识点标题" />
          </Form.Item>
          <Form.Item name="description" label="简要描述">
            <Input.TextArea rows={2} placeholder="输入简要描述（表格中显示）" />
          </Form.Item>
          <Form.Item label="上传 MD 文件（可选）">
            <Upload
              accept=".md,.txt,.markdown"
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  setMdContent(e.target.result)
                  message.success(`已加载文件：${file.name}`)
                  // 若标题为空，用文件名自动填充
                  const currentTitle = form.getFieldValue('title')
                  if (!currentTitle) {
                    const autoTitle = file.name.replace(/\.(md|txt|markdown)$/i, '')
                    form.setFieldsValue({ title: autoTitle })
                  }
                }
                reader.readAsText(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />} size="small">选择 .md 文件</Button>
            </Upload>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              上传后内容自动填入下方编辑器，可继续编辑
            </div>
          </Form.Item>
          <Form.Item label="详细资料（Markdown）">
            <Input.TextArea
              value={mdContent}
              onChange={(e) => setMdContent(e.target.value)}
              rows={10}
              placeholder={`输入 Markdown 格式的详细资料，支持：
# 一级标题
## 二级标题
**加粗** *斜体* \`代码\`
| 表格 | 内容 |
|------|------|
`}
              style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13, lineHeight: 1.6 }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              💡 支持 Markdown 语法，保存后将作为"详细资料"展示 | 也可上传 .md 文件自动填充
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 知识点详情弹窗 */}
      <Modal
        title={detailTitle}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailEditing(false); setDetailFullscreen(false) }}
        footer={null}
        width={detailFullscreen ? '95vw' : 900}
        style={detailFullscreen ? { top: 20, paddingBottom: 0 } : {}}
        styles={{ body: detailFullscreen ? { height: 'calc(95vh - 110px)', overflow: 'auto' } : { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#6b7280' }}>正在加载详细资料…</div>
          </div>
        ) : detailEditing ? (
          /* 编辑模式 */
          <div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
              💡 支持 Markdown 语法，可直接粘贴图片（Ctrl+V）
            </div>
            <Input.TextArea
              ref={textareaRef}
              value={editMdText}
              onChange={(e) => setEditMdText(e.target.value)}
              onPaste={handleImagePaste}
              rows={detailFullscreen ? 32 : 22}
              style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 13, lineHeight: 1.6 }}
            />
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailEditing(false)}>取消</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={saveMd} loading={savingMd}>保存</Button>
              </Space>
            </div>
          </div>
        ) : detailMd ? (
          /* Markdown 渲染 */
          <div style={{ minHeight: 200 }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 style={MARKDOWN_STYLES.h1}>{children}</h1>,
                h2: ({ children }) => <h2 style={MARKDOWN_STYLES.h2}>{children}</h2>,
                h3: ({ children }) => <h3 style={MARKDOWN_STYLES.h3}>{children}</h3>,
                h4: ({ children }) => <h4 style={MARKDOWN_STYLES.h4}>{children}</h4>,
                p: ({ children }) => <p style={MARKDOWN_STYLES.p}>{children}</p>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className
                  return isInline
                    ? <code style={MARKDOWN_STYLES.code} {...props}>{children}</code>
                    : <pre style={MARKDOWN_STYLES.pre}><code>{children}</code></pre>
                },
                table: ({ children }) => <table style={MARKDOWN_STYLES.table}>{children}</table>,
                th: ({ children }) => <th style={MARKDOWN_STYLES.th}>{children}</th>,
                td: ({ children }) => <td style={MARKDOWN_STYLES.td}>{children}</td>,
                blockquote: ({ children }) => <blockquote style={MARKDOWN_STYLES.blockquote}>{children}</blockquote>,
                ul: ({ children }) => <ul style={MARKDOWN_STYLES.ul}>{children}</ul>,
                ol: ({ children }) => <ol style={MARKDOWN_STYLES.ol}>{children}</ol>,
                li: ({ children }) => <li style={MARKDOWN_STYLES.li}>{children}</li>,
                strong: ({ children }) => <strong style={MARKDOWN_STYLES.strong}>{children}</strong>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={MARKDOWN_STYLES.a}>{children}</a>,
                hr: () => <hr style={MARKDOWN_STYLES.hr} />,
                img: ({ src, alt }) => <img src={src} alt={alt} style={MARKDOWN_STYLES.img} />,
              }}
            >
              {detailMd}
            </ReactMarkdown>
            {detailMd.length > 200 && (
              <div style={{ marginTop: 20, padding: 10, background: '#f9fafb', borderRadius: 6, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                — 文档结束 —
              </div>
            )}
          </div>
        ) : (
          /* 无 Markdown 资料时的兜底展示 */
          <div style={{ padding: 8 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称"><Text strong>{detailItem?.title}</Text></Descriptions.Item>
              <Descriptions.Item label="所属层级"><Tag color={currentLayer?.color}>{detailItem?.layer}</Tag></Descriptions.Item>
              <Descriptions.Item label="分类"><Tag color={CATEGORY_COLORS[detailItem?.category] || '#888'}>{detailItem?.category}</Tag></Descriptions.Item>
              <Descriptions.Item label="描述"><Text>{detailItem?.description}</Text></Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠ 该知识点暂无详细 Markdown 资料文件。<br />
                可点击上方「编辑资料」按钮创建，或启动自动生成以补充内容。
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* 收藏夹抽屉 */}
      <Drawer
        title={<span><StarFilled style={{ color: '#f59e0b', marginRight: 8 }} />我的收藏夹</span>}
        open={favDrawerOpen}
        onClose={() => setFavDrawerOpen(false)}
        width={420}
      >
        {favList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <StarOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <div>暂无收藏，点击知识点前的 ⭐ 即可收藏</div>
          </div>
        ) : (
          <List
            dataSource={favList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Tooltip title="查看详情"><Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => { handleDetail(item); setFavDrawerOpen(false) }} /></Tooltip>,
                  <Popconfirm title="取消收藏？" onConfirm={() => toggleFavorite(item)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Tag color={CATEGORY_COLORS[item.category] || '#888'}>{item.category}</Tag>}
                  title={item.title}
                  description={
                    <div>
                      <Tag color={LAYERS.find((l) => l.key === item.layer)?.color || '#888'} style={{ fontSize: 11 }}>{item.layer}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.description?.slice(0, 50)}{(item.description?.length || 0) > 50 ? '…' : ''}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      {/* 文件命名冲突弹窗 */}
      <Modal
        title={<span><ExclamationCircleOutlined style={{ color: '#f59e0b', marginRight: 8 }} />文件命名冲突</span>}
        open={conflictVisible}
        onOk={handleConflictConfirm}
        onCancel={() => { setConflictVisible(false); setConflictData(null) }}
        okText="确认"
        cancelText="取消（手动编辑）"
        width={520}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            MD 文件 <Text code>{conflictData?.title?.replace(/[/\\?%*:|"<>]/g, '_')}.md</Text> 已存在且内容不同，请选择处理方式：
          </Text>
        </div>
        <Radio.Group
          value={conflictResolve}
          onChange={(e) => setConflictResolve(e.target.value)}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 12 }}>
            <Radio value="rename">
              <Text strong>自动重命名</Text>
              <div style={{ fontSize: 12, color: '#6b7280', marginLeft: 24, marginTop: 2 }}>
                生成新文件名（如 xxx_1.md），保留两份资料
              </div>
            </Radio>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Radio value="merge">
              <Text strong>合并文档</Text>
              <div style={{ fontSize: 12, color: '#6b7280', marginLeft: 24, marginTop: 2 }}>
                将新内容追加到已有文件末尾，用分隔线隔开
              </div>
            </Radio>
          </div>
          <div>
            <Radio value="overwrite">
              <Text strong style={{ color: '#ef4444' }}>覆盖</Text>
              <div style={{ fontSize: 12, color: '#6b7280', marginLeft: 24, marginTop: 2 }}>
                用新内容完全替换已有文件（不可恢复）
              </div>
            </Radio>
          </div>
        </Radio.Group>
      </Modal>
    </div>
  )
}

export default KnowledgeBase
