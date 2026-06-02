import { useEffect, useRef, useState } from 'react'
import { DEVICES, LINKS } from '../data/scenarioSteps'

/**
 * 综合场景网络拓扑图组件
 */
function ScenarioTopology({ currentStep, isAnimating, onAnimationComplete }) {
  const [packetPos, setPacketPos] = useState(null)
  const [packetLabel, setPacketLabel] = useState('')
  const animFrameRef = useRef(null)

  const width = 680
  const height = 400

  // 获取设备中心坐标
  const getDeviceCenter = (deviceId) => {
    const device = DEVICES[deviceId]
    if (!device) return { x: 0, y: 0 }
    return { x: device.x + 40, y: device.y + 35 }
  }

  // 报文动画
  useEffect(() => {
    if (!currentStep || !isAnimating) {
      setPacketPos(null)
      setPacketLabel('')
      return
    }

    // 内部操作（无路径）：直接跳过动画
    if (!currentStep.pathHighlight || currentStep.pathHighlight.length < 2) {
      setPacketPos(null)
      setPacketLabel('')
      // 使用 setTimeout 避免在 render 中直接回调
      const timer = setTimeout(() => onAnimationComplete?.(), 300)
      return () => clearTimeout(timer)
    }

    const path = currentStep.pathHighlight
    const totalDuration = 800
    const segmentDuration = totalDuration / (path.length - 1)
    let start = null

    setPacketLabel(currentStep.protocol || '')

    const animate = (timestamp) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const segmentIndex = Math.min(Math.floor(elapsed / segmentDuration), path.length - 2)
      const segmentProgress = Math.min((elapsed - segmentIndex * segmentDuration) / segmentDuration, 1)

      const from = getDeviceCenter(path[segmentIndex])
      const to = getDeviceCenter(path[segmentIndex + 1])

      const x = from.x + (to.x - from.x) * segmentProgress
      const y = from.y + (to.y - from.y) * segmentProgress

      setPacketPos({ x, y })

      if (elapsed < totalDuration) {
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
    if (!currentStep) return false

    // 广播步骤：高亮所有与交换机相连的链路（泛洪到所有端口）
    if (currentStep.broadcast) {
      if (fromId === 'switch' || toId === 'switch') return true
      return false
    }

    if (!currentStep.pathHighlight) return false
    const path = currentStep.pathHighlight
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === fromId && path[i + 1] === toId) ||
          (path[i] === toId && path[i + 1] === fromId)) {
        return true
      }
    }
    return false
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: '100%', minHeight: 380 }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowScenario" viewBox="0 0 10 6" refX="10" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill="#999" />
        </marker>
        <marker id="arrowScenarioHL" viewBox="0 0 10 6" refX="10" refY="3"
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
              y1={from.y + 35}
              x2={to.x + 40}
              y2={to.y + 35}
              stroke={highlighted ? '#1890ff' : '#d9d9d9'}
              strokeWidth={highlighted ? 3 : 1.5}
              strokeDasharray={highlighted ? 'none' : '6,4'}
              markerEnd={highlighted ? 'url(#arrowScenarioHL)' : 'url(#arrowScenario)'}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
            <text
              x={(from.x + to.x) / 2 + 40}
              y={(from.y + to.y) / 2 + 35 - 8}
              fill="#999"
              fontSize="9"
              textAnchor="middle"
            >
              {link.label}
            </text>
          </g>
        )
      })}

      {/* 设备 */}
      {Object.values(DEVICES).map((device) => (
        <g key={device.id}>
          <rect
            x={device.x}
            y={device.y}
            width={80}
            height={70}
            rx={8}
            fill="white"
            stroke={device.color}
            strokeWidth={2}
            filter="url(#glow)"
          />
          <text
            x={device.x + 40}
            y={device.y + 20}
            textAnchor="middle"
            fontSize="16"
          >
            {device.id === 'h1' || device.id === 'h2' ? '💻' :
             device.id === 'dns' ? '🖥️' :
             device.id === 'switch' ? '🔀' :
             device.id === 'router' ? '🌐' : '📡'}
          </text>
          <text
            x={device.x + 40}
            y={device.y + 36}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#333"
          >
            {device.name}
          </text>
          {device.ip && (
            <text
              x={device.x + 40}
              y={device.y + 49}
              textAnchor="middle"
              fontSize="8"
              fill="#666"
            >
              {device.ip}
            </text>
          )}
          {device.mac && (
            <text
              x={device.x + 40}
              y={device.y + 62}
              textAnchor="middle"
              fontSize="7"
              fill="#999"
            >
              {device.mac}
            </text>
          )}
        </g>
      ))}

      {/* 报文动画 */}
      {packetPos && (
        <g filter="url(#glow)">
          <rect
            x={packetPos.x - 35}
            y={packetPos.y - 12}
            width={70}
            height={24}
            rx={12}
            fill="#1890ff"
            opacity={0.95}
          />
          <text
            x={packetPos.x}
            y={packetPos.y + 4}
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="600"
          >
            {packetLabel}
          </text>
          <circle
            cx={packetPos.x}
            cy={packetPos.y}
            r={18}
            fill="#1890ff"
            opacity={0.2}
          />
        </g>
      )}
    </svg>
  )
}

export default ScenarioTopology
