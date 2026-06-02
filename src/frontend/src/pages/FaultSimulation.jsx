import { useState, useRef, useEffect } from 'react'
import { Typography, Card, Button, Tag, Steps, Space, Divider, message } from 'antd'
import {
  BugOutlined,
  PlayCircleOutlined,
  StepForwardOutlined,
  ReloadOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  QuestionCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

// ========== 故障场景定义 ==========

const SCENARIOS = [
  {
    key: 'dns',
    title: 'DNS 解析故障',
    icon: <QuestionCircleOutlined />,
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fcd34d',
    description: '模拟DNS域名解析过程中的常见故障：超时无响应、域名不存在(NXDOMAIN)、服务器故障(SERVFAIL)',
    devices: ['H1 (客户端)', 'DNS本地服务器', '根DNS', '.com顶级域', '权威DNS(example.com)'],
    steps: [
      {
        title: 'H1 发起 DNS 查询',
        desc: '用户在浏览器输入 http://nocache.example.com，H1 检查本地缓存 → 未命中，向本地DNS(192.168.1.1)发送 A 记录查询',
        action: 'dns_query',
        fault: false,
      },
      {
        title: '本地DNS迭代查询根服务器',
        desc: '本地DNS向根DNS(198.41.0.4)发送查询 → 根返回 .com 顶级域DNS地址',
        action: 'root_query',
        fault: false,
      },
      {
        title: '本地DNS查询 .com 顶级域',
        desc: '本地DNS向 .com 顶级域DNS发送查询 → 返回 example.com 权威DNS地址(ns1.example.com)',
        action: 'tld_query',
        fault: false,
      },
      {
        title: '⚠️ 权威DNS无响应 — 超时',
        desc: '本地DNS向 ns1.example.com 发送查询 → 等待2秒无响应 → 重试 → 再等2秒 → 仍无响应。可能原因：权威DNS服务器宕机、网络不可达、防火墙拦截',
        action: 'timeout',
        fault: true,
        faultType: 'timeout',
      },
      {
        title: '本地DNS返回 SERVFAIL',
        desc: '上游查询失败，本地DNS向H1返回 SERVFAIL(Server Failure) 响应。浏览器显示"无法找到服务器IP地址"错误页面',
        action: 'servfail',
        fault: true,
        faultType: 'servfail',
      },
      {
        title: '故障诊断建议',
        desc: '① 检查权威DNS服务器状态(\'ns1.example.com\')  ② 使用 dig +trace 追踪解析链路  ③ 检查防火墙/安全组规则  ④ 尝试备用DNS(114.114.114.114)',
        action: 'diagnose',
        fault: true,
        faultType: 'diagnose',
      },
    ],
  },
  {
    key: 'arp',
    title: 'ARP 欺骗攻击',
    icon: <WarningOutlined />,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fca5a5',
    description: '模拟局域网ARP欺骗攻击：攻击者发送伪造ARP响应，将网关IP映射到攻击者MAC，实施中间人攻击',
    devices: ['H1 (受害者)', '网关(Gateway)', 'H2 (攻击者)', '交换机S1'],
    steps: [
      {
        title: '正常通信状态',
        desc: 'H1 ARP表：网关IP 192.168.1.1 → MAC AA:BB:CC:11:22:33 (正确)。H1通过网关正常访问互联网，ICMP延迟<1ms',
        action: 'normal',
        fault: false,
      },
      {
        title: 'H2 发送伪造ARP响应',
        desc: '攻击者H2(192.168.1.100)向H1发送伪造ARP响应：宣称"192.168.1.1 的MAC地址是 EE:FF:00:11:22:33(攻击者MAC)"。ARP协议无认证机制，H1无条件接受',
        action: 'arp_spoof',
        fault: true,
        faultType: 'spoof',
      },
      {
        title: 'ARP表被污染',
        desc: 'H1的ARP表更新：网关IP 192.168.1.1 → MAC EE:FF:00:11:22:33 (错误！指向攻击者)。此后H1发送给网关的数据包实际发送给H2',
        action: 'poisoned',
        fault: true,
        faultType: 'poisoned',
      },
      {
        title: '中间人攻击生效',
        desc: 'H1发送上网数据 → 交换机按MAC转发 → 到达H2(攻击者)。H2可查看/篡改数据后转发给真正的网关，实现中间人攻击。H1无感知，网络"正常"',
        action: 'mitm',
        fault: true,
        faultType: 'mitm',
      },
      {
        title: '检测与防御',
        desc: '检测方法：① 比对ARP表中IP-MAC映射一致性 ② 使用 arp -a 查看MAC是否有重复。防御：① 静态ARP绑定 ② DAI(动态ARP检测) ③ 交换机端口安全 ④ ARP防火墙',
        action: 'defend',
        fault: true,
        faultType: 'defend',
      },
    ],
  },
  {
    key: 'tcp',
    title: 'TCP 连接异常',
    icon: <StopOutlined />,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    description: '模拟TCP连接过程中的典型异常：SYN泛洪攻击、连接被RST重置、超时重传',
    devices: ['Client (客户端)', 'Server (服务器)', '防火墙/IDS'],
    steps: [
      {
        title: '正常SYN请求',
        desc: 'Client(10.0.0.1:45678) → Server(10.0.0.2:80) 发送 SYN, seq=1000, win=65535。进入 SYN-SENT 状态',
        action: 'syn_sent',
        fault: false,
      },
      {
        title: '⚠️ 服务器端口不可达 — RST',
        desc: 'Server端口80未监听(服务未启动)，收到SYN后返回 RST, ACK。可能原因：Web服务进程崩溃、配置错误监听其他端口、防火墙阻止',
        action: 'rst',
        fault: true,
        faultType: 'rst',
      },
      {
        title: 'Client 收到 RST',
        desc: 'Client收到RST → 立即释放连接 → 从 SYN-SENT 回到 CLOSED。应用程序收到"Connection Refused"错误',
        action: 'connection_refused',
        fault: true,
        faultType: 'refused',
      },
      {
        title: 'Client 重试连接',
        desc: 'TCP/IP协议栈通常自动重试(默认3次SYN重传，间隔1s→2s→4s)。若持续收到RST，应用程序显示"无法连接"',
        action: 'retry',
        fault: true,
        faultType: 'retry',
      },
      {
        title: '故障排查建议',
        desc: '① 检查服务是否运行 \'netstat -an | grep :80\'  ② 确认防火墙规则 \'iptables -L\'  ③ 查看服务日志  ④ 使用 \'telnet 10.0.0.2 80\' 测试连通性',
        action: 'troubleshoot',
        fault: true,
        faultType: 'troubleshoot',
      },
    ],
  },
]

// ========== SVG 拓扑组件 ==========
function DnsTopology({ step }) {
  const svgW = 600, svgH = 200
  const nodes = [
    { id: 'h1', x: 50, y: 100, label: 'H1\n客户端' },
    { id: 'local', x: 180, y: 100, label: '本地DNS\n192.168.1.1' },
    { id: 'root', x: 310, y: 40, label: '根DNS' },
    { id: 'tld', x: 400, y: 40, label: 'com顶级域' },
    { id: 'auth', x: 480, y: 100, label: '权威DNS\nns1.example.com' },
  ]
  const links = [
    { from: 'h1', to: 'local', step: 0 },
    { from: 'local', to: 'root', step: 1 },
    { from: 'local', to: 'tld', step: 2 },
    { from: 'local', to: 'auth', step: 3 },
  ]

  const getNodeColor = (id) => {
    if (id === 'auth' && step >= 3) return '#ef4444'
    if (step >= 4 && id === 'local') return '#f59e0b'
    return '#e5e7eb'
  }

  const getLinkActive = (s) => step >= s

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 600, background: '#fafafa', borderRadius: 10, border: '1px solid #e5e7eb' }}>
      {/* Links */}
      {links.map((l, i) => (
        <line key={i} x1={nodes.find(n => n.id === l.from).x + 20} y1={nodes.find(n => n.id === l.from).y}
          x2={nodes.find(n => n.id === l.to).x + 20} y2={nodes.find(n => n.id === l.to).y}
          stroke={getLinkActive(l.step) ? (step >= 3 && i === 3 ? '#ef4444' : '#3b82f6') : '#d1d5db'}
          strokeWidth={getLinkActive(l.step) ? 2 : 1}
          strokeDasharray={step === 3 && i === 3 ? '5,5' : 'none'}
        />
      ))}
      {/* Animated ping on active link */}
      {links.map((l, i) => {
        if (!getLinkActive(l.step)) return null
        const from = nodes.find(n => n.id === l.from)
        const to = nodes.find(n => n.id === l.to)
        return (
          <circle key={`ping-${i}`} r={5} fill={step >= 3 && i === 3 ? '#ef4444' : '#3b82f6'} opacity={0.7}>
            <animate attributeName="cx" from={from.x + 20} to={to.x + 20} dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="cy" from={from.y} to={to.y} dur="1.5s" repeatCount="indefinite" />
          </circle>
        )
      })}
      {/* Nodes */}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x} y={n.y - 20} width={74} height={40} rx={8}
            fill={getNodeColor(n.id)} stroke={n.id === 'auth' && step >= 3 ? '#ef4444' : '#9ca3af'} strokeWidth={1.5} />
          {n.label.split('\n').map((line, li) => (
            <text key={li} x={n.x + 37} y={n.y - 2 + li * 13} textAnchor="middle"
              fontSize={9} fill="#374151" fontWeight={500}>{line}</text>
          ))}
        </g>
      ))}
      {/* Fault indicator */}
      {step >= 3 && (
        <text x={510} y={125} fontSize={11} fill="#ef4444" fontWeight={700}>✕ 超时</text>
      )}
    </svg>
  )
}

