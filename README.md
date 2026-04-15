# Install

```sh
cd feeds/luci/applications
git clone https://github.com/hrimfaxi/luci-app-tumgrd
cd ../../../
./scripts/feeds update luci
./scripts/feeds install -f luci-app-tumgrd
make package/luci-app-tumgrd/compile
```
