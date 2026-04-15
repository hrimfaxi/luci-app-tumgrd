#!/usr/bin/env bash

set -euo pipefail

REMOTE="${1:-root@hmh}"
LOCAL_ROOT="${2:-root}"

if [[ ! -d "$LOCAL_ROOT" ]]; then
	echo "ERROR: local directory '$LOCAL_ROOT' not found" >&2
	exit 1
fi

echo "==> Deploying '$LOCAL_ROOT/' to '$REMOTE:/'"

# 把 root/ 下的内容解包到远端 /
tar -C "$LOCAL_ROOT" -cf - . | ssh "$REMOTE" '
	set -e

	echo "==> Extract files to /"
	tar -C / -xf -

	# 修正可执行权限
	[ -f /usr/libexec/rpcd/tumgrd ] && chmod 0755 /usr/libexec/rpcd/tumgrd || true
	[ -f /etc/init.d/tumgrd ] && chmod 0755 /etc/init.d/tumgrd || true

	# LuCI / rpcd 常见缓存清理
	rm -rf /tmp/luci-* /tmp/luci-modulecache/ /tmp/luci-indexcache /tmp/lpcache 2>/dev/null || true

	echo "==> Restart rpcd"
	/etc/init.d/rpcd restart

	echo "==> Restart uhttpd"
	/etc/init.d/uhttpd restart

	# 如果 tumgrd 已存在 init 脚本，顺手重启一下，便于联调
	if [ -x /etc/init.d/tumgrd ]; then
		echo "==> Restart tumgrd"
		/etc/init.d/tumgrd restart || true
	fi

	echo "==> Done"
'

echo "==> You can now open LuCI and test"
