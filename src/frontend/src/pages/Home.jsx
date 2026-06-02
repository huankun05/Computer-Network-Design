import { Card, Col, Row, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  CloudServerOutlined,
  ApartmentOutlined,
  BookOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

const modules = [
  {
    title: '单项协议原理可视化',
    description: 'DNS 域名解析 · TCP 三次握手与四次挥手',
    icon: <CloudServerOutlined style={{ fontSize: 36, color: '#1890ff' }} />,
    routes: ['/dns', '/tcp'],
    color: '#f0f7ff',
    borderColor: '#1890ff',
    gradient: 'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)',
  },
  {
    title: '综合网络场景模拟',
    description: 'H1 访问 www.abc.com 完整通信过程',
    icon: <ApartmentOutlined style={{ fontSize: 36, color: '#52c41a' }} />,
    routes: ['/scenario'],
    color: '#f6ffed',
    borderColor: '#52c41a',
    gradient: 'linear-gradient(135deg, #f6ffed 0%, #f0fae6 100%)',
  },
  {
    title: '知识体系综合展示',
    description: 'TCP/IP 五层模型 · 知识图谱',
    icon: <BookOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
    routes: ['/knowledge', '/graph'],
    color: '#f9f0ff',
    borderColor: '#722ed1',
    gradient: 'linear-gradient(135deg, #f9f0ff 0%, #f3e8ff 100%)',
  },
]

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #fafbfc 0%, #f0f2f5 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 头部区域 */}
      <div style={{
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        padding: '48px 40px',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <CloudServerOutlined style={{ fontSize: 32, marginRight: 12 }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>NetLab</span>
          </div>
          <Title level={1} style={{ color: '#fff', marginBottom: 8 }}>
            计算机网络知识体系交互式展示系统
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 0 }}>
            基于 TCP/IP 五层模型的计算机网络原理交互式学习系统
          </Paragraph>
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* 功能模块 */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4} style={{ marginBottom: 24 }}>功能模块</Title>
          <Row gutter={[24, 24]}>
            {modules.map((mod) => (
              <Col key={mod.title} xs={24} sm={24} md={8}>
                <Card
                  hoverable
                  style={{
                    background: mod.gradient,
                    borderRadius: 12,
                    border: `1px solid ${mod.borderColor}30`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    height: '100%',
                  }}
                  onClick={() => navigate(mod.routes[0])}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      background: `${mod.borderColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}>
                      {mod.icon}
                    </div>
                    <Title level={5} style={{ marginBottom: 8, color: '#1f2937' }}>{mod.title}</Title>
                    <Paragraph style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                      {mod.description}
                    </Paragraph>
                    {/* 子功能链接 */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {mod.routes.map((r, idx) => {
                        const getRouteName = (path) => {
                          const nameMap = {
                            '/dns': 'DNS 域名解析',
                            '/tcp': 'TCP 三次握手',
                            '/scenario': '场景模拟',
                            '/knowledge': '知识点管理',
                            '/graph': '知识图谱',
                          }
                          return nameMap[path] || path
                        }
                        return (
                          <a
                            key={r}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(r)
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              background: '#fff',
                              borderRadius: 6,
                              color: mod.borderColor,
                              fontSize: 12,
                              border: `1px solid ${mod.borderColor}30`,
                              transition: 'all 0.2s',
                            }}
                          >
                            {getRouteName(r)}
                            <ArrowRightOutlined style={{ fontSize: 10 }} />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* 特性介绍 */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4} style={{ marginBottom: 24 }}>系统特性</Title>
          <Row gutter={[16, 16]}>
            {[
              { icon: '🎯', title: '协议可视化', desc: '动画演示DNS解析、TCP握手等协议过程' },
              { icon: '🌐', title: '场景模拟', desc: '完整模拟H1访问网站的通信过程' },
              { icon: '📚', title: '知识体系', desc: 'TCP/IP五层模型知识点管理' },
              { icon: '🔗', title: '知识图谱', desc: '交互式网络知识关系图谱' },
            ].map((item) => (
              <Col key={item.title} xs={12} sm={12} md={6}>
                <Card size="small" style={{ textAlign: 'center', height: 120 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{item.desc}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* 底部 */}
      <div style={{
        padding: '16px 24px',
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        color: '#9ca3af',
        fontSize: 12,
      }}>
        中国石油大学（北京）人工智能学院 · 网络实习课程设计 · 2023011624 李焕锟
      </div>
    </div>
  )
}

export default Home
