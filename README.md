# Install

```sh
mkdir -p package
cd package
git clone https://github.com/hrimfaxi/openwrt-tumgrd tumgrd
git clone https://github.com/hrimfaxi/luci-app-tumgrd
cd ..
./scripts/feeds update base
make package/luci-app-tumgrd/compile
```
