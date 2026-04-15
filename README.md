# Install

```sh
mkdir my_packages
cd my_packages
git clone https://github.com/hrimfaxi/luci-app-tumgrd
cd ..
echo "src-link custom $(pwd)/my_packages" >> feeds.conf.default
./scripts/feeds update -a
./scripts/feeds update custom
./scripts/feeds install -a
./scripts/feeds install luci-app-tumgrd
make package/luci-app-tumgrd/compile
```
