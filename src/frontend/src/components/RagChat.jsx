import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Tag, Typography, Space, Tooltip, Segmented, Badge, Skeleton, Collapse } from 'antd'
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  FileTextOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  BookOutlined,
  ApiOutlined,
  GlobalOutlined,
  QuestionCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const { Text } = Typography

// ===== 推荐问题 =====
const SUGGESTIONS = [
  { icon: <ApiOutlined />, text: 'TCP 三次握手的过程是什么？', color: '#6366f1' },
  { icon: <GlobalOutlined />, text: 'DNS 是如何解析域名的？', color: '#10b981' },
  { icon: <QuestionCircleOutlined />, text: 'ARP 协议的作用是什么？', color: '#f59e0b' },
  { icon: <ThunderboltOutlined />, text: 'TCP 和 UDP 有什么区别？', color: '#ef4444' },
]

// ===== 打字指示器 =====
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6366f1',
          animation: `rag-bounce 1.4s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
      <style>{`
        @keyframes rag-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ===== 空的函数返回 null =====
const Noop = () => null

function RagChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [provider, setProvider] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

  const messagesEndRef = useRef(null)
  const chatListRef = useRef(null)
  const abortRef = useRef(null)

  // 检查索引状态
  useEffect(() => {
    fetch('/api/chat/status')
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => setStatus({ indexed: false, error: '无法连接' }))
  }, [])

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom()
  }, [messages, showScrollBtn, scrollToBottom])

  // 监听手动滚动
  const handleScroll = useCallback(() => {
    const el = chatListRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setShowScrollBtn(!isNearBottom)
  }, [])

  // 发送消息
  const handleSend = async () => {
    const q = input.trim()
    if (!q || loading) return

    setInput('')
    setLoading(true)
    setShowScrollBtn(false)

    const userMsg = { role: 'user', content: q }
    const assistantMsg = { role: 'assistant', content: '', sources: [], thinking: true }
    setMessages(prev => [...prev, userMsg, assistantMsg])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, provider: provider || undefined }),
        signal: controller.signal,
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstContent = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          try {
            const event = JSON.parse(trimmed.slice(6))
            setMessages(prev => {
              const updated = [...prev]
              const lastIdx = updated.length - 1
              const last = updated[lastIdx]
              if (last?.role !== 'assistant') return updated

              if (event.type === 'sources') {
                updated[lastIdx] = { ...last, sources: event.sources }
              } else if (event.type === 'content') {
                if (firstContent) {
                  firstContent = false
                  updated[lastIdx] = { ...last, thinking: false, content: '' }
                }
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: (updated[lastIdx].content || '') + event.content,
                }
              } else if (event.type === 'error') {
                updated[lastIdx] = {
                  ...last,
                  thinking: false,
                  content: (last.content || '') + `\n\n> ⚠️ 错误: ${event.message}`,
                }
              } else if (event.type === 'done') {
                updated[lastIdx] = { ...last, thinking: false }
              }
              return updated
            })
          } catch { /* skip parse errors */ }
        }
      }

      // 最终确保 thinking 关闭
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, thinking: false }
        }
        return updated
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              thinking: false,
              content: (last.content || '') + `\n\n> ⚠️ 请求失败: ${err.message}`,
            }
          }
          return updated
        })
      }
    }

    setLoading(false)
    abortRef.current = null
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setLoading(false)
  }

  const handleClear = () => setMessages([])

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      const res = await fetch('/api/chat/rebuild', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus({ indexed: true, chunkCount: data.totalChunks, llmProvider: '...', embedModel: '...' })
      }
    } catch (err) {
      setStatus({ indexed: false, error: err.message })
    }
    setRebuilding(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #f8f7ff 0%, #f0f4ff 30%, #f5f7fa 100%)',
    }}>
      {/* ===== 顶部 Header ===== */}
      <header style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(99, 102, 241, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <RobotOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 700, display: 'block' }}>
              AI 知识问答
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
              基于 TCP/IP 五层模型知识库的智能助手
            </Text>
          </div>
        </div>

        <Space size="middle">
          {/* 状态指示器 */}
          {status && (
            <Tooltip title={status.error || (status.indexed ? `${status.chunkCount} 个文本块已索引` : '未索引')}>
              <Badge
                status={status.indexed ? 'success' : 'error'}
                text={
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                    {status.indexed ? `${status.chunkCount} 条索引` : '未索引'}
                  </span>
                }
              />
            </Tooltip>
          )}

          {/* LLM 提供商标切换 */}
          <Segmented
            size="small"
            value={provider}
            onChange={setProvider}
            options={[
              { value: '', label: '默认' },
              { value: 'ollama', label: 'Ollama' },
              { value: 'deepseek', label: 'DeepSeek' },
            ]}
            style={{ background: 'rgba(255,255,255,0.15)' }}
          />

          <Tooltip title="重建索引">
            <Button
              size="small"
              ghost
              icon={rebuilding ? <LoadingOutlined /> : <ReloadOutlined />}
              onClick={handleRebuild}
              loading={rebuilding}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            />
          </Tooltip>
          <Tooltip title="清空对话">
            <Button
              size="small"
              ghost
              icon={<DeleteOutlined />}
              onClick={handleClear}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            />
          </Tooltip>
        </Space>
      </header>

      {/* ===== 消息列表 ===== */}
      <div
        ref={chatListRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* 欢迎页 */}
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24, paddingBottom: 40,
          }}>
            {/* 图标 */}
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
            }}>
              <RobotOutlined style={{ fontSize: 38, color: '#fff' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', display: 'block' }}>
                你好，我是 NetLab AI
              </Text>
              <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                {status?.indexed
                  ? `已学习 ${status.chunkCount} 个知识点，随便问我计算机网络相关的问题吧`
                  : '请先启动 Ollama 并下载模型，然后重建索引'}
              </Text>
            </div>

            {/* 推荐问题卡片 */}
            {status?.indexed && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, width: '100%', marginTop: 8,
              }}>
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setInput(s.text); }}
                    style={{
                      padding: '12px 14px',
                      background: '#fff',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = s.color
                      e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${s.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: s.color, fontSize: 13, flexShrink: 0, marginTop: 1,
                    }}>
                      {s.icon}
                    </span>
                    <span style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            )}

            {!status?.indexed && (
              <Button type="primary" onClick={handleRebuild} loading={rebuilding}
                style={{ borderRadius: 10, background: '#6366f1', borderColor: '#6366f1', height: 38 }}>
                一键重建索引
              </Button>
            )}
          </div>
        )}

        {/* 消息气泡 */}
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex', gap: 10,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            animation: 'rag-fadeIn 0.3s ease',
          }}>
            {/* 头像 */}
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: msg.role === 'user'
                ? '0 2px 8px rgba(99,102,241,0.3)'
                : '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              {msg.role === 'user'
                ? <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                : <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
              }
            </div>

            {/* 气泡 */}
            <div style={{
              maxWidth: '72%', minWidth: 60,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                : '#fff',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              padding: '12px 16px',
              boxShadow: msg.role === 'user'
                ? '0 4px 16px rgba(99,102,241,0.25)'
                : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
            }}>
              {msg.thinking ? (
                <TypingDots />
              ) : msg.role === 'assistant' ? (
                <div className="rag-markdown" style={{ fontSize: 14, lineHeight: 1.75, color: '#1f2937' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h3 style={{ margin: '12px 0 6px', fontSize: 16, fontWeight: 700 }}>{children}</h3>,
                      h2: ({ children }) => <h3 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 700 }}>{children}</h3>,
                      h3: ({ children }) => <h4 style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 600 }}>{children}</h4>,
                      p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.75 }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ margin: '2px 0', lineHeight: 1.7 }}>{children}</li>,
                      code: ({ className, children, ...props }) => {
                        const isInline = !className
                        return isInline
                          ? <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 12, color: '#ef4444' }} {...props}>{children}</code>
                          : <code style={{ display: 'block', background: '#1e293b', color: '#e2e8f0', padding: '12px 16px', borderRadius: 8, fontSize: 12, overflow: 'auto' }} {...props}>{children}</code>
                      },
                      pre: ({ children }) => <pre style={{ margin: '8px 0', borderRadius: 8, overflow: 'hidden' }}>{children}</pre>,
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          borderLeft: '3px solid #6366f1', margin: '8px 0',
                          padding: '6px 12px', background: '#f5f3ff', borderRadius: '0 6px 6px 0',
                          color: '#6d28d9', fontSize: 13,
                        }}>{children}</blockquote>
                      ),
                      table: ({ children }) => (
                        <div style={{ overflow: 'auto', margin: '8px 0' }}>
                          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th style={{ border: '1px solid #e5e7eb', padding: '6px 10px', background: '#f9fafb', fontWeight: 600 }}>{children}</th>,
                      td: ({ children }) => <td style={{ border: '1px solid #e5e7eb', padding: '4px 10px' }}>{children}</td>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>{children}</a>,
                      img: Noop,
                    }}
                  >
                    {msg.content || ''}
                  </ReactMarkdown>
                </div>
              ) : (
                <Text style={{ color: '#fff', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.content}
                </Text>
              )}

              {/* 来源引用（可折叠） */}
              {msg.sources?.length > 0 && (
                <Collapse
                  size="small"
                  ghost
                  items={[{
                    key: 'sources',
                    label: (
                      <Space size={4}>
                        <FileTextOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>引用 {msg.sources.length} 个来源</span>
                      </Space>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {msg.sources.map((s, si) => (
                          <Tag
                            key={si}
                            icon={<CheckCircleOutlined />}
                            color="blue"
                            style={{ fontSize: 11, margin: 0, borderRadius: 6 }}
                          >
                            {s.title || s.sourceFile}
                            <span style={{ opacity: 0.6, marginLeft: 4 }}>
                              {Math.round(s.score * 100)}%
                            </span>
                          </Tag>
                        ))}
                      </div>
                    ),
                  }]}
                  style={{
                    marginTop: 10, paddingTop: 8,
                    borderTop: '1px solid #f0f0f0',
                    background: 'transparent',
                  }}
                />
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />

        {/* 浮动回底按钮 */}
        {showScrollBtn && (
          <Button
            type="primary"
            shape="circle"
            icon={<ArrowDownOutlined />}
            onClick={() => { scrollToBottom(); setShowScrollBtn(false) }}
            style={{
              position: 'sticky', bottom: 12, alignSelf: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              background: '#6366f1', borderColor: '#6366f1',
            }}
          />
        )}
      </div>

      {/* ===== 输入区域 ===== */}
      <div style={{
        padding: '14px 24px 18px',
        flexShrink: 0,
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display: 'flex', alignItems: 'flex-end', gap: 10,
          background: '#f9fafb', borderRadius: 16,
          border: '1px solid #e5e7eb',
          padding: '6px 6px 6px 16px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: input ? '0 0 0 2px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.04)' : 'none',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status?.indexed ? '输入你的问题，Enter 发送，Shift+Enter 换行' : '请先重建索引...'}
            disabled={!status?.indexed}
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit',
              maxHeight: 120, padding: '4px 0',
              color: '#1f2937',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {input.length}
            </Text>
            {loading ? (
              <Button
                type="primary" danger size="small"
                icon={<span style={{ fontSize: 10, fontWeight: 700 }}>■</span>}
                onClick={handleStop}
                style={{ borderRadius: 10, height: 34, minWidth: 60 }}
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary" size="small"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!input.trim() || !status?.indexed}
                style={{
                  borderRadius: 10, height: 34, minWidth: 34,
                  background: input.trim() ? '#6366f1' : '#d1d5db',
                  borderColor: input.trim() ? '#6366f1' : '#d1d5db',
                }}
              />
            )}
          </Space>
        </div>
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {status ? `${status.llmProvider || 'ollama'} · ${status.embedModel || 'nomic-embed-text'}` : '检查连接中...'}
            {status?.indexed ? ` · Top-${status.chunkCount > 5 ? 5 : status.chunkCount}` : ''}
          </Text>
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes rag-fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rag-markdown > *:first-child { margin-top: 0 !important; }
        .rag-markdown > *:last-child { margin-bottom: 0 !important; }
      `}</style>
    </div>
  )
}

export default RagChat
