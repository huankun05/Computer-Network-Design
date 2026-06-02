import { useState, useEffect, useRef, useCallback } from 'react'
import { Typography, Button, Spin, Tag, Drawer, message, Input, Space, Tooltip as AntTooltip } from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  CameraOutlined,
  CloseOutlined,
  AimOutlined,
} from '@ant-design/icons'
import * as echarts from 'echarts'

const { Title, Paragraph } = Typography

// ── 配色体系 ──
const PALETTE = {
  root: { main: '#3b82f6', light: '#93c5fd', glow: 'rgba(59,130,246,0.35)' },
  '应用层':   { main: '#3b82f6', light: '#dbeafe', bg: 'rgba(219,234,254,0.6)' },
  '传输层':   { main: '#10b981', light: '#d1fae5', bg: 'rgba(209,250,229,0.6)' },
  '网络层':   { main: '#8b5cf6', light: '#ede9fe', bg: 'rgba(237,233,254,0.6)' },
  '数据链路层': { main: '#f59e0b', light: '#fef3c7', bg: 'rgba(254,243,199,0.6)' },
  '物理层':   { main: '#ef4444', light: '#fee2e2', bg: 'rgba(254,226,226,0.6)' },
}

const LAYER_ORDER = ['应用层', '传输层', '网络层', '数据链路层', '物理层']

const CAT_META = {
  '协议': { icon: '◈', shape: 'roundRect', size: 40 },
  '设备': { icon: '◆', shape: 'diamond', size: 38 },
  '技术': { icon: '▲', shape: 'triangle', size: 36 },
  '概念': { icon: '●', shape: 'circle', size: 32 },
}

const CROSS_LAYER_RELATIONS = {
  'HTTP': ['TCP'], 'HTTPS': ['TCP'], 'FTP': ['TCP'], 'SMTP': ['TCP'],
  'POP3': ['TCP'], 'IMAP': ['TCP'],
  'DNS': ['UDP'],
  'ARP': ['以太网'], 'RARP': ['以太网'],
}

// ── 构建图谱数据（含二级分类节点）──
function buildGraphData(items) {
  const nodes = []
  const links = []

  // 根节点
  nodes.push({
    id: 'root', name: '计算机网络', category: 0, symbolSize: 72,
    itemStyle: {
      color: new echarts.graphic.RadialGradient(0.4, 0.3, 0.7, [
        { offset: 0, color: '#60a5fa' }, { offset: 1, color: '#1d4ed8' },
      ]),
      shadowBlur: 30,
      shadowColor: PALETTE.root.glow,
      borderColor: '#fff',
      borderWidth: 3,
    },
  })

  // 五层节点 + 每层下的分类节点 + 知识点节点
  LAYER_ORDER.forEach((layer) => {
    const layerId = `layer_${layer}`
    const pc = PALETTE[layer]

    nodes.push({
      id: layerId, name: layer, category: 0, symbolSize: 52, symbol: 'roundRect',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: pc.main }, { offset: 1, color: adjustColor(pc.main, -25) },
        ]),
        shadowBlur: 14,
        shadowColor: pc.main + '55',
        borderColor: '#fff',
        borderWidth: 2,
        borderRadius: 10,
      },
    })
    links.push({ source: 'root', target: layerId, lineStyle: { width: 3, opacity: 0.7 } })

    // 二级分类节点：协议、设备、技术、概念
    const cats = ['协议', '设备', '技术', '概念']
    const layerItems = items.filter((it) => it.layer === layer)
    const catGroups = {}
    cats.forEach((c) => { catGroups[c] = layerItems.filter((it) => it.category === c) })

    cats.forEach((cat) => {
      if (catGroups[cat].length === 0) return
      const catId = `cat_${layer}_${cat}`
      const meta = CAT_META[cat]
      nodes.push({
        id: catId, name: `${meta.icon} ${cat}`, category: 0, symbolSize: meta.size,
        symbol: meta.shape,
        itemStyle: {
          color: pc.light,
          borderColor: pc.main,
          borderWidth: 1.5,
          shadowBlur: 6,
          shadowColor: pc.main + '30',
        },
        label: { show: true, fontSize: 11, fontWeight: 'bold', color: pc.main,
          position: 'right', distance: 6 },
      })
      links.push({
        source: layerId, target: catId,
        lineStyle: { width: 1.5, color: pc.main + '88', type: 'dashed' },
      })

      // 知识点节点
      catGroups[cat].forEach((item) => {
        const nodeId = `kp_${item.id}`
        const size = 24 + Math.min(item.description?.length || 0, 80) * 0.08
        nodes.push({
          id: nodeId, name: item.title, category: 0, symbolSize: size,
          symbol: 'circle',
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.3, 0.3, 0.8, [
              { offset: 0, color: '#fff' }, { offset: 1, color: pc.light },
            ]),
            borderColor: pc.main,
            borderWidth: 1.2,
            shadowBlur: 4,
            shadowColor: pc.main + '25',
          },
          layer: item.layer,
          category2: item.category,
          description: item.description,
        })
        links.push({
          source: catId, target: nodeId,
          lineStyle: { width: 1, color: pc.main + '55', curveness: 0.15 },
        })
      })
    })
  })

  // 跨层协议关系
  items.forEach((item) => {
    if (CROSS_LAYER_RELATIONS[item.title]) {
      CROSS_LAYER_RELATIONS[item.title].forEach((depName) => {
        const depNode = nodes.find((n) => n.name === depName)
        if (depNode) {
          links.push({
            source: `kp_${item.id}`, target: depNode.id,
            lineStyle: { width: 1.8, color: '#94a3b8', curveness: 0.4, type: 'dotted',
              opacity: 0.6 },
          })
        }
      })
    }
  })

  return { nodes, links }
}

