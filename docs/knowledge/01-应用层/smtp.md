# SMTP 协议（简单邮件传输协议）

## 基本信息
| 属性 | 值 |
|------|-----|
| 协议名称 | SMTP（Simple Mail Transfer Protocol） |
| 所属层 | 应用层 |
| 传输层协议 | TCP |
| 默认端口 | 25（非加密）/ 465（SMTPS）/ 587（提交）|
| RFC 文档 | RFC 5321 |

## 协议简介
SMTP 是互联网电子邮件的核心协议，负责将邮件从发送方的邮件客户端传输到接收方的邮件服务器。SMTP 采用**命令-响应**模式，客户端发送命令，服务器返回状态码。

## 邮件传输模型
```
发送方 MUA → 发送方 MSA → 发送方 MTA ──SMTP──→ 接收方 MTA → 接收方 MDA → 接收方 MUA
 (Outlook)   (SMTP提交)   (邮件服务器)          (邮件服务器)              (收件箱)
```

| 组件 | 全称 | 说明 |
|------|------|------|
| MUA | Mail User Agent | 邮件客户端（Outlook、webmail 等） |
| MSA | Mail Submission Agent | 邮件提交代理（587 端口） |
| MTA | Mail Transfer Agent | 邮件传输代理（服务器间传输） |
| MDA | Mail Delivery Agent | 邮件投递代理（存入收件箱） |

## SMTP 命令与响应示例
```
客户端 → 服务器:  EHLO client.example.com
服务器 → 客户端:  250 server.example.com Hello

客户端 → 服务器:  MAIL FROM:<sender@example.com>
服务器 → 客户端:  250 OK

客户端 → 服务器:  RCPT TO:<receiver@example.com>
服务器 → 客户端:  250 OK

客户端 → 服务器:  DATA
服务器 → 客户端:  354 Start mail input

客户端 → 服务器:  Subject: Test
客户端 → 服务器:  Hello World!
客户端 → 服务器:  .

服务器 → 客户端:  250 OK, message accepted

客户端 → 服务器:  QUIT
服务器 → 客户端:  221 Bye
```

## 常用 SMTP 命令
| 命令 | 说明 |
|------|------|
| HELO / EHLO | 开始会话（EHLO 支持扩展） |
| MAIL FROM | 指定发件人地址 |
| RCPT TO | 指定收件人地址 |
| DATA | 开始发送邮件内容 |
| QUIT | 结束会话 |
| RSET | 重置当前事务 |
| VRFY | 验证邮箱地址 |
| AUTH | 认证登录 |

## 邮件格式（MIME）
SMTP 最初只支持 ASCII 文本。MIME（多用途互联网邮件扩展）扩展了对以下内容的支持：
- 非 ASCII 字符（中文、日文等）
- 附件（图片、文档等）
- HTML 格式邮件
- 多媒体内容

## SMTP 相关协议
| 协议 | 端口 | 用途 | 方向 |
|------|------|------|------|
| SMTP | 25 | 邮件服务器间传输 | 发送 |
| SMTP | 587 | 客户端提交邮件 | 发送 |
| POP3 | 110 | 从服务器拉取邮件 | 接收 |
| IMAP | 143 | 在服务器上管理邮件 | 接收 |

## 安全扩展
- **STARTTLS**：在已有连接上升级到 TLS 加密
- **SMTPS**：直接使用 SSL/TLS 加密连接（465 端口）
- **SPF / DKIM / DMARC**：发件人身份验证机制，防止伪造
