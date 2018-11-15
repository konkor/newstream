#application data icons
iconsdir=$(datadir)/newstream/data/icons
icons_DATA= \
    back-symbolic.svg \
    folder-saved-search-symbolic.svg \
    headphones-symbolic.svg \
    history-symbolic.svg \
    io.github.konkor.newstream.svg \
    newstream.item.svg \
    newstream.cover.svg \
    window-close-symbolic.svg\
    open-menu-symbolic.svg\
    edit-copy-symbolic.svg\
    author.svg\
    bookmark.svg\
    share.svg

#application social icons
socialdir=$(datadir)/newstream/data/icons/social
social_DATA= \
    social/gplus.svg \
    social/fb.svg \
    social/mail.svg \
    social/link.svg

#system application icons
icondir=$(datadir)/icons
nobase_icon_DATA = hicolor/scalable/apps/io.github.konkor.newstream.svg \
    hicolor/32x32/apps/io.github.konkor.newstream.png \
    $(NULL)

#the application icon
pixmapsdir=$(datadir)/pixmaps
pixmaps_DATA= \
    hicolor/scalable/apps/io.github.konkor.newstream.svg

EXTRA_DIST = \
    $(icons_DATA) \
    $(social_DATA) \
    $(pixmaps_DATA) \
    $(nobase_icon_DATA)

gtk_update_icon_cache = gtk-update-icon-cache -f -t $(datadir)/icons/hicolor

install-data-hook: update-icon-cache
uninstall-hook: update-icon-cache
update-icon-cache:
  @-if test -z "$(DESTDIR)"; then                                     \
    echo "Updating Gtk icon cache.";                                  \
    $(gtk_update_icon_cache);                                         \
  else                                                                \
    echo "*** Icon cache not updated.  After (un)install, run this:"; \
    echo "***   $(gtk_update_icon_cache)";                            \
  fi
