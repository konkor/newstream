#!/bin/bash

PKG_NAME="newstream"
VERSION=$(cat VERSION)

echo Version: $VERSION
rm -rf debs
mkdir debs
cd debs
ln -s ../../$PKG_NAME-$VERSION.tar.xz newstream_$VERSION.orig.tar.xz
tar xf newstream_$VERSION.orig.tar.xz
cd $PKG_NAME-$VERSION
cp -r ../../../debian/ .
debuild -us -uc
