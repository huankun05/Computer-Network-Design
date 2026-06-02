/**
 * 综合网络场景模拟 - H1 访问 www.abc.com 通信步骤
 *
 * 拓扑关键事实：H1 (192.168.1.2/25) 与 DNS 服务器 (192.168.1.126/25)
 * 同属 192.168.1.0/25 网段，通信不需经过网关。
 * Web 服务器在 Internet 中（不同网段），需经网关 R 转发。
 */

// 设备定义
export const DEVICES = {
  h1: {
    id: 'h1',
    name: 'H1',
    ip: '192.168.1.2/25',
    mac: '00-11-22-33-44-cc',
    subnet: '192.168.1.0/25',
    x: 80,
    y: 280,
    color: '#1890ff',
  },
  h2: {
    id: 'h2',
    name: 'H2',
    ip: '192.168.1.3/25',
    mac: '00-11-22-33-44-dd',
    subnet: '192.168.1.0/25',
    x: 80,
    y: 180,
    color: '#722ed1',
  },
  dns: {
    id: 'dns',
    name: 'DNS服务器',
    ip: '192.168.1.126/25',
    mac: '00-11-22-33-44-bb',
    subnet: '192.168.1.0/25',
    x: 80,
    y: 80,
    color: '#52c41a',
  },
  switch: {
    id: 'switch',
    name: '交换机 S',
    ip: null,
    mac: null,
    x: 280,
    y: 180,
    color: '#fa8c16',
  },
  router: {
    id: 'router',
    name: '路由器 R',
    ip: '192.168.1.1/25',
    mac: '00-11-22-33-44-aa',
    x: 430,
    y: 180,
    color: '#f5222d',
  },
  web: {
    id: 'web',
    name: 'Web服务器',
    ip: '93.184.216.34',
    mac: '00-11-22-33-44-ee',
    x: 580,
    y: 180,
    color: '#eb2f96',
  },
}

// 连线定义（端口号按 PDF 规定：H1→端口4, H2→端口3, DNS→端口1, Router→端口2）
export const LINKS = [
  { from: 'h1', to: 'switch', label: '端口4' },
  { from: 'h2', to: 'switch', label: '端口3' },
  { from: 'dns', to: 'switch', label: '端口1' },
  { from: 'switch', to: 'router', label: '端口2' },
  { from: 'router', to: 'web', label: 'Internet' },
]

