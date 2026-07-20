include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-tumgrd
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0

LUCI_TITLE:=LuCI support for tumgrd
LUCI_DEPENDS:=+luci-base +rpcd +liblua +libucode +tumgrd
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
