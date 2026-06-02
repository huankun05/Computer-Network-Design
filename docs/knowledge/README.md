# 计算机网络知识文档库

本目录包含项目所需的所有计算机网络知识文档，按 TCP/IP 五层模型组织。

## 目录结构

```
docs/knowledge/
├── README.md              # 本文件（索引）
├── 01-应用层/
│   ├── README.md          # 应用层概览（协议列表、端口号）
│   ├── http.md            # HTTP 协议详解
│   ├── dns.md             # DNS 协议详解
│   ├── ftp.md             # FTP 协议详解
│   └── smtp-pop3-imap.md  # 邮件协议详解
├── 02-传输层/
│   ├── README.md          # 传输层概览
│   ├── tcp.md             # TCP 协议详解（含三次握手/四次挥手）
│   └── udp.md             # UDP 协议详解
├── 03-网络层/
│   ├── README.md          # 网络层概览
│   ├── ip.md              # IP 协议详解
│   ├── arp.md             # ARP 协议详解
│   └── routing.md         # 路由协议详解
├── 04-数据链路层/
│   ├── README.md          # 数据链路层概览
│   ├── ethernet.md        # 以太网详解
│   └── switch.md          # 交换机工作原理
├── 05-物理层/
│   ├── README.md          # 物理层概览
│   ├── media.md           # 传输介质详解
│   └── devices.md         # 物理层设备详解
└── 06-综合场景/
    └── scenario.md        # H1 访问 www.abc.com 完整步骤拆解
```

## 使用说明

### 用于知识库（模块三）
- 每个层的 `README.md` 包含该层的概览信息
- 详细文档（.md 文件）包含具体的知识点内容
- 可以直接从这些文档提取数据填充到数据库的 knowledge_points 表

### 用于协议可视化（模块一）
- `01-应用层/dns.md` → DNS 可视化的协议原理
- `02-传输层/tcp.md` → TCP 可视化的协议原理（含三次握手/四次挥手）

### 用于综合场景模拟（模块二）
- `06-综合场景/scenario.md` → H1 访问 www.abc.com 的完整步骤拆解
- `03-网络层/arp.md` → ARP 协议原理
- `04-数据链路层/switch.md` → 交换机工作原理
