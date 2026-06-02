import { useState, useEffect, useCallback, useRef } from 'react'
import { Typography, Button, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import DnsTopology from '../components/DnsTopology'
import StepInfoPanel from '../components/StepInfoPanel'
import StepControls from '../components/StepControls'
import DnsCacheTable from '../components/DnsCacheTable'
import { DNS_STEPS, CACHE_HIT_STEPS } from '../data/dnsSteps'

const { Title } = Typography

// localStorage 持久化 key
const STORAGE_KEY_STEP = 'dns_current_step'
const STORAGE_KEY_DOMAIN = 'dns_domain'

// 默认示例网址
const DEFAULT_DOMAIN = 'www.example.com'

function DnsVisual() {
  const navigate = useNavigate()

  // 从 localStorage 恢复状态
  const savedStep = parseInt(localStorage.getItem(STORAGE_KEY_STEP) || '-1', 10)
  const savedDomain = localStorage.getItem(STORAGE_KEY_DOMAIN) || DEFAULT_DOMAIN

  const [domain, setDomain] = useState(savedDomain)
  const [currentStepIndex, setCurrentStepIndex] = useState(
    isNaN(savedStep) ? -1 : savedStep
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0)
  const [dnsCache, setDnsCache] = useState([]) // 本地缓存模拟
  const [isCacheHit, setIsCacheHit] = useState(false) // 是否缓存命中
  const [resolvedSteps, setResolvedSteps] = useState(null) // 动态生成的步骤
  const timerRef = useRef(null)

  // 根据是否缓存命中选择步骤
  const steps = resolvedSteps || (isCacheHit ? CACHE_HIT_STEPS : DNS_STEPS)
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null
  const totalSteps = steps.length

  // 生成动态DNS解析步骤（13步）
  const generateDnsSteps = (domainName, resolvedIp, isSimulated = false) => {
    const simLabel = isSimulated ? ' ⚠️模拟解析' : ''
    return [
      {
        id: 1,
        name: '检查本地 DNS 缓存',
        from: 'client', to: 'client',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: '192.168.1.2', dstIp: null,
        description: `用户在浏览器输入 ${domainName}，客户端首先检查本地 DNS 缓存，发现没有该域名的解析记录，缓存未命中。`,
        deviceStates: { client: { status: '检查缓存...', color: '#faad14' }, dnsServer: { status: '空闲', color: '#d9d9d9' } },
        cacheUpdate: null, pathHighlight: null,
      },
      {
        id: 2,
        name: '构造 DNS 查询报文',
        from: 'client', to: 'client',
        protocol: 'DNS', broadcast: false,
        srcMac: '00-11-22-33-44-cc', dstMac: '00-11-22-33-44-bb',
        srcIp: '192.168.1.2', dstIp: '192.168.1.126',
        description: `客户端构造 DNS 查询报文（查询类型 A，查询名称 ${domainName}），准备发送给本地 DNS 服务器。`,
        deviceStates: { client: { status: '构造报文', color: '#1890ff' }, dnsServer: { status: '空闲', color: '#d9d9d9' } },
        cacheUpdate: null, pathHighlight: null,
      },
      {
        id: 3,
        name: '发送 DNS 查询',
        from: 'client', to: 'dnsServer',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '00-11-22-33-44-cc', dstMac: '00-11-22-33-44-bb',
        srcIp: '192.168.1.2', dstIp: '192.168.1.126',
        description: '客户端将 DNS 查询报文封装成 UDP 数据报，通过以太网帧发送给本地 DNS 服务器。',
        deviceStates: { client: { status: '发送查询', color: '#1890ff' }, dnsServer: { status: '接收请求', color: '#faad14' } },
        cacheUpdate: null, pathHighlight: ['client', 'dnsServer'],
      },
      {
        id: 4,
        name: 'DNS 服务器查询缓存',
        from: 'dnsServer', to: 'dnsServer',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: null, dstIp: null,
        description: 'DNS 服务器收到查询请求后，首先检查自身缓存。缓存未命中，需要进行递归查询。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '查询缓存...', color: '#faad14' } },
        cacheUpdate: null, pathHighlight: null,
      },
      // 步骤5-6：向根域名服务器查询（发送+返回）
      {
        id: 5,
        name: '向根域名服务器发送查询',
        from: 'dnsServer', to: 'rootDns',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '00-11-22-33-44-bb', dstMac: '--:--:--:--:--:--',
        srcIp: '192.168.1.126', dstIp: '198.41.0.4',
        description: 'DNS 服务器向根域名服务器发送迭代查询请求。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '查询根DNS', color: '#fa8c16' } },
        cacheUpdate: null, pathHighlight: ['dnsServer', 'rootDns'],
      },
      {
        id: 6,
        name: '根域名服务器返回结果',
        from: 'rootDns', to: 'dnsServer',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '--:--:--:--:--:--', dstMac: '00-11-22-33-44-bb',
        srcIp: '198.41.0.4', dstIp: '192.168.1.126',
        description: '根域名服务器返回 .com 顶级域名服务器的地址。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '接收TLD地址', color: '#fa8c16' }, rootDns: { status: '已响应', color: '#fa8c16' } },
        cacheUpdate: null, pathHighlight: ['rootDns', 'dnsServer'],
      },
      // 步骤7-8：向顶级域名服务器查询（发送+返回）
      {
        id: 7,
        name: '向顶级域名服务器发送查询',
        from: 'dnsServer', to: 'tldDns',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '00-11-22-33-44-bb', dstMac: '--:--:--:--:--:--',
        srcIp: '192.168.1.126', dstIp: '192.5.6.30',
        description: 'DNS 服务器向 .com 顶级域名服务器发送查询请求。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '查询TLD', color: '#722ed1' } },
        cacheUpdate: null, pathHighlight: ['dnsServer', 'tldDns'],
      },
      {
        id: 8,
        name: '顶级域名服务器返回结果',
        from: 'tldDns', to: 'dnsServer',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '--:--:--:--:--:--', dstMac: '00-11-22-33-44-bb',
        srcIp: '192.5.6.30', dstIp: '192.168.1.126',
        description: 'TLD 服务器返回权威域名服务器地址。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '接收权威地址', color: '#722ed1' }, tldDns: { status: '已响应', color: '#722ed1' } },
        cacheUpdate: null, pathHighlight: ['tldDns', 'dnsServer'],
      },
      // 步骤9-10：向权威域名服务器查询（发送+返回）
      {
        id: 9,
        name: '向权威域名服务器发送查询',
        from: 'dnsServer', to: 'authDns',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '00-11-22-33-44-bb', dstMac: '--:--:--:--:--',
        srcIp: '192.168.1.126', dstIp: '93.184.216.34',
        description: 'DNS 服务器向权威域名服务器发送查询请求。',
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '查询权威DNS', color: '#eb2f96' } },
        cacheUpdate: null, pathHighlight: ['dnsServer', 'authDns'],
      },
      {
        id: 10,
        name: '权威域名服务器返回结果',
        from: 'authDns', to: 'dnsServer',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '--:--:--:--:--', dstMac: '00-11-22-33-44-bb',
        srcIp: '93.184.216.34', dstIp: '192.168.1.126',
        description: `权威服务器返回 ${domainName} 对应的 IP 地址：${resolvedIp}。`,
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '接收IP地址', color: '#eb2f96' }, authDns: { status: '已响应', color: '#eb2f96' } },
        cacheUpdate: null, pathHighlight: ['authDns', 'dnsServer'],
      },
      // 步骤11-13：缓存和返回
      {
        id: 11,
        name: 'DNS 服务器缓存结果',
        from: 'dnsServer', to: 'dnsServer',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: null, dstIp: null,
        description: `DNS 服务器将解析结果 ${domainName} → ${resolvedIp} 写入本地缓存（TTL=3600秒）。`,
        deviceStates: { client: { status: '等待响应', color: '#d9d9d9' }, dnsServer: { status: '缓存结果', color: '#52c41a' } },
        cacheUpdate: { domain: domainName, ip: resolvedIp, ttl: 3600, isSimulated }, pathHighlight: null,
      },
      {
        id: 12,
        name: '返回 DNS 响应给客户端',
        from: 'dnsServer', to: 'client',
        protocol: 'DNS (UDP 53)', broadcast: false,
        srcMac: '00-11-22-33-44-bb', dstMac: '00-11-22-33-44-cc',
        srcIp: '192.168.1.126', dstIp: '192.168.1.2',
        description: `DNS 服务器将解析结果通过 UDP 响应返回给客户端。响应包含 ${domainName} → ${resolvedIp}。`,
        deviceStates: { client: { status: '接收响应', color: '#52c41a' }, dnsServer: { status: '发送响应', color: '#52c41a' } },
        cacheUpdate: null, pathHighlight: ['dnsServer', 'client'],
      },
      {
        id: 13,
        name: '客户端缓存结果',
        from: 'client', to: 'client',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: null, dstIp: null,
        description: `客户端收到 DNS 响应，将 ${domainName} → ${resolvedIp}${simLabel} 写入本地 DNS 缓存。后续查询可直接从缓存获取。`,
        deviceStates: { client: { status: '解析完成 ✓', color: '#52c41a' }, dnsServer: { status: '空闲', color: '#d9d9d9' } },
        cacheUpdate: { domain: domainName, ip: resolvedIp, ttl: 3600, location: 'client', isSimulated }, pathHighlight: null,
      },
    ]
  }

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STEP, currentStepIndex.toString())
  }, [currentStepIndex])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DOMAIN, domain)
  }, [domain])

  // 保存 DNS 缓存到后端
  const saveDnsCache = async (d, ip, ttl) => {
    try {
      await fetch('/api/dns/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, ip_address: ip, ttl }),
      })
      setCacheRefreshTrigger((t) => t + 1)
    } catch {
      // 后端未启动时静默失败
    }
  }

  // 保存查询历史
  const saveDnsHistory = async (d, ip, cacheHit) => {
    try {
      await fetch('/api/dns/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: d, result_ip: ip, cache_hit: cacheHit }),
      })
    } catch {
      // 静默
    }
  }

  // 动画完成回调
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false)

    // 处理缓存更新步骤 - 在步骤11（服务器缓存）时就保存
    if (currentStep?.cacheUpdate) {
      const { domain: d, ip, isSimulated } = currentStep.cacheUpdate
      // 添加到本地缓存（立即生效）
      setDnsCache((prev) => {
        const exists = prev.find((c) => c.domain === d)
        if (exists) {
          // 如果已存在，更新IP
          return prev.map(c => c.domain === d ? { ...c, ip, isSimulated } : c)
        }
        return [...prev, { domain: d, ip, ttl: 3600, time: new Date().toLocaleTimeString(), isSimulated }]
      })
      // 保存到后端
      saveDnsCache(d, ip, 3600)
      console.log(`DNS 缓存已保存: ${d} → ${ip}`)
    }

    // 自动播放模式：延迟后自动下一步
    if (isPlaying && currentStepIndex < totalSteps - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
        setIsAnimating(true)
      }, 1000) // 步骤间间隔 1 秒
    } else if (isPlaying && currentStepIndex >= totalSteps - 1) {
      // 播放完毕
      setIsPlaying(false)
      message.success('DNS 解析完成！')
      // 保存历史
      const resultIp = steps[currentStepIndex]?.cacheUpdate?.ip || '93.184.216.34'
      saveDnsHistory(domain, resultIp, false)
    }
  }, [currentStep, currentStepIndex, isPlaying, domain, totalSteps, steps])

  // 开始解析（仅在未开始或重置后调用）
  const handleStart = () => {
    if (!domain.trim()) {
      message.warning('请输入域名')
      return
    }

    const inputDomain = domain.trim()

    // 检查本地缓存是否命中
    const cached = dnsCache.find((c) => c.domain === inputDomain)
    if (cached) {
      setIsCacheHit(true)
      // 缓存命中时，生成简化的2步流程
      const cacheHitSteps = generateCacheHitSteps(inputDomain, cached.ip)
      setResolvedSteps(cacheHitSteps)
      message.success(`DNS 缓存命中！${inputDomain} → ${cached.ip}`)
    } else {
      // DNS解析 - 使用哈希算法生成确定性IP
      const resolvedIp = generateDeterministicIp(inputDomain)
      console.log(`DNS 解析: ${inputDomain} → ${resolvedIp} (哈希生成)`)

      // 生成动态步骤（所有域名都显示为模拟解析）
      const newSteps = generateDnsSteps(inputDomain, resolvedIp, true)
      setResolvedSteps(newSteps)
      setIsCacheHit(false)
      message.info(`开始解析 ${inputDomain}...`)
    }

    setCurrentStepIndex(0)
    setIsPlaying(true)
    setIsAnimating(true)
  }

  // 生成缓存命中的简化步骤
  const generateCacheHitSteps = (domainName, cachedIp) => {
    return [
      {
        id: 1,
        name: '检查本地 DNS 缓存',
        from: 'client', to: 'client',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: '192.168.1.2', dstIp: null,
        description: `客户端检查本地 DNS 缓存，发现 ${domainName} 的解析记录，缓存命中！`,
        deviceStates: { client: { status: '缓存命中 ✓', color: '#52c41a' }, dnsServer: { status: '空闲', color: '#d9d9d9' } },
        cacheUpdate: null, pathHighlight: null,
      },
      {
        id: 2,
        name: '直接使用缓存的 IP 地址',
        from: 'client', to: 'client',
        protocol: null, broadcast: null, srcMac: null, dstMac: null,
        srcIp: null, dstIp: null,
        description: `客户端直接从缓存获取 IP 地址 ${cachedIp}，无需向 DNS 服务器查询。`,
        deviceStates: { client: { status: '解析完成 ✓', color: '#52c41a' }, dnsServer: { status: '空闲', color: '#d9d9d9' } },
        cacheUpdate: null, pathHighlight: null,
      },
    ]
  }

  // 继续播放（暂停后调用）
  const handleContinue = () => {
    setIsPlaying(true)
    setIsAnimating(true)
  }

  // 哈希函数：将字符串转换为数字
  const hashString = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  }

  // 生成确定性IP（基于域名哈希）
  const generateDeterministicIp = (domain) => {
    // 使用哈希生成确定性伪随机IP
    const hash = hashString(domain)
    const a = (hash >> 24) & 0xFF
    const b = (hash >> 16) & 0xFF
    const c = (hash >> 8) & 0xFF
    const d = hash & 0xFF
    // 确保第一段在1-223之间（有效IP范围）
    return `${(a % 223) + 1}.${b}.${c}.${d}`
  }

  // 暂停/继续
  const handlePause = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsPlaying(false)
  }

  // 下一步（如果未开始，先生成步骤，不自动播放）
  const handleNext = () => {
    // 如果未开始解析，先生成步骤
    if (currentStepIndex < 0 && !resolvedSteps) {
      if (!domain.trim()) {
        message.warning('请先输入域名')
        return
      }
      const inputDomain = domain.trim()
      const cached = dnsCache.find((c) => c.domain === inputDomain)
      if (cached) {
        setIsCacheHit(true)
        const cacheHitSteps = generateCacheHitSteps(inputDomain, cached.ip)
        setResolvedSteps(cacheHitSteps)
      } else {
        const resolvedIp = generateDeterministicIp(inputDomain)
        const newSteps = generateDnsSteps(inputDomain, resolvedIp, true)
        setResolvedSteps(newSteps)
        setIsCacheHit(false)
      }
      setCurrentStepIndex(0)
      setIsAnimating(true)
      // 下一步不自动播放，只显示当前步骤
      return
    }

    // 如果已经有步骤，继续下一步
    if (currentStepIndex < totalSteps - 1) {
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
    setCurrentStepIndex(-1)
    setIsPlaying(false)
    setIsAnimating(false)
    setIsCacheHit(false)
    setResolvedSteps(null)
    // 注意：不清空 dnsCache，保留缓存记录
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
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, color: '#1f2937' }}>DNS 域名解析可视化</Title>
      </div>

      {/* 主体区域：拓扑图 + 信息面板 */}
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0, marginBottom: 8 }}>
        {/* 拓扑图 */}
        <div style={{
          flex: 2,
          background: '#fff',
          borderRadius: 8,
          padding: 8,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <DnsTopology
            currentStep={currentStep}
            isAnimating={isAnimating}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>

        {/* 右侧信息面板 */}
        <div style={{ width: 320, flexShrink: 0, overflow: 'auto' }}>
          <StepInfoPanel currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </div>

      {/* 步骤时间轴 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: '10px 16px',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {steps.map((step, idx) => (
          <div
            key={step.id}
            onClick={() => {
              if (!isPlaying) {
                setCurrentStepIndex(idx)
                setIsAnimating(false)
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
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: idx === currentStepIndex ? '#fff' :
                     idx < currentStepIndex ? '#1890ff' : '#9ca3af',
              background: idx === currentStepIndex ? '#1890ff' :
                          idx < currentStepIndex ? '#e6f7ff' : '#f3f4f6',
              border: idx === currentStepIndex ? '2px solid #1890ff' : 'none',
              transition: 'all 0.3s',
            }}>
              {idx < currentStepIndex ? '✓' : idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div style={{
                width: 40,
                height: 2,
                background: idx < currentStepIndex ? '#1890ff' : '#e5e7eb',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
        <span style={{ marginLeft: 16, fontSize: 12, color: '#859398', whiteSpace: 'nowrap' }}>
          步骤 {currentStepIndex >= 0 ? currentStepIndex + 1 : '-'} / {totalSteps}
        </span>
      </div>

      {/* 控制按钮 */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <StepControls
          domain={domain}
          onDomainChange={setDomain}
          onStart={handleStart}
          onPause={handlePause}
          onContinue={handleContinue}
          onNext={handleNext}
          onPrev={handlePrev}
          onReset={handleReset}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          isPlaying={isPlaying}
        />
      </div>

      {/* DNS 缓存表 */}
      <div style={{ flexShrink: 0, maxHeight: 150, overflow: 'auto' }}>
        <DnsCacheTable
          refreshTrigger={cacheRefreshTrigger}
          frontendCache={dnsCache}
          onClearFrontendCache={() => setDnsCache([])}
        />
      </div>
    </div>
  )
}

export default DnsVisual
