const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'network.db')

function initDatabase() {
  const db = new Database(DB_PATH)

  // 知识点表 — 按 TCP/IP 五层模型分层存储
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      layer TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 清理可能的历史重复、添加同名唯一约束
  db.exec(`
    DELETE FROM knowledge_points WHERE id NOT IN (
      SELECT MIN(id) FROM knowledge_points GROUP BY layer, title
    )
  `)
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_kp_layer_title ON knowledge_points(layer, title)`)

  // DNS 缓存表
  db.exec(`
    CREATE TABLE IF NOT EXISTS dns_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      ttl INTEGER DEFAULT 3600,
      query_type TEXT DEFAULT 'A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `)

  // DNS 查询历史
  db.exec(`
    CREATE TABLE IF NOT EXISTS dns_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      result_ip TEXT,
      query_steps TEXT,
      cache_hit INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 用户收藏表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_point_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(knowledge_point_id)
    )
  `)

  // 插入种子数据 — 五层模型基础知识点
  const insert = db.prepare(`
    INSERT OR IGNORE INTO knowledge_points (layer, category, title, description)
    VALUES (?, ?, ?, ?)
  `)

  const seedData = [
    // 应用层
    ['应用层', '协议', 'HTTP', '超文本传输协议，用于 Web 浏览器与服务器之间的通信，默认端口 80（HTTPS 为 443）'],
    ['应用层', '协议', 'FTP', '文件传输协议，用于客户端与服务器之间的文件传输，使用控制连接（21）和数据连接（20）'],
    ['应用层', '协议', 'DNS', '域名系统，将域名解析为 IP 地址，使用 UDP 53 端口'],
    ['应用层', '协议', 'SMTP', '简单邮件传输协议，用于发送电子邮件，默认端口 25'],
    ['应用层', '协议', 'POP3', '邮局协议版本 3，用于接收电子邮件，默认端口 110'],
    ['应用层', '协议', 'IMAP', '互联网消息访问协议，用于接收邮件，支持在服务器上管理邮件，默认端口 143'],
    // 传输层
    ['传输层', '协议', 'TCP', '传输控制协议，面向连接、可靠的字节流传输，使用三次握手建立连接、四次挥手释放连接'],
    ['传输层', '协议', 'UDP', '用户数据报协议，无连接、不可靠的数据报传输，开销小、速度快'],
    ['传输层', '概念', '三次握手', 'TCP 建立连接的过程：SYN → SYN+ACK → ACK'],
    ['传输层', '概念', '四次挥手', 'TCP 释放连接的过程：FIN → ACK → FIN → ACK'],
    // 网络层
    ['网络层', '协议', 'IP', '网际协议，负责数据包的寻址和路由，IPv4 使用 32 位地址'],
    ['网络层', '协议', 'ICMP', '互联网控制消息协议，用于发送错误报告和操作信息，如 ping 命令'],
    ['网络层', '协议', 'ARP', '地址解析协议，将 IP 地址解析为 MAC 地址'],
    ['网络层', '协议', 'RARP', '反向地址解析协议，将 MAC 地址解析为 IP 地址'],
    ['网络层', '协议', 'OSPF', '开放最短路径优先，链路状态路由协议'],
    // 数据链路层
    ['数据链路层', '协议', '以太网', '最常用的局域网技术，使用 MAC 地址进行帧寻址'],
    ['数据链路层', '协议', 'PPP', '点对点协议，用于直接连接两个节点的链路层协议'],
    ['数据链路层', '概念', 'MAC 地址', '介质访问控制地址，48 位，全球唯一标识网络设备'],
    ['数据链路层', '概念', '交换机', '工作在数据链路层，根据 MAC 地址表进行帧转发'],
    // 物理层
    ['物理层', '技术', '双绞线', '最常用的有线传输介质，分为屏蔽和非屏蔽两类'],
    ['物理层', '技术', '光纤', '利用光的全反射传输数据，带宽高、抗干扰强'],
    ['物理层', '技术', '无线通信', '使用电磁波传输数据，如 Wi-Fi（IEEE 802.11）'],
    ['物理层', '设备', '集线器', '工作在物理层，将信号广播到所有端口'],
    ['物理层', '设备', '中继器', '工作在物理层，放大和整形信号以延长传输距离'],
  ]

  const insertMany = db.transaction((data) => {
    for (const row of data) {
      insert.run(...row)
    }
  })

  insertMany(seedData)
  console.log(`数据库初始化完成，插入 ${seedData.length} 条知识点`)

  db.close()
}

initDatabase()
