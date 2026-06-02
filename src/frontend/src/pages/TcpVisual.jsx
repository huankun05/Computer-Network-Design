import { useState, useEffect, useRef, useCallback } from 'react'
import { Typography, Button, Card, Tag, Space, message } from 'antd'
import { ArrowLeftOutlined, PlayCircleOutlined, PauseOutlined, StepForwardOutlined, StepBackwardOutlined, UndoOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import TcpTopology from '../components/TcpTopology'
import { ALL_STEPS, HANDSHAKE_STEPS, FINSH_STEPS, TCP_STATES } from '../data/tcpSteps'

const { Title, Paragraph, Text } = Typography

function TcpVisual() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'handshake' | 'finsh'
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [completedSteps, setCompletedSteps] = useState([])
  const timerRef = useRef(null)

  const steps = mode === 'handshake' ? HANDSHAKE_STEPS : mode === 'finsh' ? FINSH_STEPS : []
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null
  const totalSteps = steps.length

  // 动画完成回调
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false)

    if (isPlaying && currentStepIndex < totalSteps - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
        setIsAnimating(true)
      }, 800)
    } else if (isPlaying && currentStepIndex >= totalSteps - 1) {
      setIsPlaying(false)
      message.success(mode === 'handshake' ? '三次握手完成！进入数据传送阶段' : '四次挥手完成！连接已释放')
    }
  }, [currentStepIndex, isPlaying, totalSteps, mode])

  // 开始三次握手
  const handleStartHandshake = () => {
    setMode('handshake')
    setCurrentStepIndex(0)
    setIsPlaying(true)
    setIsAnimating(true)
  }

  // 开始四次挥手（独立运行，无需等待握手完成）
  const handleStartFinsh = () => {
    setMode('finsh')
    setCurrentStepIndex(0)
    setIsPlaying(true)
    setIsAnimating(true)
  }

  // 下一步（手动）
  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      // 手动前进时，把当前步骤标记为已完成
      if (currentStepIndex >= 0) {
        setCompletedSteps((prev) => [...new Set([...prev, steps[currentStepIndex].id])])
      }
      setCurrentStepIndex((prev) => prev + 1)
      setIsAnimating(true)
    }
  }

  // 上一步
  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
      setIsAnimating(false)
    }
  }

  // 重置
  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMode(null)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setIsAnimating(false)
    setCompletedSteps([])
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa', overflow: 'hidden' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, color: '#1f2937' }}>TCP 三次握手与四次挥手</Title>
      </div>

      {/* 控制按钮 */}
      <div style={{
        marginBottom: 12,
        padding: '10px 16px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <Space size="middle">
          <Button
            type={mode === 'handshake' ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              setMode('handshake')
              setCurrentStepIndex(-1)
              setIsPlaying(false)
              setIsAnimating(false)
              setCompletedSteps([])
            }}
          >
            三次握手
          </Button>
          <Button
            type={mode === 'finsh' ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              setMode('finsh')
              setCurrentStepIndex(-1)
              setIsPlaying(false)
              setIsAnimating(false)
              setCompletedSteps([])
            }}
          >
            四次挥手
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={mode === 'finsh' ? handleStartFinsh : handleStartHandshake}
            disabled={isPlaying || !mode}
          >
            {mode === 'finsh' ? '开始挥手' : '开始握手'}
          </Button>
          <Button
            size="small"
            icon={<StepBackwardOutlined />}
            onClick={handlePrev}
            disabled={isPlaying || currentStepIndex <= 0}
          >
            上一步
          </Button>
          <Button
            size="small"
            icon={<StepForwardOutlined />}
            onClick={handleNext}
            disabled={isPlaying || currentStepIndex >= totalSteps - 1}
          >
            下一步
          </Button>
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
        </Space>
      </div>

      {/* 主体区域 */}
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 序列图 */}
        <div style={{
          flex: 2,
          background: '#fff',
          borderRadius: 8,
          padding: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <TcpTopology
            currentStep={currentStep}
            isAnimating={isAnimating}
            onAnimationComplete={handleAnimationComplete}
            mode={mode}
            completedSteps={completedSteps}
            setCompletedSteps={setCompletedSteps}
            currentStepIndex={currentStepIndex}
          />
        </div>

        {/* 右侧信息面板 */}
        <div style={{ width: 260, flexShrink: 0, overflow: 'auto' }}>
          {/* 步骤信息 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
            marginBottom: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>当前步骤</div>
            {currentStep ? (
              <>
                <Paragraph strong style={{ color: '#1f2937', marginBottom: 6, fontSize: 13 }}>{currentStep.name}</Paragraph>
                <Paragraph style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>
                  {currentStep.description}
                </Paragraph>
                {currentStep.type === 'protocol' && (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>协议：</Text>
                      <Tag color="blue" style={{ fontSize: 11 }}>{currentStep.protocol}</Tag>
                    </div>
                    <div>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>标志位：</Text>
                      <Tag color="green" style={{ fontSize: 11 }}>{currentStep.flags}</Tag>
                    </div>
                    <div>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>方向：</Text>
                      <Text style={{ color: '#1f2937', fontSize: 12 }}>{currentStep.from === 'client' ? '客户端 → 服务器' : '服务器 → 客户端'}</Text>
                    </div>
                  </Space>
                )}
                {currentStep.type === 'data' && (
                  <div>
                    <Tag color="red" style={{ fontSize: 11 }}>
                      {currentStep.dataType === 'bidirectional' ? '双向数据传输' : '服务器 → 客户端'}
                    </Tag>
                  </div>
                )}
                {currentStep.type === 'wait' && (
                  <div>
                    <Tag color="purple" style={{ fontSize: 11 }}>等待 2MSL 后关闭</Tag>
                  </div>
                )}
              </>
            ) : (
              <Paragraph style={{ color: '#9ca3af', fontSize: 12 }}>请选择操作模式</Paragraph>
            )}
          </div>

          {/* 数据包详情 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
            marginBottom: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>数据包详情</div>
            {currentStep?.packetInfo ? (
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                <div style={{ marginBottom: 6 }}><Text style={{ color: '#6b7280' }}>源端口：</Text><Text style={{ color: '#1f2937' }}>{currentStep.packetInfo.srcPort}</Text></div>
                <div style={{ marginBottom: 6 }}><Text style={{ color: '#6b7280' }}>目的端口：</Text><Text style={{ color: '#1f2937' }}>{currentStep.packetInfo.dstPort}</Text></div>
                <div style={{ marginBottom: 6 }}><Text style={{ color: '#6b7280' }}>标志位：</Text><Text style={{ color: '#1890ff' }}>{currentStep.packetInfo.flags}</Text></div>
                <div style={{ marginBottom: 6 }}><Text style={{ color: '#6b7280' }}>序号Seq：</Text><Text style={{ color: '#1f2937' }}>{currentStep.packetInfo.seq}</Text></div>
                <div><Text style={{ color: '#6b7280' }}>确认号Ack：</Text><Text style={{ color: '#1f2937' }}>{currentStep.packetInfo.ack}</Text></div>
              </div>
            ) : (
              <Paragraph style={{ color: '#9ca3af', fontSize: 12 }}>暂无数据</Paragraph>
            )}
          </div>

          {/* TCP状态表 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>TCP 状态表</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <Text style={{ color: '#6b7280', fontSize: 11 }}>客户端：</Text>
                <Tag
                  color={TCP_STATES[currentStep?.clientState || 'CLOSED']?.color}
                  style={{ marginLeft: 4, fontSize: 11 }}
                >
                  {TCP_STATES[currentStep?.clientState || 'CLOSED']?.name}
                </Tag>
              </div>
              <div>
                <Text style={{ color: '#6b7280', fontSize: 11 }}>服务器：</Text>
                <Tag
                  color={TCP_STATES[currentStep?.serverState || 'CLOSED']?.color}
                  style={{ marginLeft: 4, fontSize: 11 }}
                >
                  {TCP_STATES[currentStep?.serverState || 'CLOSED']?.name}
                </Tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 步骤时间轴 — 数段块 */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        padding: '8px 12px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {steps.map((step, idx) => {
          // 根据步骤类型确定颜色
          let bgColor = '#f3f4f6'
          let activeBg = '#1890ff'
          let textColor = '#9ca3af'
          let label = ''

          if (step.type === 'data') {
            bgColor = '#fff1f0'
            activeBg = '#ff4d4f'
            label = '数据传送'
          } else if (step.type === 'wait') {
            bgColor = '#f9f0ff'
            activeBg = '#722ed1'
            label = '2MSL等待'
          } else if (step.from === 'client') {
            bgColor = '#e6f7ff'
            activeBg = '#1890ff'
            label = step.flags?.split(',')[0]?.trim() || ''
          } else {
            bgColor = '#f6ffed'
            activeBg = '#52c41a'
            label = step.flags?.split(',')[0]?.trim() || ''
          }

          const isCurrent = idx === currentStepIndex
          const isDone = idx < currentStepIndex

          return (
            <div
              key={step.id}
              onClick={() => {
                if (!isPlaying) {
                  // 点击时把该步之前的所有步骤标记为已完成，确保前面步骤都显示
                  const newCompleted = steps.slice(0, idx).map((s) => s.id)
                  setCompletedSteps(newCompleted)
                  setCurrentStepIndex(idx)
                  setIsAnimating(false)
                }
              }}
              style={{
                flex: 1,
                minWidth: 56,
                padding: '6px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                cursor: isPlaying ? 'default' : 'pointer',
                background: isCurrent ? activeBg : isDone ? bgColor : '#f3f4f6',
                borderRadius: 4,
                border: isCurrent ? `2px solid ${activeBg}` : '1px solid #e5e7eb',
                opacity: isDone && !isCurrent ? 0.7 : 1,
                transition: 'all 0.3s',
              }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: isCurrent ? '#fff' : isDone ? activeBg : '#9ca3af',
                lineHeight: 1,
              }}>
                {idx + 1}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? '#fff' : '#4b5563',
                textAlign: 'center',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
          )
        })}
        <span style={{ marginLeft: 12, fontSize: 12, color: '#859398', whiteSpace: 'nowrap', alignSelf: 'center' }}>
          步骤 {currentStepIndex >= 0 ? currentStepIndex + 1 : '-'} / {totalSteps}
        </span>
      </div>
    </div>
  )
}

export default TcpVisual
