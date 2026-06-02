/**
 * TCP 三次握手与四次挥手步骤定义
 * type: 'protocol' = 协议报文步骤（默认）, 'data' = 数据传送步骤, 'wait' = 等待步骤
 */

// 设备定义
export const DEVICES = {
  client: {
    id: 'client',
    name: '客户端 (Client)',
    ip: '192.168.1.2',
    port: 49152,
    x: 120,
    y: 180,
    color: '#1890ff',
  },
  server: {
    id: 'server',
    name: '服务器 (Server)',
    ip: '93.184.216.34',
    port: 80,
    x: 520,
    y: 180,
    color: '#52c41a',
  },
}

// TCP 状态定义
export const TCP_STATES = {
  CLOSED: { name: 'CLOSED', color: '#8c8c8c' },
  LISTEN: { name: 'LISTEN', color: '#faad14' },
  SYN_SENT: { name: 'SYN-SENT', color: '#1890ff' },
  SYN_RCVD: { name: 'SYN-RCVD', color: '#722ed1' },
  ESTABLISHED: { name: 'ESTABLISHED', color: '#52c41a' },
  FIN_WAIT_1: { name: 'FIN-WAIT-1', color: '#fa8c16' },
  FIN_WAIT_2: { name: 'FIN-WAIT-2', color: '#fa541c' },
  CLOSE_WAIT: { name: 'CLOSE-WAIT', color: '#eb2f96' },
  LAST_ACK: { name: 'LAST-ACK', color: '#f5222d' },
  TIME_WAIT: { name: 'TIME-WAIT', color: '#722ed1' },
}

// ============================================================
// 三次握手步骤（4步：3个协议步骤 + 1个数据传送步骤）
// ============================================================
export const HANDSHAKE_STEPS = [
  {
    id: 1,
    name: '第一步：SYN',
    type: 'protocol',
    phase: 'handshake',
    from: 'client',
    to: 'server',
    protocol: 'TCP',
    flags: 'SYN',
    description: '客户端主动打开，发送 SYN 报文请求建立连接。SYN=1，序号 seq=x。',
    clientState: 'SYN_SENT',
    serverState: 'LISTEN',
    packetInfo: { srcPort: 49152, dstPort: 80, flags: 'SYN', seq: 'x', ack: '-' },
    annotations: { client: '主动打开', server: '被动打开' },
  },
  {
    id: 2,
    name: '第二步：SYN+ACK',
    type: 'protocol',
    phase: 'handshake',
    from: 'server',
    to: 'client',
    protocol: 'TCP',
    flags: 'SYN, ACK',
    description: '服务器被动打开，收到 SYN 后回复 SYN+ACK 报文。SYN=1，ACK=1，序号 seq=y，确认号 ack=x+1。',
    clientState: 'SYN_SENT',
    serverState: 'SYN_RCVD',
    packetInfo: { srcPort: 80, dstPort: 49152, flags: 'SYN, ACK', seq: 'y', ack: 'x+1' },
  },
  {
    id: 3,
    name: '第三步：ACK',
    type: 'protocol',
    phase: 'handshake',
    from: 'client',
    to: 'server',
    protocol: 'TCP',
    flags: 'ACK',
    description: '客户端发送 ACK 报文确认。ACK=1，序号 seq=x+1，确认号 ack=y+1。双方进入 ESTABLISHED 状态。',
    clientState: 'ESTABLISHED',
    serverState: 'ESTABLISHED',
    packetInfo: { srcPort: 49152, dstPort: 80, flags: 'ACK', seq: 'x+1', ack: 'y+1' },
  },
  {
    id: 8,
    name: '数据传送',
    type: 'data',
    dataType: 'bidirectional',
    phase: 'handshake',
    description: 'TCP 连接已建立，双方进入数据传送阶段，可以双向传输数据。',
    clientState: 'ESTABLISHED',
    serverState: 'ESTABLISHED',
  },
]

