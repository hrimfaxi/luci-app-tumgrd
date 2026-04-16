#!/usr/bin/env bash

set -euo pipefail

REMOTE="${1:-root@openwrt}"
LOCAL_ROOT="${2:-root}"
LOCAL_HTDOCS="${3:-htdocs}"

if [[ ! -d "$LOCAL_ROOT" ]]; then
	echo "ERROR: local directory '$LOCAL_ROOT' not found" >&2
	exit 1
fi

if [[ ! -d "$LOCAL_HTDOCS" ]]; then
	echo "WARNING: local directory '$LOCAL_HTDOCS' not found, skip htdocs deploy" >&2
fi

echo "==> Deploying '$LOCAL_ROOT/' to '$REMOTE:/'"
if [[ -d "$LOCAL_HTDOCS" ]]; then
	echo "==> Deploying '$LOCAL_HTDOCS/' to '$REMOTE:/www/'"
fi

ssh "$REMOTE" 'mkdir -p /www'

# 部署 root/ -> /
tar -C "$LOCAL_ROOT" -cf - . | ssh "$REMOTE" '
	set -e
	echo "==> Extract root files to /"
	tar -C / -xf -
'

# 部署 htdocs/ -> /www/
if [[ -d "$LOCAL_HTDOCS" ]]; then
	tar -C "$LOCAL_HTDOCS" -cf - . | ssh "$REMOTE" '
		set -e
		echo "==> Extract htdocs files to /www"
		tar -C /www -xf -
	'
fi

ssh "$REMOTE" '
	set -e

	# 修正可执行权限
	[ -f /usr/libexec/rpcd/tumgrd ] && chmod 0755 /usr/libexec/rpcd/tumgrd || true
	[ -f /etc/init.d/tumgrd ] && chmod 0755 /etc/init.d/tumgrd || true

	# LuCI / rpcd 常见缓存清理
	rm -rf /tmp/luci-* /tmp/luci-modulecache/ /tmp/luci-indexcache /tmp/lpcache 2>/dev/null || true

	echo "==> Restart rpcd"
	/etc/init.d/rpcd restart

	echo "==> Restart uhttpd"
	/etc/init.d/uhttpd restart

	# 如果 tumgrd 已存在 init 脚本，顺手重启一下
	if [ -x /etc/init.d/tumgrd ]; then
		echo "==> Restart tumgrd"
		/etc/init.d/tumgrd restart || true
	fi

	echo "==> Done"
'

echo "==> You can now open LuCI and test"