function ArpTopology({ step }) {
  const svgW = 500, svgH = 260
  const nodes = [
    { id: 'h1', x: 100, y: 180, label: 'H1\n受害者', type: 'victim' },
    { id: 'gw', x: 250, y: 60, label: '网关\n192.168.1.1', type: 'gateway' },
    { id: 'h2', x: 400, y: 180, label: 'H2\n攻击者', type: 'attacker' },
  ]

  const getNodeBg = (id, type) => {
    if (step >= 1 && type === 'attacker') return '#fee2e2'
    if (step >= 2 && id === 'h1') return '#fef3c7'
    return '#e5e7eb'
  }

  const getNodeStroke = (id, type) => {
    if (step >= 1 && type === 'attacker') return '#ef4444'
    if (step >= 2 && id === 'h1') return '#f59e0b'
    return '#9ca3af'
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 500, background: '#fafafa', borderRadius: 10, border: '1px solid #e5e7eb' }}>
      {/* Arrow from H2 to H1 (spoof attack) */}
      {step >= 1 && (
        <>
          <line x1={410} y1={170} x2={130} y2={175} stroke="#ef4444" strokeWidth={2} markerEnd="url(#arrowRed)" strokeDasharray="6,3" />
          <defs>
            <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
          <text x={270} y={160} fontSize={9} fill="#ef4444" fontWeight={700} textAnchor="middle">
            伪造ARP: 网关MAC = H2的MAC
          </text>
          <circle r={5} fill="#ef4444" opacity={0.6}>
            <animate attributeName="cx" from={410} to={130} dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="170;165;175;170" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* Victim to "gateway" (actually to attacker) */}
      {step >= 2 && (
        <line x1={125} y1={180} x2={390} y2={180} stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4" />
      )}
      {/* Nodes */}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x - 30} y={n.y - 18} width={60} height={36} rx={8}
            fill={getNodeBg(n.id, n.type)} stroke={getNodeStroke(n.id, n.type)} strokeWidth={1.5} />
          {n.label.split('\n').map((line, li) => (
            <text key={li} x={n.x} y={n.y - 1 + li * 12} textAnchor="middle"
              fontSize={9} fill="#374151" fontWeight={500}>{line}</text>
          ))}
        </g>
      ))}
      {/* Labels */}
      {step >= 1 && (
        <text x={250} y={240} fontSize={10} fill="#ef4444" textAnchor="middle" fontWeight={600}>
          ⚠ ARP表污染：H1将网关流量错误发送给H2
        </text>
      )}
    </svg>
  )
}