// ============================================================
// 四次挥手步骤（7步：含2个数据传送 + 1个2MSL等待）
// ============================================================
export const FINSH_STEPS = [
  {
    id: 9,
    name: '数据传送',
    type: 'data',
    dataType: 'bidirectional',
    phase: 'finsh',
    description: '连接处于 ESTABLISHED 状态，双方正在进行数据传送。之后客户端发起主动关闭。',
    clientState: 'ESTABLISHED',
    serverState: 'ESTABLISHED',
  },
  {
    id: 4,
    name: '第一步：FIN',
    type: 'protocol',
    phase: 'finsh',
    from: 'client',
    to: 'server',
    protocol: 'TCP',
    flags: 'FIN, ACK',
    description: '客户端主动关闭，发送 FIN 报文请求释放连接。FIN=1，序号 seq=u。',
    clientState: 'FIN_WAIT_1',
    serverState: 'ESTABLISHED',
    packetInfo: { srcPort: 49152, dstPort: 80, flags: 'FIN, ACK', seq: 'u', ack: '-' },
    annotations: { client: '主动关闭' },
  },
  {
    id: 5,
    name: '第二步：ACK',
    type: 'protocol',
    phase: 'finsh',
    from: 'server',
    to: 'client',
    protocol: 'TCP',
    flags: 'ACK',
    description: '服务器收到 FIN 后，通知应用进程，回复 ACK 确认。ACK=1，序号 seq=v，确认号 ack=u+1。',
    clientState: 'FIN_WAIT_2',
    serverState: 'CLOSE_WAIT',
    packetInfo: { srcPort: 80, dstPort: 49152, flags: 'ACK', seq: 'v', ack: 'u+1' },
    annotations: { server: '通知应用进程' },
  },
  {
    id: 10,
    name: '数据传送',
    type: 'data',
    dataType: 'serverToClient',
    phase: 'finsh',
    description: '服务器进入 CLOSE-WAIT 状态，仍可向客户端发送剩余数据（半关闭状态）。',
    clientState: 'FIN_WAIT_2',
    serverState: 'CLOSE_WAIT',
  },
  {
    id: 6,
    name: '第三步：FIN',
    type: 'protocol',
    phase: 'finsh',
    from: 'server',
    to: 'client',
    protocol: 'TCP',
    flags: 'FIN, ACK',
    description: '服务器处理完剩余数据后，发送 FIN 报文同意释放连接。FIN=1，ACK=1，序号 seq=w，确认号 ack=u+1。',
    clientState: 'FIN_WAIT_2',
    serverState: 'LAST_ACK',
    packetInfo: { srcPort: 80, dstPort: 49152, flags: 'FIN, ACK', seq: 'w', ack: 'u+1' },
    annotations: { server: '被动关闭' },
  },
  {
    id: 7,
    name: '第四步：ACK',
    type: 'protocol',
    phase: 'finsh',
    from: 'client',
    to: 'server',
    protocol: 'TCP',
    flags: 'ACK',
    description: '客户端收到 FIN 后，发送 ACK 确认。ACK=1，序号 seq=u+1，确认号 ack=w+1。',
    clientState: 'TIME_WAIT',
    serverState: 'CLOSED',
    packetInfo: { srcPort: 49152, dstPort: 80, flags: 'ACK', seq: 'u+1', ack: 'w+1' },
  },
  {
    id: 11,
    name: '2MSL 等待',
    type: 'wait',
    phase: 'finsh',
    description: '客户端进入 TIME-WAIT 状态，等待 2MSL（最大报文段寿命的两倍）后关闭连接。确保最后的 ACK 能到达服务器，并防止旧连接的报文干扰新连接。',
    clientState: 'TIME_WAIT',
    serverState: 'CLOSED',
  },
]

// 所有步骤
export const ALL_STEPS = [...HANDSHAKE_STEPS, ...FINSH_STEPS]
