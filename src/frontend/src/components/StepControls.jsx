import { Button, Space, Input } from 'antd'
import {
  CaretRightOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  UndoOutlined,
  PauseOutlined,
} from '@ant-design/icons'

/**
 * 步骤控制按钮组件
 * 包含域名输入框、开始/暂停/继续/下一步/上一步/重置按钮
 */
function StepControls({
  domain,
  onDomainChange,
  onStart,
  onPause,
  onContinue,
  onNext,
  onPrev,
  onReset,
  currentStepIndex,
  totalSteps,
  isPlaying,
}) {
  const isFinished = currentStepIndex >= totalSteps - 1
  const isInitial = currentStepIndex < 0
  const isStarted = currentStepIndex >= 0

  // 确定主按钮显示文本
  const getMainButtonText = () => {
    if (isPlaying) return '暂停'
    if (isStarted && !isFinished) return '继续'
    return '开始解析'
  }

  // 确定主按钮点击事件
  const handleMainButtonClick = () => {
    if (isPlaying) {
      onPause()
    } else if (isStarted && !isFinished) {
      onContinue()
    } else {
      onStart()
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
    }}>
      <Input
        placeholder="输入任意域名，如 www.baidu.com"
        value={domain}
        onChange={(e) => onDomainChange(e.target.value)}
        onPressEnter={handleMainButtonClick}
        style={{ maxWidth: 250 }}
        disabled={isPlaying}
      />
      <Space>
        <Button
          type="primary"
          size="small"
          icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={handleMainButtonClick}
          disabled={isFinished}
        >
          {getMainButtonText()}
        </Button>
        <Button
          size="small"
          icon={<StepBackwardOutlined />}
          onClick={onPrev}
          disabled={isInitial || isPlaying}
        >
          上一步
        </Button>
        <Button
          size="small"
          icon={<StepForwardOutlined />}
          onClick={onNext}
          disabled={isFinished || isPlaying}
        >
          下一步
        </Button>
        <Button
          size="small"
          icon={<UndoOutlined />}
          onClick={onReset}
        >
          重置
        </Button>
      </Space>
    </div>
  )
}

export default StepControls
