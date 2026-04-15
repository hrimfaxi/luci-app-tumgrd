# Install

```sh
mkdir my_packages
cd my_packages
git clone https://github.com/hrimfaxi/luci-app-tumgrd
cd ..
echo "src-link custom $(pwd)/my_packages" >> feeds.conf.default
./scripts/feeds update luci
./scripts/feeds update custom
./scripts/feeds install -f luci-app-tumgrd
make package/luci-app-tumgrd/compile
```