// 通信步骤（13 步，5 个阶段）
export const SCENARIO_STEPS = [
  // ================================================================
  // 阶段1：DNS 解析准备（同网段，直连 DNS 服务器）
  // ================================================================

  {
    id: 1,
    name: '检查本地DNS缓存',
    from: 'h1',
    to: 'h1',
    protocol: null,
    broadcast: null,
    srcMac: null,
    dstMac: null,
    srcIp: null,
    dstIp: null,
    description:
      'H1 要访问 www.abc.com，先检查本地 DNS 缓存。缓存为空，未命中，需要进行 DNS 解析。',
    switchAction: null,
    switchTable: {},
    arpTable: {},
    pathHighlight: null,
  },
  {
    id: 2,
    name: 'ARP请求DNS服务器MAC',
    from: 'h1',
    to: 'switch',
    protocol: 'ARP',
    broadcast: true,
    srcMac: '00-11-22-33-44-cc',
    dstMac: 'FF-FF-FF-FF-FF-FF',
    srcIp: '192.168.1.2',
    dstIp: '192.168.1.126',
    description:
      'DNS 服务器与 H1 在同一网段（192.168.1.0/25），H1 直接广播 ARP 请求查询 DNS 服务器的 MAC 地址。',
    switchAction: '学习源MAC (cc→端口4)，未知目的MAC，从端口1,2,3泛洪',
    switchTable: { '00-11-22-33-44-cc': '端口4' },
    arpTable: {},
    pathHighlight: ['h1', 'switch'],
  },
  {
    id: 3,
    name: 'DNS服务器回复ARP',
    from: 'dns',
    to: 'h1',
    protocol: 'ARP',
    broadcast: false,
    srcMac: '00-11-22-33-44-bb',
    dstMac: '00-11-22-33-44-cc',
    srcIp: '192.168.1.126',
    dstIp: '192.168.1.2',
    description:
      'DNS 服务器收到 ARP 请求，回复自己的 MAC 地址。H1 将 DNS 服务器的 IP-MAC 映射写入 ARP 表。',
    switchAction: '学习源MAC (bb→端口1)，查表cc在端口4，定向转发到端口4',
    switchTable: { '00-11-22-33-44-cc': '端口4', '00-11-22-33-44-bb': '端口1' },
    arpTable: { '192.168.1.126': '00-11-22-33-44-bb' },
    pathHighlight: ['dns', 'switch', 'h1'],
  },

  // ================================================================
  // 阶段2：DNS 查询与响应（同网段直连，不经网关）
  // ================================================================

  {
    id: 4,
    name: 'DNS查询请求',
    from: 'h1',
    to: 'dns',
    protocol: 'DNS (UDP)',
    broadcast: false,
    srcMac: '00-11-22-33-44-cc',
    dstMac: '00-11-22-33-44-bb',
    srcIp: '192.168.1.2',
    dstIp: '192.168.1.126',
    description:
      'H1 构造 DNS 查询报文（目标端口 53），封装成帧后经交换机直接发往 DNS 服务器（同网段，不走网关）。',
    switchAction: '查表bb在端口1、cc在端口4，定向转发端口4→端口1',
    switchTable: { '00-11-22-33-44-cc': '端口4', '00-11-22-33-44-bb': '端口1' },
    arpTable: { '192.168.1.126': '00-11-22-33-44-bb' },
    pathHighlight: ['h1', 'switch', 'dns'],
  },
  {
    id: 5,
    name: 'DNS服务器处理查询',
    from: 'dns',
    to: 'dns',
    protocol: null,
    broadcast: null,
    srcMac: null,
    dstMac: null,
    srcIp: null,
    dstIp: null,
    description:
      'DNS 服务器收到查询，查找 www.abc.com 的 A 记录，解析结果为 93.184.216.34。',
    switchAction: null,
    switchTable: { '00-11-22-33-44-cc': '端口4', '00-11-22-33-44-bb': '端口1' },
    arpTable: { '192.168.1.126': '00-11-22-33-44-bb' },
    pathHighlight: null,
  },
  {
    id: 6,
    name: 'DNS响应返回',
    from: 'dns',
    to: 'h1',
    protocol: 'DNS (UDP)',
    broadcast: false,
    srcMac: '00-11-22-33-44-bb',
    dstMac: '00-11-22-33-44-cc',
    srcIp: '192.168.1.126',
    dstIp: '192.168.1.2',
    description:
      'DNS 服务器返回响应：www.abc.com → 93.184.216.34。H1 获得 Web 服务器的 IP 地址。',
    switchAction: '查表cc在端口4，定向转发端口1→端口4',
    switchTable: { '00-11-22-33-44-cc': '端口4', '00-11-22-33-44-bb': '端口1' },
    arpTable: { '192.168.1.126': '00-11-22-33-44-bb' },
    pathHighlight: ['dns', 'switch', 'h1'],
  },

  // ================================================================
  // 阶段3：获取网关 MAC（Web 服务器在不同网段，需经网关）
  // ================================================================

  {
    id: 7,
    name: 'ARP请求网关MAC',
    from: 'h1',
    to: 'switch',
    protocol: 'ARP',
    broadcast: true,
    srcMac: '00-11-22-33-44-cc',
    dstMac: 'FF-FF-FF-FF-FF-FF',
    srcIp: '192.168.1.2',
    dstIp: '192.168.1.1',
    description:
      'H1 已知 Web 服务器的 IP (93.184.216.34) 不在本地子网，需经默认网关转发。广播 ARP 请求网关（路由器 R）的 MAC 地址。',
    switchAction: 'H1 MAC已学习，目的MAC为广播地址，从端口1,2,3泛洪',
    switchTable: { '00-11-22-33-44-cc': '端口4', '00-11-22-33-44-bb': '端口1' },
    arpTable: { '192.168.1.126': '00-11-22-33-44-bb' },
    pathHighlight: ['h1', 'switch'],
  },
  {
    id: 8,
    name: '网关回复ARP',
    from: 'router',
    to: 'h1',
    protocol: 'ARP',
    broadcast: false,
    srcMac: '00-11-22-33-44-aa',
    dstMac: '00-11-22-33-44-cc',
    srcIp: '192.168.1.1',
    dstIp: '192.168.1.2',
    description:
      '路由器 R 收到 ARP 请求，回复自己的 MAC 地址。H1 将网关的 IP-MAC 映射写入 ARP 表。至此 H1 的 ARP 表有 DNS 服务器和网关两条记录。',
    switchAction: '学习源MAC (aa→端口2)，查表cc在端口4，定向转发端口2→端口4',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['router', 'switch', 'h1'],
  },

  // ================================================================
  // 阶段4：TCP 三次握手（经网关到达 Web 服务器）
  // ================================================================

  {
    id: 9,
    name: 'TCP SYN - 请求连接',
    from: 'h1',
    to: 'web',
    protocol: 'TCP',
    broadcast: false,
    srcMac: '00-11-22-33-44-cc',
    dstMac: '00-11-22-33-44-aa',
    srcIp: '192.168.1.2',
    dstIp: '93.184.216.34',
    description:
      'H1 构造 TCP SYN 报文（SYN=1, seq=x），帧的目的 MAC 为网关 MAC，经交换机转发到路由器，路由器再经 Internet 发往 Web 服务器。',
    switchAction: '查表aa在端口2，定向转发端口4→端口2',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['h1', 'switch', 'router', 'web'],
  },
  {
    id: 10,
    name: 'TCP SYN+ACK - 确认连接',
    from: 'web',
    to: 'h1',
    protocol: 'TCP',
    broadcast: false,
    srcMac: '00-11-22-33-44-aa',
    dstMac: '00-11-22-33-44-cc',
    srcIp: '93.184.216.34',
    dstIp: '192.168.1.2',
    description:
      'Web 服务器收到 SYN 后回复 SYN+ACK（SYN=1, ACK=1, seq=y, ack=x+1）。路由器经交换机转发到 H1。',
    switchAction: '查表cc在端口4，定向转发端口2→端口4',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['web', 'router', 'switch', 'h1'],
  },
  {
    id: 11,
    name: 'TCP ACK - 连接建立',
    from: 'h1',
    to: 'web',
    protocol: 'TCP',
    broadcast: false,
    srcMac: '00-11-22-33-44-cc',
    dstMac: '00-11-22-33-44-aa',
    srcIp: '192.168.1.2',
    dstIp: '93.184.216.34',
    description:
      'H1 发送 ACK 确认（ACK=1, seq=x+1, ack=y+1）。三次握手完成，TCP 连接建立！',
    switchAction: '定向转发端口4→端口2',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['h1', 'switch', 'router', 'web'],
  },

  // ================================================================
  // 阶段5：HTTP 数据传输
  // ================================================================

  {
    id: 12,
    name: 'HTTP GET 请求',
    from: 'h1',
    to: 'web',
    protocol: 'HTTP',
    broadcast: false,
    srcMac: '00-11-22-33-44-cc',
    dstMac: '00-11-22-33-44-aa',
    srcIp: '192.168.1.2',
    dstIp: '93.184.216.34',
    description:
      'H1 通过已建立的 TCP 连接发送 HTTP GET 请求，获取 www.abc.com 的网页内容。',
    switchAction: '定向转发端口4→端口2',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['h1', 'switch', 'router', 'web'],
  },
  {
    id: 13,
    name: 'HTTP 200 OK 响应',
    from: 'web',
    to: 'h1',
    protocol: 'HTTP',
    broadcast: false,
    srcMac: '00-11-22-33-44-aa',
    dstMac: '00-11-22-33-44-cc',
    srcIp: '93.184.216.34',
    dstIp: '192.168.1.2',
    description:
      'Web 服务器返回 HTTP 200 OK，携带网页内容。H1 浏览器渲染展示 www.abc.com 的页面。通信完成！',
    switchAction: '定向转发端口2→端口4',
    switchTable: {
      '00-11-22-33-44-cc': '端口4',
      '00-11-22-33-44-bb': '端口1',
      '00-11-22-33-44-aa': '端口2',
    },
    arpTable: {
      '192.168.1.126': '00-11-22-33-44-bb',
      '192.168.1.1': '00-11-22-33-44-aa',
    },
    pathHighlight: ['web', 'router', 'switch', 'h1'],
  },
]

// 最终状态
export const FINAL_STATE = {
  h1ArpTable: {
    '192.168.1.126': '00-11-22-33-44-bb',
    '192.168.1.1': '00-11-22-33-44-aa',
  },
  switchTable: {
    '00-11-22-33-44-cc': '端口4',
    '00-11-22-33-44-bb': '端口1',
    '00-11-22-33-44-aa': '端口2',
  },
  conclusion:
    '从 t0 到 t1，H1 成功访问了 www.abc.com。整个过程包括五个阶段：\n' +
    '① DNS 解析准备（检查缓存 → ARP 获取同网段 DNS 服务器 MAC）；\n' +
    '② DNS 查询与响应（同网段直连，不经网关）；\n' +
    '③ 获取网关 MAC（ARP 请求路由器 MAC，为访问外网 Web 服务器做准备）；\n' +
    '④ TCP 三次握手（经网关与 Web 服务器建立连接）；\n' +
    '⑤ HTTP 请求与响应（获取网页内容）。\n' +
    '交换机 S 通过学习源 MAC 地址逐步建立了完整的 MAC 地址表（3 条记录）。\n' +
    'H1 的 ARP 表包含 DNS 服务器和网关两条 IP-MAC 映射。',
}
