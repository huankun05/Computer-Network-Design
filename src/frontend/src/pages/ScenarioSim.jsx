import { useState, useEffect, useRef, useCallback } from 'react'
import { Typography, Button, Card, Tag, Table, Space, message } from 'antd'
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined, StepForwardOutlined, UndoOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import ScenarioTopology from '../components/ScenarioTopology'
import { SCENARIO_STEPS, FINAL_STATE } from '../data/scenarioSteps'

const { Title, Paragraph, Text } = Typography

function ScenarioSim() {
  const navigate = useNavigate()
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [arpTable, setArpTable] = useState({})
  const [switchTable, setSwitchTable] = useState({})
  const timerRef = useRef(null)

  const currentStep = currentStepIndex >= 0 ? SCENARIO_STEPS[currentStepIndex] : null
  const totalSteps = SCENARIO_STEPS.length
  const isAutoPlaying = isPlaying && !isPaused

  // 根据步骤更新表数据
  const updateTablesForStep = useCallback((stepIndex) => {
    if (stepIndex < 0) {
      setArpTable({})
      setSwitchTable({})
      return
    }
    const step = SCENARIO_STEPS[stepIndex]
    if (step) {
      if (step.arpTable) setArpTable({ ...step.arpTable })
      if (step.switchTable) setSwitchTable({ ...step.switchTable })
    }
  }, [])

  // 动画完成回调
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false)

    // 更新ARP表和交换机表
    if (currentStep) updateTablesForStep(currentStepIndex)

    if (isAutoPlaying && currentStepIndex < totalSteps - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
        setIsAnimating(true)
      }, 1200)
    } else if (isAutoPlaying && currentStepIndex >= totalSteps - 1) {
      setIsPlaying(false)
      setIsPaused(false)
      message.success('通信过程完成！')
    }
  }, [currentStep, currentStepIndex, isAutoPlaying, totalSteps, updateTablesForStep])

  // 开始
  const handleStart = () => {
    setCurrentStepIndex(0)
    setIsPlaying(true)
    setIsPaused(false)
    setIsAnimating(true)
    updateTablesForStep(0)
  }

  // 暂停/继续
  const handlePause = () => {
    setIsPaused((prev) => !prev)
  }

  // 下一步
  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIdx = currentStepIndex + 1
      setCurrentStepIndex(nextIdx)
      setIsAnimating(true)
      updateTablesForStep(nextIdx)
    }
  }

  // 上一步
  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1
      setCurrentStepIndex(prevIdx)
      setIsAnimating(false)
      updateTablesForStep(prevIdx)
    }
  }

  // 重置
  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setIsPaused(false)
    setIsAnimating(false)
    setArpTable({})
    setSwitchTable({})
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // ARP表列定义
  const arpColumns = [
    { title: 'IP 地址', dataIndex: 'ip', key: 'ip' },
    { title: 'MAC 地址', dataIndex: 'mac', key: 'mac' },
  ]

  // 交换机表列定义
  const switchColumns = [
    { title: 'MAC 地址', dataIndex: 'mac', key: 'mac' },
    { title: '端口', dataIndex: 'port', key: 'port' },
  ]

  // 转换表数据
  const arpData = Object.entries(arpTable).map(([ip, mac]) => ({ ip, mac, key: ip }))
  const switchData = Object.entries(switchTable).map(([mac, port]) => ({ mac, port, key: mac }))

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa', overflow: 'hidden' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, color: '#1f2937' }}>综合网络场景模拟</Title>
        <Text style={{ color: '#6b7280', fontSize: 12 }}>
          H1 访问 www.abc.com 完整通信过程
        </Text>
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
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={isPlaying}
          >
            开始
          </Button>
          {isPlaying && (
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
            >
              {isPaused ? '继续' : '暂停'}
            </Button>
          )}
          <Button
            size="small"
            onClick={handlePrev}
            disabled={isAutoPlaying || currentStepIndex <= 0}
          >
            上一步
          </Button>
          <Button
            size="small"
            icon={<StepForwardOutlined />}
            onClick={handleNext}
            disabled={isAutoPlaying || currentStepIndex >= totalSteps - 1}
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
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* 拓扑图 */}
        <div style={{
          flex: 1,
          background: '#fff',
          borderRadius: 8,
          padding: 12,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <ScenarioTopology
            currentStep={currentStep}
            isAnimating={isAnimating}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>

        {/* 右侧信息面板 */}
        <div style={{ width: 320, flexShrink: 0, overflow: 'auto' }}>
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
                <div style={{ marginBottom: 6 }}>
                  <Tag color="blue" style={{ fontSize: 11 }}>步骤 {currentStep.id}</Tag>
                  <Text strong style={{ color: '#1f2937', fontSize: 13 }}>{currentStep.name}</Text>
                </div>
                <Paragraph style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>
                  {currentStep.description}
                </Paragraph>
                <Space direction="vertical" size={4} style={{ width: '100%', fontSize: 11 }}>
                  <div>
                    <Text style={{ color: '#6b7280' }}>协议：</Text>
                    <Tag color="blue" style={{ fontSize: 11 }}>{currentStep.protocol || '-'}</Tag>
                  </div>
                  <div>
                    <Text style={{ color: '#6b7280' }}>类型：</Text>
                    <Tag color={currentStep.broadcast ? 'orange' : 'green'} style={{ fontSize: 11 }}>
                      {currentStep.broadcast ? '广播' : currentStep.broadcast === false ? '单播' : '-'}
                    </Tag>
                  </div>
                  <div>
                    <Text style={{ color: '#6b7280' }}>源MAC：</Text>
                    <Text code style={{ color: '#1890ff', fontSize: 11 }}>{currentStep.srcMac || '-'}</Text>
                  </div>
                  <div>
                    <Text style={{ color: '#6b7280' }}>目的MAC：</Text>
                    <Text code style={{ color: '#1890ff', fontSize: 11 }}>{currentStep.dstMac || '-'}</Text>
                  </div>
                  <div>
                    <Text style={{ color: '#6b7280' }}>源IP：</Text>
                    <Text code style={{ color: '#1890ff', fontSize: 11 }}>{currentStep.srcIp || '-'}</Text>
                  </div>
                  <div>
                    <Text style={{ color: '#6b7280' }}>目的IP：</Text>
                    <Text code style={{ color: '#1890ff', fontSize: 11 }}>{currentStep.dstIp || '-'}</Text>
                  </div>
                </Space>
              </>
            ) : (
              <Paragraph style={{ color: '#9ca3af' }}>点击"开始"按钮启动模拟</Paragraph>
            )}
          </div>

          {/* 交换机处理行为 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
            marginBottom: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>交换机处理</div>
            {currentStep?.switchAction ? (
              <Text style={{ color: '#1f2937', fontSize: 12 }}>{currentStep.switchAction}</Text>
            ) : (
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>-</Text>
            )}
          </div>

          {/* H1 ARP表 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
            marginBottom: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>H1 ARP 表</div>
            <Table
              columns={arpColumns}
              dataSource={arpData}
              size="small"
              pagination={false}
              locale={{ emptyText: '空' }}
            />
          </div>

          {/* 交换机交换表 */}
          <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            padding: 12,
          }}>
            <div style={{ color: '#1f2937', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>交换机 S 交换表</div>
            <Table
              columns={switchColumns}
              dataSource={switchData}
              size="small"
              pagination={false}
              locale={{ emptyText: '空' }}
            />
          </div>
        </div>
      </div>

      {/* 步骤时间轴 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '8px 12px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {SCENARIO_STEPS.map((step, idx) => (
          <div
            key={step.id}
            onClick={() => {
              if (!isPlaying) {
                setCurrentStepIndex(idx)
                setIsAnimating(false)
                updateTablesForStep(idx)
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: isPlaying ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: idx === currentStepIndex ? '#fff' :
                     idx < currentStepIndex ? '#1890ff' : '#9ca3af',
              background: idx === currentStepIndex ? '#1890ff' :
                          idx < currentStepIndex ? '#e6f7ff' : '#f3f4f6',
              border: idx === currentStepIndex ? '2px solid #00d4ff' : 'none',
              transition: 'all 0.3s',
              boxShadow: idx === currentStepIndex ? '0 0 15px rgba(0, 212, 255, 0.5)' : 'none',
            }}>
              {idx < currentStepIndex ? '✓' : idx + 1}
            </div>
            {idx < SCENARIO_STEPS.length - 1 && (
              <div style={{
                width: 24,
                height: 2,
                background: idx < currentStepIndex ? '#00d4ff' : '#3c494e',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
        <span style={{ marginLeft: 16, fontSize: 12, color: '#859398', whiteSpace: 'nowrap' }}>
          步骤 {currentStepIndex >= 0 ? currentStepIndex + 1 : '-'} / {totalSteps}
        </span>
      </div>

      {/* 最终状态结论 */}
      {currentStepIndex === totalSteps - 1 && !isPlaying && (
        <Card title="最终状态与结论" style={{ marginTop: 16 }}>
          <Paragraph>{FINAL_STATE.conclusion}</Paragraph>
        </Card>
      )}
    </div>
  )
}

export default ScenarioSim