// 颜色变暗
function adjustColor(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ── 组件 ──
function KnowledgeGraph() {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [allNodes, setAllNodes] = useState([])

  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/knowledge/summary')
      const json = await res.json()
      const data = buildGraphData(json.data || [])
      setGraphData(data)
      setAllNodes(data.nodes.filter((n) => n.layer))
    } catch (err) {
      message.error('加载图谱数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGraphData() }, [fetchGraphData])

  // 初始化 / 更新图表
  useEffect(() => {
    if (!chartRef.current || !graphData) return
    if (chartInstance.current) { chartInstance.current.dispose(); chartInstance.current = null }

    const chart = echarts.init(chartRef.current, null, { devicePixelRatio: 2 })
    chartInstance.current = chart

    const option = {
      backgroundColor: 'transparent',
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(30,41,59,0.92)',
        borderColor: 'rgba(148,163,184,0.3)',
        textStyle: { color: '#f1f5f9', fontSize: 13 },
        padding: [12, 16],
        extraCssText: 'border-radius:10px;backdrop-filter:blur(8px)',
        formatter: (params) => {
          if (params.dataType !== 'node') return ''
          const d = params.data
          if (d.layer) {
            const pc = PALETTE[d.layer] || PALETTE.root
            return `
              <div style="min-width:160px">
                <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#f8fafc">${d.name}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                  <span style="background:${pc.main};color:#fff;padding:1px 10px;border-radius:10px;font-size:11px">${d.layer}</span>
                  <span style="background:${pc.light};color:${pc.main};padding:1px 10px;border-radius:10px;font-size:11px">${d.category2}</span>
                </div>
                ${d.description ? `<div style="color:#cbd5e1;font-size:12px;line-height:1.5;margin-top:6px;max-width:220px">${d.description.slice(0, 100)}${d.description.length > 100 ? '...' : ''}</div>` : ''}
              </div>`
          }
          return `<span style="font-weight:700;font-size:14px">${d.name}</span>`
        },
      },
      series: [{
        type: 'graph', layout: 'force',
        data: graphData.nodes.map((node) => ({
          ...node,
          label: node.layer
            ? { show: true, fontSize: 10, color: '#475569', position: 'bottom', distance: 4,
                formatter: (p) => p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name }
            : { show: true, fontSize: node.symbolSize > 50 ? 13 : 12, color: '#1e293b',
                fontWeight: node.symbolSize > 50 ? 'bold' : 'normal' },
        })),
        links: graphData.links,
        categories: [
          { name: '计算机网络',
            itemStyle: { color: PALETTE.root.main },
            label: { color: '#1e293b' } },
        ],
        roam: true, draggable: true,
        force: {
          repulsion: 500,
          edgeLength: [60, 160],
          gravity: 0.08,
          friction: 0.6,
          layoutAnimation: true,
        },
        emphasis: {
          focus: 'adjacency',
          scale: 1.3,
          lineStyle: { width: 3.5 },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.2)', borderColor: '#fff', borderWidth: 2 },
          label: { fontSize: 13, fontWeight: 'bold' },
        },
        blur: {
          itemStyle: { opacity: 0.25 },
          label: { opacity: 0.25 },
        },
        lineStyle: { color: '#cbd5e1', curveness: 0.2, width: 1.5, opacity: 0.6 },
        edgeSymbol: ['none', 'none'],
        scaleLimit: { min: 0.4, max: 3 },
      }],
    }

    chart.setOption(option)

    chart.on('click', (params) => {
      if (params.dataType === 'node' && params.data.layer) {
        setSelectedNode(params.data)
        setDrawerVisible(true)
      }
    })

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
      chartInstance.current = null
    }
  }, [graphData])

  // 搜索定位
  const handleSearch = (value) => {
    setSearchText(value)
    if (!chartInstance.current) return
    chartInstance.current.dispatchAction({ type: 'downplay', seriesIndex: 0 })
    if (!value.trim()) return
    const keyword = value.toLowerCase()
    const found = allNodes.filter((n) =>
      n.name?.toLowerCase().includes(keyword) ||
      n.category2?.toLowerCase().includes(keyword) ||
      n.layer?.toLowerCase().includes(keyword)
    )
    if (found.length > 0) {
      found.forEach((n) => {
        chartInstance.current.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: graphData.nodes.indexOf(n) })
      })
      message.success(`找到 ${found.length} 个匹配节点`)
    } else {
      message.info('未找到匹配节点')
    }
  }

  // 截图导出
  const handleExport = () => {
    if (!chartInstance.current) return
    const url = chartInstance.current.getDataURL({
      type: 'png', pixelRatio: 2, backgroundColor: '#f8fafc',
    })
    const link = document.createElement('a')
    link.download = '计算机网络知识图谱.png'
    link.href = url
    link.click()
    message.success('图谱已导出')
  }

  // 聚焦某层
  const focusLayer = (layer) => {
    if (!chartInstance.current) return
    chartInstance.current.dispatchAction({ type: 'downplay', seriesIndex: 0 })
    const layerNode = graphData.nodes.find((n) => n.id === `layer_${layer}`)
    if (layerNode) {
      chartInstance.current.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: graphData.nodes.indexOf(layerNode) })
    }
    const targets = graphData.nodes.filter((n) => n.layer === layer)
    targets.forEach((n) => {
      chartInstance.current.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: graphData.nodes.indexOf(n) })
    })
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            <span style={{ fontSize: 22, marginRight: 6 }}>🕸</span>
            计算机网络知识图谱
          </Title>
          <span style={styles.badge}>
            {allNodes.length} 个知识点 · {LAYER_ORDER.length} 层
          </span>
        </div>
        <Space>
          <Input
            size="small"
            placeholder="搜索节点…"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            suffix={searchText ? <CloseOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} onClick={() => handleSearch('')} /> : null}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => handleSearch(searchText)}
            style={{ width: 180 }}
            allowClear
          />
          <AntTooltip title="导出 PNG">
            <Button size="small" icon={<CameraOutlined />} onClick={handleExport} />
          </AntTooltip>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchGraphData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* Layer quick filter */}
      <div style={styles.layerTabs}>
        {LAYER_ORDER.map((layer) => {
          const pc = PALETTE[layer]
          return (
            <button
              key={layer}
              onClick={() => focusLayer(layer)}
              style={{
                ...styles.layerTabBtn,
                borderColor: pc.main,
                color: pc.main,
                background: pc.bg,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = pc.main
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = pc.bg
                e.currentTarget.style.color = pc.main
              }}
            >
              <AimOutlined style={{ fontSize: 10, marginRight: 4 }} />
              {layer}
            </button>
          )
        })}
      </div>

      {/* Graph canvas */}
      <div style={styles.canvas}>
        {/* subtle dot grid bg via CSS */}
        <div style={styles.bgDots} />
        <div ref={chartRef} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />
        {loading && (
          <div style={styles.loadingOverlay}>
            <Spin size="large" tip="加载图谱…" />
          </div>
        )}
      </div>

      {/* Custom legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>图例</div>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendDot, background: PALETTE.root.main }} />
          <span style={styles.legendLabel}>计算机网络根节点</span>
        </div>
        {LAYER_ORDER.map((layer) => {
          const pc = PALETTE[layer]
          return (
            <div key={layer} style={styles.legendRow}>
              <span style={{ ...styles.legendDot, background: pc.main }} />
              <span style={styles.legendLabel}>{layer}</span>
            </div>
          )
        })}
        <div style={styles.legendDivider} />
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendShape, color: PALETTE['应用层'].main, fontWeight: 'bold' }}>◈</span>
          <span style={styles.legendLabel}>协议</span>
        </div>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendShape, color: PALETTE['应用层'].main, fontWeight: 'bold' }}>◆</span>
          <span style={styles.legendLabel}>设备</span>
        </div>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendShape, color: PALETTE['应用层'].main, fontWeight: 'bold' }}>▲</span>
          <span style={styles.legendLabel}>技术</span>
        </div>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendShape, color: PALETTE['应用层'].main }}>●</span>
          <span style={styles.legendLabel}>概念 / 知识点</span>
        </div>
        <div style={styles.legendDivider} />
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendLine, borderColor: '#cbd5e1' }} />
          <span style={styles.legendLabel}>层级归属</span>
        </div>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendLine, borderColor: '#94a3b8', borderStyle: 'dotted' }} />
          <span style={styles.legendLabel}>跨层协议依赖</span>
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>
              {selectedNode ? (CAT_META[selectedNode.category2]?.icon || '●') : '📋'}
            </span>
            <span>{selectedNode?.name || '知识点详情'}</span>
          </div>
        }
        placement="right"
        width={420}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        styles={{ body: { padding: '16px 20px' } }}
      >
        {selectedNode && (() => {
          const pc = PALETTE[selectedNode.layer] || PALETTE.root
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 层级 & 分类 Tag */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color={pc.main} style={{ fontSize: 13, padding: '2px 12px', borderRadius: 12 }}>
                  {selectedNode.layer}
                </Tag>
                <Tag color="default" style={{ fontSize: 13, padding: '2px 12px', borderRadius: 12 }}>
                  {selectedNode.category2}
                </Tag>
              </div>

              {/* 描述 */}
              <div style={{
                background: pc.bg, borderRadius: 10, padding: '14px 16px',
                borderLeft: `4px solid ${pc.main}`,
              }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                  📖 描述
                </div>
                <Paragraph style={{
                  margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedNode.description || '暂无详细描述'}
                </Paragraph>
              </div>

              {/* 关系图 */}
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
                  🔗 跨层关系
                </div>
                {CROSS_LAYER_RELATIONS[selectedNode.name] ? (
                  <Space wrap>
                    {CROSS_LAYER_RELATIONS[selectedNode.name].map((dep) => {
                      const depLayer = allNodes.find((n) => n.name === dep)
                      const dpc = depLayer ? PALETTE[depLayer.layer] : { main: '#94a3b8', light: '#f1f5f9' }
                      return (
                        <Tag key={dep} color={dpc.main} style={{ borderRadius: 8 }}>
                          {dep}
                        </Tag>
                      )
                    })}
                    <Tag color="default" style={{ borderRadius: 8 }}>依赖</Tag>
                  </Space>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>暂无跨层依赖关系</span>
                )}
              </div>
            </div>
          )
        })()}
      </Drawer>
    </div>
  )
}

