schemadir=$(datadir)/newstream/schemas
schema_DATA= \
    io.github.konkor.newstream.gschema.xml \
    gschemas.compiled

gsettings_SCHEMAS = io.github.konkor.newstream.gschema.xml
@GSETTINGS_RULES@

EXTRA_DIST = \
    $(schema_DATA) \
	$(gsettings_SCHEMAS) \
	$(NULL)
