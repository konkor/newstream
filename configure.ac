dnl Process this file with autoconf to produce a configure script.

AC_INIT(newstream, [0.1.6])

AC_CONFIG_HEADERS([config.h])

AC_CONFIG_AUX_DIR([.])

AM_INIT_AUTOMAKE([1.11 dist-xz no-dist-gzip foreign tar-ustar])

AM_SILENT_RULES([yes])

LT_INIT

GLIB_GSETTINGS

dnl Packaging version
echo "${VERSION}" > packaging/VERSION

AC_OUTPUT([
Makefile
common/Makefile
data/Makefile
data/icons/Makefile
data/themes/Makefile
schemas/Makefile
])

echo "

                    ${PACKAGE} ${VERSION}
                    =========
"
