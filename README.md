# 计算机网络知识体系交互式展示系统

> 基于 TCP/IP 五层模型的计算机网络原理交互式学习系统

## 项目简介

本系统是一个集**知识展示、原理解析、可视化呈现与交互学习**于一体的计算机网络原理交互式系统。围绕 TCP/IP 五层模型，通过动画演示、步骤切换、路径高亮等交互方式，将抽象的网络协议概念转化为可展示、可交互、可解释的系统内容。

### 主要功能

| 模块 | 功能 | 分值 |
|------|------|------|
| **单项协议可视化** | DNS 域名解析（13步迭代+缓存命中）+ TCP 握手挥手（握手4步+挥手7步，含状态色块条） | 20分 |
| **综合网络场景模拟** | H1 访问 www.abc.com 完整通信过程（13步5阶段，ARP表+交换表分步更新） | 20分 |
| **知识体系展示** | TCP/IP 五层模型知识点管理 + 知识图谱可视化 + RAG 智能问答 | 15分 |
| **附加功能** | 数据包结构解析（5协议交互式）+ 网络故障模拟（3场景SVG动画）+ 协议过程回放 + AI 问答 | +4~5分 |

## 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| 前端框架 | React | 19.x |
| 构建工具 | Vite | 8.x |
| UI组件库 | Ant Design | 6.x |
| 路由 | React Router | 7.x |
| 可视化 | SVG + ECharts | - |
| 后端 | Node.js + Express | - |
| 数据库 | SQLite (better-sqlite3) | 11.x |

## 环境配置

### 前置要求

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
# 安装前端依赖
cd src/frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 初始化数据库

```bash
cd src/backend
npm run db:init
```

## 启动运行

### 方式一：一键启动（推荐）

```bash
# Windows
双击 start.bat

# 停止服务
双击 stop.bat
```

### 方式二：手动启动

```bash
# 终端1：启动后端（端口 3001）
cd src/backend
npm start

# 终端2：启动前端（端口 5173）
cd src/frontend
npm run dev
```

### 访问地址

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api/health

## 页面结构

| 页面 | 路径 | 功能 |
|------|------|------|
| 首页 | `/` | 模块入口卡片（协议可视化+综合场景+知识体系+协议工具） |
| DNS 可视化 | `/dns` | DNS 域名解析 13 步迭代动画 + 缓存命中 |
| TCP 可视化 | `/tcp` | TCP 三次握手 4 步 + 四次挥手 7 步动画 + 状态色块条 |
| 综合场景模拟 | `/scenario` | H1 访问 www.abc.com 13 步通信（ARP 表+交换表） |
| 数据包解析 | `/packet` | Ethernet/IP/TCP/UDP/HTTP 交互式字节条形图 |
| 故障模拟 | `/fault` | DNS 超时 / ARP 欺骗 / TCP RST 故障场景 |
| 知识体系 | `/knowledge` | TCP/IP 五层模型知识点 CRUD + 模糊搜索 |
| 知识图谱 | `/graph` | 三级力导向图 + 搜索聚焦 + PNG 导出 |
| AI 问答 | `/chat` | RAG 检索增强生成，SSE 流式回答 |

## 数据库设计

### 表结构

| 表名 | 用途 | 说明 |
|------|------|------|
| `knowledge_points` | 知识点存储 | 五层模型知识点，含 25 条种子数据 |
| `dns_cache` | DNS缓存 | 域名解析缓存记录 |
| `dns_history` | DNS历史 | 查询历史记录 |

### API 接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/knowledge` | GET | 查询知识点（支持分层、分页、模糊查询） |
| `/api/knowledge` | POST | 新增知识点 |
| `/api/knowledge/summary` | GET | 全量知识点（供图谱加载，不分页） |
| `/api/knowledge/:id` | PUT | 修改知识点 |
| `/api/knowledge/:id` | DELETE | 删除知识点 |
| `/api/dns/cache` | GET/POST | DNS缓存查询/新增 |
| `/api/dns/history` | GET/POST | DNS历史查询/新增 |
| `/api/chat` | POST | RAG 智能问答（SSE 流式，双 LLM 自动回退） |
| `/api/chat/status` | GET | 向量库状态（文档数/块数/LLM 可用性） |

## 功能截图

> 待添加运行截图

## 许可证

本项目仅用于课程设计学习目的。
