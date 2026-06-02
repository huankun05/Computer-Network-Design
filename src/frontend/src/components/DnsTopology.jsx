import { useEffect, useRef, useState } from 'react'
import { DEVICES, LINKS } from '../data/dnsSteps'

/**
 * DNS 网络拓扑图 SVG 组件
 * 展示客户端、DNS服务器、根DNS、TLD DNS、权威DNS 及连线
 * 支持报文动画、路径高亮、设备状态变化
 */
function DnsTopology({ currentStep, isAnimating, onAnimationComplete }) {
  const svgRef = useRef(null)
  const [packetPos, setPacketPos] = useState(null) // 报文位置
  const [packetLabel, setPacketLabel] = useState('')
  const animFrameRef = useRef(null)

  const width = 640
  const height = 380

  // 获取设备坐标
  const getDeviceCenter = (deviceId) => {
    const device = DEVICES[deviceId]
    if (!device) return { x: 0, y: 0 }
    return { x: device.x + 40, y: device.y + 25 }
  }

  // 报文动画
  useEffect(() => {
    // 没有pathHighlight的步骤，直接触发完成回调
    if (!currentStep || !currentStep.pathHighlight || currentStep.pathHighlight.length < 2) {
      setPacketPos(null)
      setPacketLabel('')
      // 对于没有动画的步骤，延迟后直接完成
      if (isAnimating && currentStep) {
        const timer = setTimeout(() => {
          onAnimationComplete?.()
        }, 300)
        return () => clearTimeout(timer)
      }
      return
    }

    if (!isAnimating) {
      setPacketPos(null)
      return
    }

    const [fromId, toId] = currentStep.pathHighlight
    const from = getDeviceCenter(fromId)
    const to = getDeviceCenter(toId)
    const label = currentStep.protocol || ''

    setPacketLabel(label)

    let start = null
    const duration = 1200 // ms - 减慢动画速度

    const animate = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      // ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      const x = from.x + (to.x - from.x) * eased
      const y = from.y + (to.y - from.y) * eased

      setPacketPos({ x, y })

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setPacketPos(null)
        setPacketLabel('')
        onAnimationComplete?.()
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [currentStep, isAnimating])

  // 判断路径是否高亮
  const isLinkHighlighted = (fromId, toId) => {
    if (!currentStep?.pathHighlight) return false
    const [hFrom, hTo] = currentStep.pathHighlight
    return (fromId === hFrom && toId === hTo) || (fromId === hTo && toId === hFrom)
  }

  // 获取设备状态
  const getDeviceState = (deviceId) => {
    if (!currentStep?.deviceStates?.[deviceId]) {
      return { status: '', color: '#d9d9d9' }
    }
    return currentStep.deviceStates[deviceId]
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%' }}
    >
      {/* 背景 */}
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
        <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill="#9ca3af" />
        </marker>
        <marker id="arrowHighlight" viewBox="0 0 10 6" refX="10" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill="#1890ff" />
        </marker>
      </defs>

      {/* 连线 */}
      {LINKS.map((link) => {
        const from = DEVICES[link.from]
        const to = DEVICES[link.to]
        const highlighted = isLinkHighlighted(link.from, link.to)
        return (
          <g key={`${link.from}-${link.to}`}>
            <line
              x1={from.x + 40}
              y1={from.y + 25}
              x2={to.x + 40}
              y2={to.y + 25}
              stroke={highlighted ? '#1890ff' : '#d1d5db'}
              strokeWidth={highlighted ? 3 : 1.5}
              strokeDasharray={highlighted ? 'none' : '6,4'}
              markerEnd={highlighted ? 'url(#arrowHighlight)' : 'url(#arrow)'}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
            {/* 连线标签 */}
            <text
              x={(from.x + to.x) / 2 + 40 + 10}
              y={(from.y + to.y) / 2 + 25 - 8}
              fill="#9ca3af"
              fontSize="10"
              textAnchor="middle"
            >
              {link.label}
            </text>
          </g>
        )
      })}

      {/* 设备 */}
      {Object.values(DEVICES).map((device) => {
        const state = getDeviceState(device.id)
        return (
          <g key={device.id}>
            {/* 设备背景 */}
            <rect
              x={device.x}
              y={device.y}
              width={80}
              height={50}
              rx={8}
              fill="#fff"
              stroke={state.color || device.color}
              strokeWidth={state.color !== '#d9d9d9' ? 2.5 : 1.5}
              filter="url(#shadow)"
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
            {/* 设备图标 */}
            <text
              x={device.x + 40}
              y={device.y + 22}
              textAnchor="middle"
              fontSize="20"
            >
              {device.id === 'client' ? '💻' :
               device.id === 'dnsServer' ? '🖥️' :
               device.id === 'rootDns' ? '🌐' :
               device.id === 'tldDns' ? '📂' : '🗄️'}
            </text>
            {/* 设备名称 */}
            <text
              x={device.x + 40}
              y={device.y + 40}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#1f2937"
            >
              {device.name.split(' ')[0]}
            </text>
            {/* IP 地址 */}
            <text
              x={device.x + 40}
              y={device.y + 65}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {device.ip}
            </text>
            {/* 状态标签 */}
            {state.status && (
              <g>
                <rect
                  x={device.x - 5}
                  y={device.y - 25}
                  width={90}
                  height={18}
                  rx={9}
                  fill={state.color}
                  opacity={0.9}
                  filter="url(#glow)"
                />
                <text
                  x={device.x + 40}
                  y={device.y - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="white"
                  fontWeight="600"
                >
                  {state.status}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* 报文动画 */}
      {packetPos && (
        <g>
          {/* 报文背景 */}
          <rect
            x={packetPos.x - 35}
            y={packetPos.y - 14}
            width={70}
            height={28}
            rx={14}
            fill="#1890ff"
            opacity={0.95}
            filter="url(#shadow)"
          />
          {/* 报文标签 */}
          <text
            x={packetPos.x}
            y={packetPos.y + 4}
            textAnchor="middle"
            fontSize="10"
            fill="#fff"
            fontWeight="600"
          >
            {packetLabel}
          </text>
          {/* 报文尾迹 */}
          <circle
            cx={packetPos.x}
            cy={packetPos.y}
            r={20}
            fill="#1890ff"
            opacity={0.2}
          />
        </g>
      )}
    </svg>
  )
}

export default DnsTopology
