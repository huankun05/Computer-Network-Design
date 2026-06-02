import { useEffect, useRef, useState } from 'react'
import { DEVICES, TCP_STATES, HANDSHAKE_STEPS, FINSH_STEPS } from '../data/tcpSteps'

/**
 * TCP 序列图组件
 * 状态以教材式纵向色块条显示，数据传送和2MSL作为正式步骤。
 */
function TcpTopology({ currentStep, isAnimating, onAnimationComplete, mode, completedSteps, setCompletedSteps, currentStepIndex }) {
  const [packetPos, setPacketPos] = useState(null)
  const [packetLabel, setPacketLabel] = useState('')
  const animFrameRef = useRef(null)

  const width = 600
  const height = 570

  const clientX = 120
  const serverX = 480
  const startY = 90
  const stepHeight = 60
  const midX = (clientX + serverX) / 2
  const stateBlockW = 66
  // 箭头起止 X：从色块边缘外侧 4px 出发/到达
  const arrowFromX = (side) => side === 'client' ? clientX + stateBlockW / 2 + 4 : serverX - stateBlockW / 2 - 4
  const arrowToX = (side) => side === 'client' ? clientX + stateBlockW / 2 + 4 : serverX - stateBlockW / 2 - 4

  const steps = mode === 'handshake' ? HANDSHAKE_STEPS : FINSH_STEPS

  const getStepY = (step) => {
    const idx = steps.findIndex((s) => s.id === step.id)
    return idx >= 0 ? startY + idx * stepHeight + 25 : startY + 25
  }

  /**
   * 预计算状态块转换点列表 [{y, state}]（每 mode 计算一次，供箭头坐标查询）。
   */
  const blockTransitions = (() => {
    const initClientState = mode === 'handshake' ? 'CLOSED' : 'ESTABLISHED'
    const initServerState = 'CLOSED' // 服务器初始均为 CLOSED（被动打开后才 LISTEN）

    const clientTransitions = [{ y: startY + 5, state: initClientState }]
    const serverTransitions = [{ y: startY + 5, state: initServerState }]

    steps.forEach((step, idx) => {
      const stepY = startY + idx * stepHeight + 25
      if (step.clientState && step.clientState !== clientTransitions[clientTransitions.length - 1].state) {
        clientTransitions.push({ y: stepY, state: step.clientState })
      }
      if (step.serverState && step.serverState !== serverTransitions[serverTransitions.length - 1].state) {
        serverTransitions.push({ y: stepY, state: step.serverState })
      }
    })

    // FINSH 模式下客户端 TIME_WAIT → CLOSED
    if (mode === 'finsh') {
      const lastClient = clientTransitions[clientTransitions.length - 1]
      if (lastClient.state === 'TIME_WAIT') {
        const closeY = startY + (steps.length - 1) * stepHeight + 25 + 25
        clientTransitions.push({ y: closeY, state: 'CLOSED' })
      }
    }

    const endY = startY + steps.length * stepHeight + 25
    clientTransitions.push({ y: endY, state: clientTransitions[clientTransitions.length - 1].state })
    serverTransitions.push({ y: endY, state: serverTransitions[serverTransitions.length - 1].state })

    return { clientTransitions, serverTransitions }
  })()

  /**
   * 获取箭头端点坐标（与状态色块底部对齐）
   * - fromY：发送方离开旧状态块的 Y（块底）
   * - toY：接收方当前状态块的下一个转换点（块底）
   * - 同一步骤两侧同时转换时，toY 加 35px 视觉偏移
   */
  const getArrowEndpoints = (step) => {
    const stepIdx = steps.findIndex((s) => s.id === step.id)
    const { clientTransitions, serverTransitions } = blockTransitions

    const senderSide = step.from
    const receiverSide = step.to
    const stepY = startY + stepIdx * stepHeight + 25

    // 发送方：≤ stepY 的最后一个转换点（离开旧状态块的底部）
    const senderTrans = senderSide === 'client' ? clientTransitions : serverTransitions
    let fromY = startY + 5
    for (const t of senderTrans) {
      if (t.y <= stepY) fromY = t.y
      else break
    }

    // 接收方：收集 ≥ stepY 的所有转换点
    const receiverTrans = receiverSide === 'client' ? clientTransitions : serverTransitions
    const candidates = receiverTrans.filter((t) => t.y >= stepY)

    // step 0 时接收方第一个转换是"被动打开/主动打开"（CLOSED→LISTEN / CLOSED→SYN_SENT），
    // 不是消息引起的，应跳过它取第二个。其他情况取第一个。
    let toY = startY + steps.length * stepHeight + 25
    if (stepIdx === 0 && candidates.length >= 2) {
      toY = candidates[1].y
    } else if (candidates.length >= 1) {
      toY = candidates[0].y
    }

    // 同 Y 同时转换时加视觉偏移（避免水平箭头）
    if (Math.abs(toY - fromY) < 15) {
      toY = fromY + 35
    }

    return { fromY, toY }
  }

  // 报文动画（仅 protocol）
  useEffect(() => {
    if (!currentStep || !isAnimating || currentStep.type !== 'protocol') {
      setPacketPos(null)
      setPacketLabel('')
      if (currentStep && currentStep.type !== 'protocol' && isAnimating) {
        setCompletedSteps((prev) => [...new Set([...prev, currentStep.id])])
        onAnimationComplete?.()
      }
      return
    }
    const fromX = arrowFromX(currentStep.from)
    const toX = arrowToX(currentStep.to)
    const { fromY, toY } = getArrowEndpoints(currentStep)
    setPacketLabel(currentStep.flags)

    let start = null
    const duration = 1000
    const animate = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      setPacketPos({ x: fromX + (toX - fromX) * eased, y: fromY + (toY - fromY) * eased })
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setPacketPos(null)
        setPacketLabel('')
        setCompletedSteps((prev) => [...new Set([...prev, currentStep.id])])
        onAnimationComplete?.()
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [currentStep, isAnimating])

  const getStateColor = (s) => TCP_STATES[s]?.color || '#d9d9d9'
  const getStateName = (s) => TCP_STATES[s]?.name || s

  // 协议报文箭头（教材式斜箭头，端点对齐状态色块底部）
  const renderArrow = (step, isCurrent = false) => {
    if (!step || step.type !== 'protocol') return null
    const fromX = arrowFromX(step.from)
    const toX = arrowToX(step.to)
    const { fromY, toY } = getArrowEndpoints(step)
    const color = step.from === 'client' ? '#1890ff' : '#52c41a'
    const markerId = step.from === 'client' ? 'arrowBlue' : 'arrowGreen'
    const opacity = isCurrent ? 1 : 0.4
    const mx = (fromX + toX) / 2
    const my = (fromY + toY) / 2
    const ly = my - 14

    // 生成教材式箭头文字，如 "SYN=1, seq=x"
    const { flags, seq, ack } = step.packetInfo
    const parts = []
    if (flags.includes('SYN')) parts.push('SYN=1')
    if (flags.includes('ACK')) parts.push('ACK=1')
    if (flags.includes('FIN')) parts.push('FIN=1')
    parts.push(`seq=${seq}`)
    if (ack !== '-') parts.push(`ack=${ack}`)
    const arrowLabel = parts.join(', ')

    return (
      <g key={`arrow-${step.id}`} opacity={opacity}>
        <line x1={fromX} y1={fromY} x2={toX} y2={toY}
          stroke={color} strokeWidth={isCurrent ? 2.5 : 1.5}
          markerEnd={`url(#${markerId})`} />
        {/* 步骤编号 */}
        <circle cx={mx} cy={ly - 14} r={isCurrent ? 9 : 7} fill={color} opacity={0.9} />
        <text x={mx} y={ly - 11} textAnchor="middle"
          fill="white" fontSize={isCurrent ? 9 : 7} fontWeight="600">
          {steps.indexOf(step) + 1}
        </text>
        {/* 教材式参数标注 */}
        <text x={mx} y={ly} textAnchor="middle"
          fill={color} fontSize={isCurrent ? 11 : 9}
          fontWeight={isCurrent ? '600' : '400'}>
          {arrowLabel}
        </text>
      </g>
    )
  }

  // 教材式状态色块条（使用 blockTransitions 与箭头坐标一致）
  const renderStateBlocks = () => {
    if (!mode) return null
    const { clientTransitions, serverTransitions } = blockTransitions

    const buildBlocks = (transitions, side) => {
      const blocks = []
      for (let i = 0; i < transitions.length - 1; i++) {
        const h = transitions[i + 1].y - transitions[i].y
        if (h <= 0) continue
        blocks.push({
          side,
          state: transitions[i].state,
          y: transitions[i].y,
          h,
          startIdx: i, // 该块在 transitions 中的起始索引
        })
      }
      return blocks
    }

    const allBlocks = [
      ...buildBlocks(clientTransitions, 'client'),
      ...buildBlocks(serverTransitions, 'server'),
    ]

    return (
      <g>
        {allBlocks.filter((b) => b.h > 0).map((b, i) => {
          const isClient = b.side === 'client'
          const x = isClient ? clientX - stateBlockW / 2 : serverX - stateBlockW / 2
          const centerX = isClient ? clientX : serverX
          // 还未到达的块（startIdx 大于当前步骤索引）不显示
          if (b.startIdx > currentStepIndex + 1) return null
          const isCurrentState = currentStep && (
            (isClient && currentStep.clientState === b.state) ||
            (!isClient && currentStep.serverState === b.state)
          )
          const opacity = isCurrentState ? 1 : 0.55

          return (
            <g key={`sb-${i}`} opacity={opacity}>
              <rect
                x={x} y={b.y} width={stateBlockW} height={b.h}
                rx={2} fill={getStateColor(b.state)}
                stroke="rgba(0,0,0,0.15)" strokeWidth={1}
              />
              <text
                x={centerX} y={b.y + b.h / 2 + 4}
                textAnchor="middle" fill="white"
                fontSize={isCurrentState ? 9 : 8} fontWeight="600">
                {getStateName(b.state)}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  // 数据传送步骤
  const renderDataStep = (step, isCurrent) => {
    const y = getStepY(step)
    const opacity = isCurrent ? 1 : 0.4
    const stepNum = steps.indexOf(step) + 1

    if (step.dataType === 'bidirectional') {
      return (
        <g key={`data-${step.id}`} opacity={opacity}>
          <line x1={clientX + 40} y1={y - 8} x2={serverX - 40} y2={y - 8}
            stroke="#ff4d4f" strokeWidth={isCurrent ? 2.5 : 1.5}
            markerEnd="url(#arrowRed)" />
          <line x1={serverX - 40} y1={y + 8} x2={clientX + 40} y2={y + 8}
            stroke="#ff4d4f" strokeWidth={isCurrent ? 2.5 : 1.5}
            markerEnd="url(#arrowRed)" />
          <circle cx={midX - 100} cy={y - 1} r={isCurrent ? 10 : 8} fill="#ff4d4f" />
          <text x={midX - 100} y={y + 3} textAnchor="middle"
            fill="white" fontSize={isCurrent ? 10 : 8} fontWeight="600">{stepNum}</text>
          <rect x={midX - 35} y={y - 9} width={70} height={18} rx={4}
            fill="#fff1f0" stroke="#ff4d4f" strokeWidth={1} />
          <text x={midX} y={y + 4} textAnchor="middle"
            fill="#ff4d4f" fontSize={isCurrent ? 10 : 9} fontWeight="600">数据传送</text>
        </g>
      )
    }

    if (step.dataType === 'serverToClient') {
      return (
        <g key={`data-${step.id}`} opacity={opacity}>
          <line x1={serverX - 40} y1={y} x2={clientX + 40} y2={y}
            stroke="#ff4d4f" strokeWidth={isCurrent ? 2.5 : 1.5}
            markerEnd="url(#arrowRed)" />
          <circle cx={midX - 100} cy={y - 1} r={isCurrent ? 10 : 8} fill="#ff4d4f" />
          <text x={midX - 100} y={y + 3} textAnchor="middle"
            fill="white" fontSize={isCurrent ? 10 : 8} fontWeight="600">{stepNum}</text>
          <rect x={midX - 35} y={y - 9} width={70} height={18} rx={4}
            fill="#fff1f0" stroke="#ff4d4f" strokeWidth={1} />
          <text x={midX} y={y + 4} textAnchor="middle"
            fill="#ff4d4f" fontSize={isCurrent ? 10 : 9} fontWeight="600">数据传送</text>
        </g>
      )
    }
    return null
  }

  // 2MSL 回弯箭头
  const renderWaitStep = (step, isCurrent) => {
    const y = getStepY(step)
    const opacity = isCurrent ? 1 : 0.4
    const stepNum = steps.indexOf(step) + 1
    const loopX = clientX + stateBlockW / 2 + 2
    const loopR = 20
    const pathD = `M ${clientX + 5} ${y - 10}
                   C ${loopX + loopR} ${y - 10}, ${loopX + loopR} ${y + 10}, ${clientX + 5} ${y + 10}`

    return (
      <g key={`wait-${step.id}`} opacity={opacity}>
        <path d={pathD} fill="none" stroke="#722ed1" strokeWidth={isCurrent ? 2.5 : 1.5}
          markerEnd="url(#arrowPurple)" />
        <circle cx={midX - 100} cy={y - 1} r={isCurrent ? 10 : 8} fill="#722ed1" />
        <text x={midX - 100} y={y + 3} textAnchor="middle"
          fill="white" fontSize={isCurrent ? 10 : 8} fontWeight="600">{stepNum}</text>
        <rect x={midX - 40} y={y - 9} width={80} height={18} rx={4}
          fill="#f9f0ff" stroke="#722ed1" strokeWidth={1} />
        <text x={midX} y={y + 4} textAnchor="middle"
          fill="#722ed1" fontSize={isCurrent ? 10 : 9} fontWeight="600">等待 2MSL</text>
        <circle cx={loopX + loopR + 5} cy={y} r={8}
          fill={isCurrent ? '#f9f0ff' : '#f5f5f5'} stroke="#722ed1" strokeWidth={1} />
        <line x1={loopX + loopR + 5} y1={y} x2={loopX + loopR + 5} y2={y - 4}
          stroke="#722ed1" strokeWidth={1} strokeLinecap="round" />
        <line x1={loopX + loopR + 5} y1={y} x2={loopX + loopR + 8} y2={y + 1.5}
          stroke="#722ed1" strokeWidth={1} strokeLinecap="round" />
      </g>
    )
  }

  // 教材式标注（主动打开/被动打开/主动关闭/通知应用进程/被动关闭）
  const renderAnnotations = () => {
    if (!mode) return null
    const items = []
    steps.forEach((step, idx) => {
      if (!step.annotations) return
      const y = getStepY(step)
      const stepNum = idx + 1
      if (step.annotations.client) {
        items.push(
          <g key={`ann-c-${step.id}`} opacity={currentStepIndex >= idx ? 1 : 0.35}>
            <rect
              x={clientX - stateBlockW / 2 - 64} y={y - 10}
              width={60} height={18} rx={2}
              fill="#fffbe6" stroke="#faad14" strokeWidth={0.8}
            />
            <text
              x={clientX - stateBlockW / 2 - 34} y={y + 2}
              textAnchor="middle" fill="#d48806"
              fontSize={9} fontWeight="600">
              {step.annotations.client}
            </text>
          </g>
        )
      }
      if (step.annotations.server) {
        items.push(
          <g key={`ann-s-${step.id}`} opacity={currentStepIndex >= idx ? 1 : 0.35}>
            <rect
              x={serverX + stateBlockW / 2 + 4} y={y - 10}
              width={72} height={18} rx={2}
              fill="#e6fffb" stroke="#13c2c2" strokeWidth={0.8}
            />
            <text
              x={serverX + stateBlockW / 2 + 40} y={y + 2}
              textAnchor="middle" fill="#08979c"
              fontSize={9} fontWeight="600">
              {step.annotations.server}
            </text>
          </g>
        )
      }
    })
    return <g>{items}</g>
  }

  const renderStepElement = (step, isCurrent) => {
    if (step.type === 'data') return renderDataStep(step, isCurrent)
    if (step.type === 'wait') return renderWaitStep(step, isCurrent)
    return renderArrow(step, isCurrent)
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <marker id="arrowBlue" viewBox="0 0 10 6" refX="10" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill="#1890ff" />
        </marker>
        <marker id="arrowGreen" viewBox="0 0 10 6" refX="10" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 3 L 0 6 z" fill="#52c41a" />
        </marker>
        <marker id="arrowRed" viewBox="0 0 8 6" refX="8" refY="3"
          markerWidth="7" markerHeight="5" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 z" fill="#ff4d4f" />
        </marker>
        <marker id="arrowPurple" viewBox="0 0 8 6" refX="4" refY="6"
          markerWidth="6" markerHeight="5" orient="auto">
          <path d="M 0 0 L 4 6 L 8 0 z" fill="#722ed1" />
        </marker>
      </defs>

      {/* 时间线 */}
      <line x1={clientX} y1={startY - 10} x2={clientX}
        y2={startY + steps.length * stepHeight + 35}
        stroke="#1890ff" strokeWidth="2" strokeDasharray="4,4" />
      <line x1={serverX} y1={startY - 10} x2={serverX}
        y2={startY + steps.length * stepHeight + 35}
        stroke="#52c41a" strokeWidth="2" strokeDasharray="4,4" />

      {/* 设备标签 */}
      <g>
        <rect x={clientX - 50} y={startY - 40} width={100} height={28} rx={4} fill="#1890ff" />
        <text x={clientX} y={startY - 22} textAnchor="middle"
          fill="white" fontSize="11" fontWeight="600">客户端 (Client)</text>
      </g>
      <g>
        <rect x={serverX - 50} y={startY - 40} width={100} height={28} rx={4} fill="#52c41a" />
        <text x={serverX} y={startY - 22} textAnchor="middle"
          fill="white" fontSize="11" fontWeight="600">服务器 (Server)</text>
      </g>

      {/* 模式标题 */}
      {mode && (
        <g>
          <rect x={midX - 80} y={startY - 65} width={160} height={22} rx={11}
            fill={mode === 'handshake' ? '#e6f7ff' : '#fff1f0'}
            stroke={mode === 'handshake' ? '#1890ff' : '#ff4d4f'} strokeWidth={1} />
          <text x={midX} y={startY - 50} textAnchor="middle"
            fill={mode === 'handshake' ? '#1890ff' : '#ff4d4f'}
            fontSize="11" fontWeight="600">
            {mode === 'handshake' ? '三次握手建立连接' : '四次挥手释放连接'}
          </text>
        </g>
      )}

      {/* 状态色块层 */}
      {renderStateBlocks()}

      {/* 教材式标注层 */}
      {renderAnnotations()}

      {/* 挥手初始数据传送箭头 */}
      {mode === 'finsh' && currentStepIndex < 0 && (() => {
        const y = startY + 5 + 35
        return (
          <g>
            <line x1={clientX + 40} y1={y - 5} x2={serverX - 40} y2={y - 5}
              stroke="#ff4d4f" strokeWidth={2} markerEnd="url(#arrowRed)" />
            <line x1={serverX - 40} y1={y + 5} x2={clientX + 40} y2={y + 5}
              stroke="#ff4d4f" strokeWidth={2} markerEnd="url(#arrowRed)" />
            <rect x={midX - 35} y={y - 9} width={70} height={18} rx={4}
              fill="#fff1f0" stroke="#ff4d4f" strokeWidth={1} />
            <text x={midX} y={y + 4} textAnchor="middle"
              fill="#ff4d4f" fontSize="10" fontWeight="600">数据传送</text>
          </g>
        )
      })()}

      {/* 箭头层 */}
      {completedSteps.map((stepId) => {
        const step = steps.find((s) => s.id === stepId)
        if (step && stepId !== currentStep?.id) {
          return (
            <g key={`done-${stepId}`}>
              {renderStepElement(step, false)}
            </g>
          )
        }
        return null
      })}

      {currentStep && renderStepElement(currentStep, true)}

      {/* 报文动画 */}
      {packetPos && currentStep?.type === 'protocol' && (
        <g>
          <rect x={packetPos.x - 25} y={packetPos.y - 8} width={50} height={16} rx={8}
            fill={currentStep.from === 'client' ? '#1890ff' : '#52c41a'} opacity={0.95} />
          <text x={packetPos.x} y={packetPos.y + 4} textAnchor="middle"
            fill="white" fontSize="8" fontWeight="600">{packetLabel}</text>
        </g>
      )}
    </svg>
  )
}

export default TcpTopology
