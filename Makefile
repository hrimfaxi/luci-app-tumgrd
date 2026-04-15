include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-tumgrd
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for tumgrd
LUCI_DEPENDS:=+luci-base +rpcd
LUCI_PKGARCH:=all

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
