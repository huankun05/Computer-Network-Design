import { useEffect, useState } from 'react'
import { Table, Tag, Button, Space, Card, message, Popconfirm } from 'antd'
import { DeleteOutlined, HistoryOutlined, ClearOutlined } from '@ant-design/icons'

// 历史记录最大条数
const MAX_HISTORY_SIZE = 20

/**
 * DNS 缓存表组件
 * 展示 DNS 缓存记录，支持删除操作
 * 同时支持前端内存缓存和后端数据库
 */
function DnsCacheTable({ refreshTrigger, frontendCache = [], onClearFrontendCache }) {
  const [cacheData, setCacheData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // 加载后端缓存数据
  const loadBackendCache = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dns/cache')
      const data = await res.json()
      setCacheData(data.data || [])
    } catch {
      // 后端未启动时使用空数据
      setCacheData([])
    }
    setLoading(false)
  }

  // 加载历史数据（限制条数）
  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/dns/history?pageSize=${MAX_HISTORY_SIZE}`)
      const data = await res.json()
      setHistoryData(data.data || [])
    } catch {
      setHistoryData([])
    }
  }

  // 删除单条缓存
  const handleDelete = async (id) => {
    // 前端缓存
    if (typeof id === 'string' && id.startsWith('frontend-')) {
      message.success('删除成功')
      loadBackendCache()
      return
    }
    // 后端缓存
    try {
      await fetch(`/api/dns/cache/${id}`, { method: 'DELETE' })
      message.success('删除成功')
      loadBackendCache()
    } catch {
      message.error('删除失败')
    }
  }

  // 清空所有缓存
  const handleClearAll = async () => {
    // 清空前端缓存
    if (onClearFrontendCache) {
      onClearFrontendCache()
    }
    // 清空后端缓存
    try {
      await fetch('/api/dns/cache', { method: 'DELETE' })
      message.success('缓存已清空')
      loadBackendCache()
    } catch {
      message.error('清空失败')
    }
  }

  useEffect(() => {
    loadBackendCache()
  }, [refreshTrigger])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory])

  // 合并前端内存缓存和后端缓存（去重）
  const mergedCache = [
    ...frontendCache.map((item, idx) => ({
      id: `frontend-${idx}`,
      domain: item.domain,
      ip_address: item.ip,
      ttl: item.ttl || 3600,
      query_type: 'A',
      created_at: item.time || new Date().toLocaleTimeString(),
      isSimulated: item.isSimulated,
      isFrontend: true,
    })),
    ...cacheData.filter(backend =>
      !frontendCache.some(frontend => frontend.domain === backend.domain && frontend.ip === backend.ip_address)
    ),
  ]

  const cacheColumns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 150,
      render: (text) => <code style={{ fontSize: 12 }}>{text}</code>,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
      render: (text, record) => (
        <span>
          <code style={{ color: '#52c41a', fontSize: 12 }}>{text}</code>
          {record.isSimulated && <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>模拟</Tag>}
        </span>
      ),
    },
    {
      title: 'TTL',
      dataIndex: 'ttl',
      key: 'ttl',
      width: 60,
      render: (val) => <Tag style={{ fontSize: 10 }}>{val}s</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'query_type',
      key: 'query_type',
      width: 60,
      render: (val) => <Tag color="blue" style={{ fontSize: 10 }}>{val}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (val) => <span style={{ fontSize: 11 }}>{typeof val === 'string' && val.includes('/') ? val : new Date(val).toLocaleString('zh-CN')}</span>,
    },
  ]

  const historyColumns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (text) => <code>{text}</code>,
    },
    {
      title: '解析结果',
      dataIndex: 'result_ip',
      key: 'result_ip',
      render: (text) => text ? <code style={{ color: '#52c41a' }}>{text}</code> : <Tag color="red">失败</Tag>,
    },
    {
      title: '缓存命中',
      dataIndex: 'cache_hit',
      key: 'cache_hit',
      render: (val) => val ? <Tag color="green">命中</Tag> : <Tag color="orange">未命中</Tag>,
    },
    {
      title: '查询时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => new Date(val).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      padding: 12,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {showHistory ? `📜 查询历史 (最多${MAX_HISTORY_SIZE}条)` : '📊 DNS 缓存表'}
        </span>
        <Space size="small">
          {showHistory ? (
            <Button size="small" onClick={() => setShowHistory(false)}>返回缓存</Button>
          ) : (
            <>
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setShowHistory(true)}>历史记录</Button>
              <Popconfirm title="确定清空所有缓存？" onConfirm={handleClearAll}>
                <Button size="small" danger icon={<ClearOutlined />}>清空</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>
      <Table
        columns={showHistory ? historyColumns : cacheColumns}
        dataSource={showHistory ? historyData : mergedCache}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={showHistory ? false : { pageSize: 5, size: 'small' }}
        locale={{ emptyText: '暂无数据' }}
        scroll={{ y: 200 }}
        sticky
      />
    </div>
  )
}

export default DnsCacheTable
