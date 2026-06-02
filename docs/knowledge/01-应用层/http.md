# HTTP 协议（超文本传输协议）

## 基本信息
| 属性 | 值 |
|------|-----|
| 协议名称 | HTTP（HyperText Transfer Protocol） |
| 所属层 | 应用层 |
| 传输层协议 | TCP |
| 默认端口 | 80（HTTP）/ 443（HTTPS） |
| RFC 文档 | RFC 7230 - RFC 7235 |

## 协议简介
HTTP 是万维网（World Wide Web）的基础协议，用于 Web 浏览器与 Web 服务器之间的通信。HTTP 采用请求-响应模型：客户端（浏览器）发送请求报文，服务器返回响应报文。

## 报文格式

### 请求报文
```
请求行: 方法 URL HTTP版本
请求头: 键: 值
空行
请求体（可选）
```

示例：
```
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0
Accept: text/html
```

### 响应报文
```
状态行: HTTP版本 状态码 短语
响应头: 键: 值
空行
响应体
```

示例：
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<html>...</html>
```

## 请求方法
| 方法 | 说明 | 是否有请求体 | 是否幂等 |
|------|------|-------------|---------|
| GET | 获取资源 | 否 | 是 |
| POST | 提交数据 | 是 | 否 |
| PUT | 更新资源（全量） | 是 | 是 |
| DELETE | 删除资源 | 否 | 是 |
| HEAD | 获取响应头 | 否 | 是 |
| OPTIONS | 查询支持的方法 | 否 | 是 |
| PATCH | 部分更新 | 是 | 否 |

## 状态码
| 范围 | 类别 | 常见状态码 |
|------|------|-----------|
| 1xx | 信息 | 100 Continue, 101 Switching Protocols |
| 2xx | 成功 | 200 OK, 201 Created, 204 No Content |
| 3xx | 重定向 | 301 Moved Permanently, 302 Found, 304 Not Modified |
| 4xx | 客户端错误 | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | 服务器错误 | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |

## HTTP/1.0 vs HTTP/1.1 vs HTTP/2
| 特性 | HTTP/1.0 | HTTP/1.1 | HTTP/2 |
|------|----------|----------|--------|
| 连接方式 | 短连接 | 持久连接 | 多路复用 |
| 管道化 | 不支持 | 支持 | 支持 |
| 头部压缩 | 无 | 无 | HPACK |
| 数据格式 | 文本 | 文本 | 二进制帧 |
| 服务器推送 | 无 | 无 | 支持 |

## 与其他协议的关系
- HTTP 通常运行在 TCP 之上，使用 TCP 提供的可靠传输服务
- HTTPS = HTTP + TLS/SSL，在 HTTP 和 TCP 之间加入加密层
- HTTP 使用 DNS 进行域名解析
