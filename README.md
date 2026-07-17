# luci-app-tumgrd

OpenWrt 路由器上的 [tumgrd](https://github.com/hrimfaxi/openwrt-tumgrd) tutuicmptunnel 节点管理守护进程 LuCI Web 管理界面。

## 功能特性

- 注册 / 编辑 / 删除 tutuicmptunnel 节点
- 查看节点状态、当前 IP 和最后更新时间
- 刷新单个节点或一键刷新全部节点
- 通过 UCI 配置守护进程参数（监听地址、端口、日志等）
- PSK 密码显示/隐藏切换
- XOR 密钥加密随机生成
- 支持 IPv4 / IPv6 / 自动 IP 版本

## 安装

```sh
mkdir -p package
cd package
git clone https://github.com/hrimfaxi/openwrt-tumgrd tumgrd
git clone https://github.com/hrimfaxi/luci-app-tumgrd
cd ..
./scripts/feeds update base
make package/luci-app-tumgrd/compile
```

## 依赖

- `luci-base`
- `rpcd`
- `tumgrd`（后端守护进程）

## 许可证

GPL-3.0
