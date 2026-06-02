import { Card, Tag, Descriptions } from 'antd'

/**
 * 步骤信息面板组件
 * 展示当前步骤的详细信息：步骤编号、协议、地址、描述等
 */
function StepInfoPanel({ currentStep, totalSteps }) {
  if (!currentStep) {
    return (
      <Card size="small" title="📋 步骤信息" style={{ height: '100%' }}>
        <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
          点击"开始解析"或"下一步"开始演示
        </p>
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title="📋 步骤信息"
      style={{ height: '100%' }}
      extra={
        <Tag color="blue">
          {currentStep.id} / {totalSteps}
        </Tag>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Tag color="purple" style={{ fontSize: 13, padding: '2px 12px' }}>
          {currentStep.name}
        </Tag>
      </div>

      <Descriptions column={1} size="small" bordered>
        {currentStep.protocol && (
          <Descriptions.Item label="协议">
            <Tag color="cyan">{currentStep.protocol}</Tag>
          </Descriptions.Item>
        )}
        {currentStep.broadcast !== null && (
          <Descriptions.Item label="通信方式">
            {currentStep.broadcast ? (
              <Tag color="orange">广播</Tag>
            ) : (
              <Tag color="green">单播</Tag>
            )}
          </Descriptions.Item>
        )}
        {currentStep.srcMac && (
          <Descriptions.Item label="源 MAC">
            <code style={{ fontSize: 11 }}>{currentStep.srcMac}</code>
          </Descriptions.Item>
        )}
        {currentStep.dstMac && (
          <Descriptions.Item label="目的 MAC">
            <code style={{ fontSize: 11 }}>{currentStep.dstMac}</code>
          </Descriptions.Item>
        )}
        {currentStep.srcIp && (
          <Descriptions.Item label="源 IP">
            <code>{currentStep.srcIp}</code>
          </Descriptions.Item>
        )}
        {currentStep.dstIp && (
          <Descriptions.Item label="目的 IP">
            <code>{currentStep.dstIp}</code>
          </Descriptions.Item>
        )}
        {currentStep.pathHighlight && (
          <Descriptions.Item label="传输路径">
            <span style={{ color: '#1890ff', fontWeight: 500 }}>
              {currentStep.pathHighlight[0]} → {currentStep.pathHighlight[1]}
            </span>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{
        marginTop: 12,
        padding: '10px 12px',
        background: '#f6f8fa',
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.7,
        color: '#333',
      }}>
        {currentStep.description}
      </div>
    </Card>
  )
}

export default StepInfoPanel