function TcpTopology({ step }) {
  const svgW = 500, svgH = 180
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 500, background: '#fafafa', borderRadius: 10, border: '1px solid #e5e7eb' }}>
      {/* Client */}
      <rect x={60} y={50} width={70} height={36} rx={8} fill={step >= 1 ? '#fef3c7' : '#e5e7eb'} stroke="#9ca3af" strokeWidth={1.5} />
      <text x={95} y={63} textAnchor="middle" fontSize={9} fill="#374151">Client</text>
      <text x={95} y={76} textAnchor="middle" fontSize={9} fill="#6b7280">10.0.0.1:45678</text>
      {/* Server */}
      <rect x={370} y={50} width={70} height={36} rx={8} fill={step >= 1 ? '#fee2e2' : '#e5e7eb'} stroke={step >= 1 ? '#ef4444' : '#9ca3af'} strokeWidth={1.5} />
      <text x={405} y={63} textAnchor="middle" fontSize={9} fill="#374151">Server</text>
      <text x={405} y={76} textAnchor="middle" fontSize={9} fill="#6b7280">10.0.0.2:80</text>

      {/* SYN -> */}
      {step >= 0 && (
        <>
          <line x1={130} y1={65} x2={370} y2={65} stroke="#3b82f6" strokeWidth={2} />
          <text x={250} y={56} fontSize={10} fill="#3b82f6" textAnchor="middle" fontWeight={600}>SYN →</text>
        </>
      )}
      {/* RST <- */}
      {step >= 1 && (
        <>
          <line x1={370} y1={80} x2={130} y2={80} stroke="#ef4444" strokeWidth={2} />
          <text x={250} y={94} fontSize={10} fill="#ef4444" textAnchor="middle" fontWeight={600}>← RST,ACK</text>
          <circle r={5} fill="#ef4444" opacity={0.6}>
            <animate attributeName="cx" from={370} to={130} dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="cy" from={80} to={80} dur="1.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* Status text */}
      {step >= 1 && (
        <text x={250} y={120} fontSize={11} fill="#ef4444" textAnchor="middle" fontWeight={700}>
          {step >= 2 ? 'Connection Refused — 连接被拒绝' : '端口 80 未监听 → RST 重置'}
        </text>
      )}
      {/* Connection states */}
      <text x={95} y={150} fontSize={9} fill="#6b7280" textAnchor="middle">
        状态: {step === 0 ? 'SYN-SENT' : step >= 2 ? 'CLOSED' : 'SYN-SENT → CLOSED'}
      </text>
    </svg>
  )
}