// ── 内联样式体系 ──
const styles = {
  page: {
    height: '100%', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #f0f4ff 100%)',
    overflow: 'hidden', position: 'relative',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', flexShrink: 0,
    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0', zIndex: 10,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  badge: {
    fontSize: 12, color: '#64748b',
    background: '#f1f5f9', padding: '2px 10px', borderRadius: 10,
    fontWeight: 500,
  },
  layerTabs: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
    padding: '8px 20px', flexShrink: 0,
  },
  layerTabBtn: {
    padding: '4px 12px', borderRadius: 16, border: '1.5px solid',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', background: 'transparent',
  },
  canvas: {
    flex: 1, minHeight: 0, margin: '0 12px 12px',
    background: 'rgba(255,255,255,0.55)', borderRadius: 16,
    border: '1px solid rgba(226,232,240,0.8)',
    backdropFilter: 'blur(8px)',
    overflow: 'hidden', position: 'relative',
    boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  },
  bgDots: {
    position: 'absolute', inset: 0, zIndex: 0,
    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
    backgroundSize: '24px 24px', opacity: 0.4,
    pointerEvents: 'none',
  },
  loadingOverlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
  },
  legend: {
    position: 'absolute', bottom: 20, left: 20, zIndex: 10,
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
    borderRadius: 12, border: '1px solid rgba(226,232,240,0.9)',
    padding: '12px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    minWidth: 160,
  },
  legendTitle: {
    fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  legendRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 3,
    flexShrink: 0,
  },
  legendShape: {
    width: 14, textAlign: 'center', flexShrink: 0, fontSize: 12,
  },
  legendLine: {
    width: 18, borderTop: '2px solid', flexShrink: 0,
  },
  legendLabel: {
    fontSize: 11, color: '#64748b', whiteSpace: 'nowrap',
  },
  legendDivider: {
    height: 1, background: '#e2e8f0', margin: '8px 0',
  },
}

export default KnowledgeGraph
