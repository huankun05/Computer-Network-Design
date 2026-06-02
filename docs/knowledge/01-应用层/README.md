# 应用层 — 知识文档索引

应用层是 TCP/IP 五层模型的最高层，直接为用户的应用程序提供网络服务。

## 本层主要功能
- 为用户应用程序提供网络接口
- 定义应用程序之间的通信规则
- 支持多种网络服务（Web浏览、邮件、文件传输、域名解析等）

## 本层常见协议
| 协议 | 全称 | 端口 | 传输层 | 用途 |
|------|------|------|--------|------|
| HTTP | HyperText Transfer Protocol | 80 | TCP | Web 浏览 |
| HTTPS | HTTP Secure | 443 | TCP | 加密 Web 浏览 |
| FTP | File Transfer Protocol | 20/21 | TCP | 文件传输 |
| DNS | Domain Name System | 53 | UDP/TCP | 域名解析 |
| SMTP | Simple Mail Transfer Protocol | 25 | TCP | 发送邮件 |
| POP3 | Post Office Protocol v3 | 110 | TCP | 接收邮件 |
| IMAP | Internet Message Access Protocol | 143 | TCP | 邮件管理 |
| SSH | Secure Shell | 22 | TCP | 远程登录 |
| Telnet | Teletype Network | 23 | TCP | 远程登录（明文） |
| DHCP | Dynamic Host Configuration Protocol | 67/68 | UDP | IP 地址分配 |
| TFTP | Trivial File Transfer Protocol | 69 | UDP | 简单文件传输 |
| SNMP | Simple Network Management Protocol | 161/162 | UDP | 网络管理 |
| NFS | Network File System | 2049 | TCP/UDP | 网络文件共享 |

## 文件说明
- `http.md` — HTTP 协议详解
- `dns.md` — DNS 协议详解
- `ftp.md` — FTP 协议详解
- `smtp-pop3-imap.md` — 邮件协议详解
