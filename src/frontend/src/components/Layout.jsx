import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  CloudServerOutlined,
  GlobalOutlined,
  ApiOutlined,
  ApartmentOutlined,
  BookOutlined,
  BranchesOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  CodeOutlined,
  BugOutlined,
} from '@ant-design/icons'

// 左侧导航 - 大类分组
const sideNavGroups = [
  {
    title: '协议可视化',
    items: [
      { key: '/dns', label: 'DNS 域名解析', icon: <GlobalOutlined /> },
      { key: '/tcp', label: 'TCP 三次握手', icon: <ApiOutlined /> },
    ],
  },
  {
    title: '综合场景',
    items: [
      { key: '/scenario', label: '场景模拟', icon: <ApartmentOutlined /> },
    ],
  },
  {
    title: '协议工具',
    items: [
      { key: '/packet', label: '数据包解析', icon: <CodeOutlined /> },
      { key: '/fault', label: '故障模拟', icon: <BugOutlined /> },
    ],
  },
  {
    title: '知识体系',
    items: [
      { key: '/knowledge', label: '知识点管理', icon: <BookOutlined /> },
      { key: '/graph', label: '知识图谱', icon: <BranchesOutlined /> },
      { key: '/chat', label: 'AI 问答', icon: <RobotOutlined /> },
    ],
  },
]

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  // 获取当前所在的大类
  const getCurrentGroup = () => {
    for (const group of sideNavGroups) {
      if (group.items.some(item => item.key === location.pathname)) {
        return group.title
      }
    }
    return '首页'
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#f5f7fa',
      overflow: 'hidden',
    }}>
      {/* ========== 左侧导航栏 ========== */}
      <aside style={{
        width: collapsed ? 64 : 200,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        flexShrink: 0,
      }}>
        {/* Logo 区域 */}
        <div style={{
          height: 56,
          padding: collapsed ? '0' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid #e5e7eb',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
        >
          <CloudServerOutlined style={{ fontSize: 22, color: '#1890ff' }} />
          {!collapsed && (
            <span style={{
              marginLeft: 10,
              fontSize: 16,
              fontWeight: 700,
              color: '#1890ff',
            }}>
              NetLab
            </span>
          )}
        </div>

        {/* 折叠按钮 */}
        <div style={{
          padding: collapsed ? '10px 0' : '10px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{getCurrentGroup()}</span>
          )}
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 14,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {sideNavGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* 分组标题 */}
              {!collapsed && (
                <div style={{
                  padding: '10px 16px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {group.title}
                </div>
              )}
              {/* 分组项 */}
              {group.items.map(item => (
                <a
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '10px 0' : '10px 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: location.pathname === item.key ? '#1890ff' : '#6b7280',
                    background: location.pathname === item.key ? '#e6f7ff' : 'transparent',
                    borderLeft: location.pathname === item.key ? '3px solid #1890ff' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* 底部状态 */}
        {!collapsed && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: 10,
            color: '#9ca3af',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              系统运行正常
            </div>
          </div>
        )}
      </aside>

      {/* ========== 主内容区域 ========== */}
      <main style={{
        flex: 1,
        overflow: 'hidden',
        background: '#f5f7fa',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