// ========== 主页面 ==========
function FaultSimulation() {
  const [activeScenario, setActiveScenario] = useState('dns')
  const [currentStep, setCurrentStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  const scenario = SCENARIOS.find(s => s.key === activeScenario)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleScenarioChange = (key) => {
    setActiveScenario(key)
    setCurrentStep(-1)
    setPlaying(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handlePlay = () => {
    if (!scenario) return
    setPlaying(true)
    setCurrentStep(-1)
    if (timerRef.current) clearInterval(timerRef.current)

    let step = 0
    timerRef.current = setInterval(() => {
      if (step >= scenario.steps.length) {
        clearInterval(timerRef.current)
        setPlaying(false)
        return
      }
      setCurrentStep(step)
      step++
    }, 2000)
  }

  const handleNext = () => {
    if (!scenario) return
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      setPlaying(false)
    }
    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPlaying(false)
    setCurrentStep(-1)
  }

  const getFaultTag = (type) => {
    const map = {
      timeout: { icon: <ClockCircleOutlined />, text: '超时', color: 'orange' },
      servfail: { icon: <CloseCircleOutlined />, text: 'SERVFAIL', color: 'red' },
      diagnose: { icon: <CheckCircleOutlined />, text: '诊断', color: 'blue' },
      spoof: { icon: <WarningOutlined />, text: 'ARP欺骗', color: 'red' },
      poisoned: { icon: <BugOutlined />, text: 'ARP污染', color: 'orange' },
      mitm: { icon: <StopOutlined />, text: '中间人', color: 'red' },
      defend: { icon: <CheckCircleOutlined />, text: '防御', color: 'green' },
      rst: { icon: <CloseCircleOutlined />, text: 'RST重置', color: 'red' },
      refused: { icon: <StopOutlined />, text: '拒绝连接', color: 'orange' },
      retry: { icon: <SyncOutlined />, text: '重试', color: 'blue' },
      troubleshoot: { icon: <CheckCircleOutlined />, text: '排查', color: 'green' },
    }
    return map[type] || null
  }

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '24px 32px',
    }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <BugOutlined style={{ fontSize: 24, color: '#ef4444' }} />
          <Title level={3} style={{ margin: 0 }}>网络故障模拟</Title>
        </div>
        <Paragraph style={{ color: '#6b7280', margin: 0 }}>
          模拟常见网络故障场景，展示故障原因、现象和排查方法
        </Paragraph>
      </div>

      {/* 场景选择卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {SCENARIOS.map(s => (
          <Card
            key={s.key}
            hoverable
            size="small"
            onClick={() => handleScenarioChange(s.key)}
            style={{
              cursor: 'pointer',
              borderRadius: 10,
              border: activeScenario === s.key ? `2px solid ${s.color}` : '1px solid #e5e7eb',
              background: activeScenario === s.key ? s.bg : '#fff',
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6, color: s.color }}>{s.icon}</div>
            <Text strong style={{ fontSize: 14 }}>{s.title}</Text>
          </Card>
        ))}
      </div>

      {scenario && (
        <>
          {/* 场景描述 */}
          <Card style={{ borderRadius: 10, marginBottom: 16, background: scenario.bg, border: `1px solid ${scenario.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {scenario.icon}
              <Text strong style={{ fontSize: 15 }}>{scenario.title}</Text>
            </div>
            <Paragraph style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
              {scenario.description}
            </Paragraph>
          </Card>

          {/* 拓扑图 */}
          <Card size="small" title="网络拓扑" style={{ borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {activeScenario === 'dns' && <DnsTopology step={currentStep} />}
              {activeScenario === 'arp' && <ArpTopology step={currentStep} />}
              {activeScenario === 'tcp' && <TcpTopology step={currentStep} />}
            </div>
          </Card>

          {/* 控制按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handlePlay}
              disabled={playing} style={{ borderRadius: 6 }}>
              自动播放
            </Button>
            <Button icon={<StepForwardOutlined />} onClick={handleNext}
              disabled={playing || currentStep >= scenario.steps.length - 1}
              style={{ borderRadius: 6 }}>
              下一步
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}
              style={{ borderRadius: 6 }}>
              重置
            </Button>
            <Tag color="processing" style={{ margin: 0 }}>
              步骤 {currentStep + 1} / {scenario.steps.length}
            </Tag>
            {playing && <SyncOutlined spin style={{ color: '#3b82f6' }} />}
          </div>

          {/* 步骤列表 */}
          <Card
            title={<span><ThunderboltOutlined style={{ marginRight: 6, color: scenario.color }} />故障演进过程</span>}
            style={{ borderRadius: 10 }}
          >
            <Steps
              direction="vertical"
              current={currentStep}
              status={currentStep >= 0 && scenario.steps[currentStep]?.fault ? 'error' : 'process'}
              items={scenario.steps.map((s, i) => ({
                title: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>{s.title}</Text>
                    {s.fault && s.faultType && getFaultTag(s.faultType) && (
                      <Tag
                        color={getFaultTag(s.faultType).color}
                        style={{ margin: 0, fontSize: 10 }}
                        icon={getFaultTag(s.faultType).icon}
                      >
                        {getFaultTag(s.faultType).text}
                      </Tag>
                    )}
                  </div>
                ),
                description: (
                  <Paragraph style={{
                    fontSize: 12,
                    color: i <= currentStep ? '#4b5563' : '#9ca3af',
                    margin: '4px 0 0',
                    opacity: i <= currentStep ? 1 : 0.5,
                    transition: 'all 0.3s',
                  }}>
                    {s.desc}
                  </Paragraph>
                ),
                icon: s.fault
                  ? <CloseCircleOutlined style={{ color: '#ef4444' }} />
                  : <CheckCircleOutlined style={{ color: '#10b981' }} />,
              }))}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default FaultSimulation
