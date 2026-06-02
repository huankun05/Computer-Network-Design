import { useState } from 'react'
import { Typography, Tabs, Card, Tag, Tooltip } from 'antd'
import {
  ThunderboltOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

// ========== 协议字段定义 ==========

const ETHERNET_FIELDS = [
  { name: '前导码', size: 8, color: '#e2e8f0', desc: '7字节同步码(10101010) + 1字节帧首定界符(10101011)', offset: 0 },
  { name: '目的MAC', size: 6, color: '#fef3c7', desc: '6字节目的MAC地址，全F(FF:FF:FF:FF:FF:FF)表示广播', offset: 8 },
  { name: '源MAC', size: 6, color: '#dbeafe', desc: '6字节源MAC地址，标识发送方网络接口', offset: 14 },
  { name: '类型/长度', size: 2, color: '#d1fae5', desc: '以太类型(EtherType)：0x0800=IPv4，0x0806=ARP，0x86DD=IPv6', offset: 20 },
  { name: '数据(有效载荷)', size: 46, color: '#fce7f3', desc: '46~1500字节上层协议数据(IP数据报)。不足46字节需填充', offset: 22 },
  { name: 'FCS(帧校验)', size: 4, color: '#e5e7eb', desc: '4字节CRC循环冗余校验，校验帧是否出错', offset: 68 },
]

const IP_FIELDS = [
  { name: '版本', size: 0.5, color: '#e2e8f0', desc: '4位，IPv4=4，IPv6=6', offset: 0 },
  { name: '首部长度', size: 0.5, color: '#fef3c7', desc: '4位，以4字节为单位，最小5(20字节)，最大15(60字节)', offset: 0.5 },
  { name: '区分服务', size: 1, color: '#dbeafe', desc: '1字节，QoS服务质量标记(DSCP+ECN)', offset: 1 },
  { name: '总长度', size: 2, color: '#d1fae5', desc: '2字节，IP数据报总长度(首部+数据)，最大65535字节', offset: 2 },
  { name: '标识', size: 2, color: '#ede9fe', desc: '2字节，分片标识字段，同一数据报的分片标识相同', offset: 4 },
  { name: '标志+片偏移', size: 2, color: '#fce7f3', desc: '3位标志(DF禁止分片/MF更多分片) + 13位片偏移(8字节单位)', offset: 6 },
  { name: 'TTL', size: 1, color: '#fee2e2', desc: '1字节生存时间，每跳-1，为0时丢弃。常用值：64/128/255', offset: 8 },
  { name: '协议', size: 1, color: '#ccfbf1', desc: '1字节上层协议：1=ICMP，6=TCP，17=UDP', offset: 9 },
  { name: '首部校验和', size: 2, color: '#e5e7eb', desc: '2字节，仅校验IP首部，每跳重新计算(TTL变化)', offset: 10 },
  { name: '源IP地址', size: 4, color: '#dbeafe', desc: '4字节源IP，如192.168.1.1', offset: 12 },
  { name: '目的IP地址', size: 4, color: '#fef3c7', desc: '4字节目的IP，如192.168.1.2', offset: 16 },
  { name: '选项(可选)', size: 0, color: '#f3f4f6', desc: '0~40字节可选字段(安全/源路由/时间戳等)，很少使用', offset: 20 },
]

const TCP_FIELDS = [
  { name: '源端口', size: 2, color: '#dbeafe', desc: '2字节源端口号(0~65535)。客户端通常使用临时端口(>1024)', offset: 0 },
  { name: '目的端口', size: 2, color: '#fef3c7', desc: '2字节目的端口号。如HTTP=80，HTTPS=443，SSH=22', offset: 2 },
  { name: '序号(SEQ)', size: 4, color: '#d1fae5', desc: '4字节。本报文段数据的第一个字节的序号。SYN=1时：初始序号ISN', offset: 4 },
  { name: '确认号(ACK)', size: 4, color: '#ede9fe', desc: '4字节。期望收到对方下一个报文段的序号。仅ACK=1时有效', offset: 8 },
  { name: '首部长度', size: 0.5, color: '#e2e8f0', desc: '4位数据偏移，以4字节为单位。最小5(20字节)，典型5~8', offset: 12 },
  { name: '保留', size: 0.5, color: '#f3f4f6', desc: '6位保留字段，当前置0', offset: 12.5 },
  { name: 'URG', size: 0, color: '#fee2e2', desc: '紧急指针有效。如Telnet/Ctrl+C中断', key: true },
  { name: 'ACK', size: 0, color: '#d1fae5', desc: '确认号字段有效。连接建立后所有报文ACK=1', key: true },
  { name: 'PSH', size: 0, color: '#ccfbf1', desc: '推送。接收方应尽快交付应用层，不等待缓冲区满', key: true },
  { name: 'RST', size: 0, color: '#ffedd5', desc: '复位连接。异常关闭/拒绝连接/端口不可达', key: true },
  { name: 'SYN', size: 0, color: '#dbeafe', desc: '同步序号。连接建立时使用(SYN=1,ACK=0→SYN=1,ACK=1)', key: true },
  { name: 'FIN', size: 0, color: '#fce7f3', desc: '终止连接。数据发送完毕，请求释放连接', key: true },
  { name: '窗口大小', size: 2, color: '#e0e7ff', desc: '2字节接收窗口(rwnd)，流量控制。告诉对方还能接收多少字节', offset: 14 },
  { name: '校验和', size: 2, color: '#e5e7eb', desc: '2字节，校验TCP首部+数据+伪首部', offset: 16 },
  { name: '紧急指针', size: 2, color: '#fee2e2', desc: '2字节，仅URG=1有效。指向紧急数据的末尾偏移', offset: 18 },
  { name: '选项(可选)', size: 0, color: '#f3f4f6', desc: '0~40字节。如MSS最大报文段长度、窗口缩放、SACK、时间戳', offset: 20 },
]

const UDP_FIELDS = [
  { name: '源端口', size: 2, color: '#dbeafe', desc: '2字节源端口号。可选，不需要回复时可填0', offset: 0 },
  { name: '目的端口', size: 2, color: '#fef3c7', desc: '2字节目的端口号。如DNS=53，DHCP=67/68', offset: 2 },
  { name: '长度', size: 2, color: '#d1fae5', desc: '2字节UDP数据报总长度(首部8字节+数据)。最小8', offset: 4 },
  { name: '校验和', size: 2, color: '#e5e7eb', desc: '2字节，校验UDP首部+数据+伪首部。可选，全0表示不校验', offset: 6 },
]

const HTTP_FIELDS = [
  { name: '请求行/状态行', size: 1, color: '#dbeafe', desc: '请求: GET /index.html HTTP/1.1\r\n  响应: HTTP/1.1 200 OK\r\n', offset: 0 },
  { name: '通用头', size: 1, color: '#fef3c7', desc: 'Cache-Control, Connection(keep-alive/close), Date, Transfer-Encoding', offset: 1 },
  { name: '请求头', size: 1, color: '#d1fae5', desc: 'Host, User-Agent, Accept, Accept-Encoding, Accept-Language, Cookie', offset: 2 },
  { name: '响应头', size: 1, color: '#ede9fe', desc: 'Server, Set-Cookie, Content-Type, Content-Length, Content-Encoding', offset: 3 },
  { name: '实体头', size: 1, color: '#fce7f3', desc: 'Content-Type, Content-Length, Content-Encoding, Last-Modified, ETag', offset: 4 },
  { name: '空行(\\r\\n)', size: 0.5, color: '#e5e7eb', desc: '\\r\\n 分隔首部和主体', offset: 5 },
  { name: '消息主体', size: 1, color: '#e0e7ff', desc: '可选。GET请求通常无主体；POST携带表单/JSON；响应携带HTML/JSON', offset: 5.5 },
]

// ========== 图例 ==========
const PROTOCOLS = [
  { key: 'ethernet', label: '以太网帧', fields: ETHERNET_FIELDS, totalBytes: 72, color: '#6366f1', headerBytes: 26 },
  { key: 'ip', label: 'IP 首部', fields: IP_FIELDS, totalBytes: 60, color: '#14b8a6', headerBytes: 20 },
  { key: 'tcp', label: 'TCP 首部', fields: TCP_FIELDS, totalBytes: 60, color: '#f59e0b', headerBytes: 20 },
  { key: 'udp', label: 'UDP 首部', fields: UDP_FIELDS, totalBytes: 8, color: '#8b5cf6', headerBytes: 8 },
  { key: 'http', label: 'HTTP 报文', fields: HTTP_FIELDS, totalBytes: 7, color: '#ec4899', headerBytes: 0 },
]

// ========== 字节条组件 ==========
function ByteBar({ fields, totalBytes, selectedField, onSelect, compact }) {
  const barHeight = compact ? 32 : 44
  const showFlags = fields.some(f => f.key)

  return (
    <div style={{ marginBottom: compact ? 12 : 20 }}>
      {/* 整条字节栏 */}
      <div style={{
        display: 'flex',
        height: barHeight,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        background: '#f9fafb',
      }}>
        {fields.map((f, i) => {
          if (f.key) return null // TCP flags rendered separately
          const w = (f.size / totalBytes) * 100
          if (w < 0.5) return null // too small

          const isSelected = selectedField === i
          return (
            <Tooltip key={i} title={f.desc} placement="top">
              <div
                onClick={() => onSelect(i)}
                style={{
                  width: `${w}%`,
                  background: isSelected ? f.color : f.color + 'cc',
                  borderRight: '1px solid rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  opacity: selectedField !== null && !isSelected ? 0.45 : 1,
                  transform: isSelected ? 'scaleY(1.15)' : 'scaleY(1)',
                  position: 'relative',
                  zIndex: isSelected ? 1 : 0,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#374151',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  padding: '0 2px',
                }}
              >
                {f.size >= 1 ? f.name : ''}
              </div>
            </Tooltip>
          )
        })}
      </div>

      {/* TCP Flags 单独一行 */}
      {showFlags && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {fields.filter(f => f.key).map((f, i) => {
            const flagIdx = fields.indexOf(f)
            const isSelected = selectedField === flagIdx
            return (
              <Tooltip key={i} title={f.desc}>
                <Tag
                  onClick={() => onSelect(flagIdx)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? f.color : f.color + '66',
                    border: isSelected ? `2px solid ${f.color}` : '1px solid transparent',
                    margin: 0,
                    fontWeight: isSelected ? 700 : 500,
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s',
                    padding: '2px 10px',
                    borderRadius: 12,
                  }}
                >
                  {f.name}
                </Tag>
              </Tooltip>
            )
          })}
        </div>
      )}

      {/* 字节偏移刻度 */}
      <div style={{
        display: 'flex',
        height: 16,
        marginTop: 4,
        paddingLeft: 0,
        fontSize: 9,
        color: '#9ca3af',
        position: 'relative',
      }}>
        {fields.filter(f => f.name !== '选项(可选)' && !f.key && f.size >= 0.5).map((f, i) => {
          const w = (f.size / totalBytes) * 100
          if (w < 2) return null
          return (
            <div key={i} style={{
              width: `${w}%`,
              textAlign: 'center',
              borderLeft: '1px solid #d1d5db',
            }}>
              {f.offset}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== 详情面板 ==========
function FieldDetail({ field, protoName }) {
  if (!field) return null
  return (
    <Card
      size="small"
      style={{
        background: '#f0f9ff',
        border: `1px solid ${field.color}`,
        borderRadius: 10,
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoCircleOutlined style={{ color: field.color }} />
          <Text strong>{field.name}</Text>
          <Tag color={field.key ? 'default' : 'blue'}>
            {field.key ? '标志位' : `${field.size} 字节`}
          </Tag>
          {field.offset !== undefined && (
            <Tag>偏移: {field.offset} B</Tag>
          )}
        </div>
      }
    >
      <Paragraph style={{ margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.8 }}>
        {field.desc}
      </Paragraph>
    </Card>
  )
}

// ========== 主页面 ==========
function PacketStructure() {
  const [activeTab, setActiveTab] = useState('ethernet')
  const [selectedField, setSelectedField] = useState(null)
  const [selectedProtoKey, setSelectedProtoKey] = useState('ethernet')

  const handleSelect = (protoKey, idx) => {
    setSelectedProtoKey(protoKey)
    setSelectedField(idx)
  }

  const proto = PROTOCOLS.find(p => p.key === activeTab)
  const selected = selectedProtoKey === activeTab && selectedField !== null
    ? proto?.fields[selectedField]
    : null

  const tabItems = PROTOCOLS.map(p => ({
    key: p.key,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 8, height: 8, borderRadius: 2,
          background: p.color, display: 'inline-block',
        }} />
        {p.label}
      </span>
    ),
    children: (
      <div>
        <Paragraph style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
          点击字段查看详细说明 · 颜色表示不同字段区域 · 底部为字节偏移量(十进制)
        </Paragraph>
        {proto && (
          <ByteBar
            fields={proto.fields}
            totalBytes={proto.totalBytes}
            selectedField={selectedProtoKey === p.key ? selectedField : null}
            onSelect={(idx) => handleSelect(p.key, idx)}
          />
        )}
        <FieldDetail field={selected} protoName={p.label} />
      </div>
    ),
  }))

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '24px 32px',
    }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ThunderboltOutlined style={{ fontSize: 24, color: '#6366f1' }} />
          <Title level={3} style={{ margin: 0 }}>数据包结构解析</Title>
        </div>
        <Paragraph style={{ color: '#6b7280', margin: 0 }}>
          交互式展示以太网帧、IP首部、TCP首部、UDP首部和HTTP报文的各字段布局与含义
        </Paragraph>
      </div>

      {/* 协议层级示意 */}
      <Card
        size="small"
        style={{ marginBottom: 20, background: 'linear-gradient(135deg, #f0f9ff, #fdf2f8)', borderRadius: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>封装层级：</Text>
          {PROTOCOLS.slice(0, 5).map((p, i) => (
            <span key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag
                style={{
                  cursor: 'pointer',
                  background: activeTab === p.key ? p.color : p.color + '44',
                  border: activeTab === p.key ? `2px solid ${p.color}` : '1px solid transparent',
                  fontWeight: activeTab === p.key ? 700 : 500,
                  margin: 0,
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                }}
                onClick={() => { setActiveTab(p.key); setSelectedField(null) }}
              >
                {p.label}
              </Tag>
              {i < 4 && <Text type="secondary" style={{ fontSize: 10 }}>→</Text>}
            </span>
          ))}
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
            底层在外，上层封装在数据字段中
          </Text>
        </div>
      </Card>

      {/* Tab 协议详情 */}
      <Card style={{ borderRadius: 10, overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSelectedField(null) }}
          items={tabItems}
          tabBarStyle={{ marginBottom: 8, paddingLeft: 4 }}
        />
      </Card>

      {/* 知识tips */}
      <Card size="small" style={{ marginTop: 16, borderRadius: 10, background: '#fefce8', border: '1px solid #fde68a' }}>
        <Paragraph style={{ margin: 0, fontSize: 12, color: '#78350f' }}>
          <Text strong>💡 小知识：</Text>
          网络数据在发送端逐层向下封装(加头)，在接收端逐层向上解封装(去头)。
          以太网帧最大传输单元(MTU)为1500字节，超过则需IP分片。
          TCP首部20~60字节，UDP首部固定8字节，因此UDP开销更小但不可靠。
        </Paragraph>
      </Card>
    </div>
  )
}

export default PacketStructure
