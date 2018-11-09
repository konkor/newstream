## Process this file with automake to produce Makefile.in

APP_ID = newstream

DIST_SUBDIRS = data schemas common

SUBDIRS = data schemas common

jsdir = $(datadir)/$(APP_ID)
js_DATA = \
    README.md

js_SCRIPTS = new-stream

bin_SCRIPTS = new-stream

dist_js_DATA = $(js_SCRIPTS)

dist_doc_DATA = \
	README.md

uninstall-local:
	-rm -r $(jsdir)

