/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const ResultView = imports.common.ResultView;
const Player = imports.common.Player;
const Utils = imports.common.Utils;

var ItemView = new Lang.Class({
  Name: "ItemView",
  Extends: Gtk.Box,
  Signals: {
    'closed': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_STRING]},
  },

  _init: function (owner) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.w = owner;

    this.scroll = new Gtk.ScrolledWindow ();
    this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.scroll.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.scroll.shadow_type = Gtk.ShadowType.NONE;
    this.pack_start (this.scroll, true, true, 0);

    this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.scroll.add (this.box);

    this.player = new Player.Player (owner);
    this.box.pack_start (this.player, true, true, 0);

    this.details = new VideoDetails (this.w);
    this.box.pack_start (this.details, false, true, 0);

    this.results = new ResultView.ResultView (owner, false);
    this.box.pack_end (this.results, true, true, 0);
  },

  load: function (item) {
    if (!item || !item.id) return;
    if (!this.player.item || (this.player.item.id != item.id))
      this.details.load (item);
    this.player.load (item);
    this.results.url = this.w.provider.get_relaited (this.player.item.id,Lang.bind (this.results, this.results.on_results));
  },

  get playing () {
    return this.player.engine.state == 4;
  },

  clear_all: function () {

  }
});

var Itembar = new Lang.Class({
  Name: "Itembar",
  Extends: Gtk.Box,

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
    //this.get_style_context ().add_class ("sb");

    this.bookmark = new Gtk.Button ({label:"", always_show_image: true, tooltip_text:"Bookmark"});
    this.bookmark.get_style_context ().add_class ("bookmark");
    this.bookmark.get_style_context ().add_class ("selected");
    this.bookmark_on = this.get_bookmark ();
    this.bookmark_off = GdkPixbuf.Pixbuf.new_from_file (APPDIR + "/data/icons/bookmark_off.svg");
    this.bookmark.image = new Gtk.Image ();
    this.bookmark.image.pixbuf = this.bookmark_off;
    this.bookmark.set_relief (Gtk.ReliefStyle.NONE);
    this.pack_start (this.bookmark, true, true, 0);

    this.share = new Gtk.MenuButton ({tooltip_text:"Share"});
    this.share.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/share.svg");
    this.share.set_relief (Gtk.ReliefStyle.NONE);
    this.share.set_popup (this.build_menu ());
    this.pack_start (this.share, true, true, 0);

  },

  build_menu: function () {
    let menu = new Gtk.Menu ();

    this.link = new Gtk.ImageMenuItem ({label:"https://youtu.be/", always_show_image: true, sensitive: false});
    this.link.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/social/link.svg");
    menu.add (this.link);

    if (Gtk.Clipboard.get_default) menu.add (this.add_clipboard ());

    this.app = Gio.AppInfo.get_default_for_uri_scheme ("https");
    if (!this.app) return menu;

    this.browser = this.add_button ("browser", "");
    menu.add (this.browser);

    menu.add (this.add_button ("fb", "Facebook", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/fb.png")));
    menu.add (this.add_button ("twit", "Twitter", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/twit.png")));
    menu.add (this.add_button ("red", "Reddit", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/red.png")));
    menu.add (this.add_button ("id", "LinkedIn", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/id.png")));
    menu.add (this.add_button ("plus", "Google+", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/gplus.png")));
    menu.add (this.add_button ("email", "E-mail", Gtk.Image.new_from_file (APPDIR + "/data/icons/social/mail.svg")));

    menu.show_all ();

    return menu;
  },

  add_clipboard: function () {
    let btn = new Gtk.ImageMenuItem ({label:"Copy to clipboard", always_show_image: true});
    btn.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/edit-copy-symbolic.svg");
    btn.connect ('activate', Lang.bind (this, (o) => {
      let clipboard = Gtk.Clipboard.get_default (Gdk.Display.get_default ());
      if (!clipboard) return;
      clipboard.set_text (this.link.label, -1);
    }));
    return btn;
  },

  add_button: function (name, label, icon) {
    if (!this.app) return null;
    icon = icon || Gtk.Image.new_from_gicon (this.app.get_icon (), Gtk.IconSize.MENU);
    label = label || "Open with " + this.app.get_name ();

    let btn = new Gtk.ImageMenuItem ({label:label, always_show_image: true});
    btn.image = icon;
    btn.name = name;
    btn.connect ("activate", Lang.bind (this, this.on_activate));

    return btn;
  },

  on_activate: function (o) {
    if (!this.app) return;
    let uri = this.link.label;
    let title = this.link.title || uri;
    if (o.name == "plus") uri = "https://plus.google.com/share?url=" + uri;
    else if (o.name == "fb") uri = "https://www.facebook.com/sharer/sharer.php?u=" + uri;
    else if (o.name == "twit") uri = "https://twitter.com/intent/tweet?text=" + title + "&url=https://obmin.github.io/obmin/news/2018/07/03/docker.html" + uri;
    else if (o.name == "red") uri = "http://www.reddit.com/submit?url=" + uri;
    else if (o.name == "id") uri = "https://www.linkedin.com/shareArticle?mini=true&url=" + uri + "&title=" + title + "&summary=&source=webjeda";
    else if (o.name == "email") uri = "mailto:?subject=" + title + "&body=Check out this video " + uri;

    Utils.launch_uri (uri);
  },

  set_link: function (id, title) {
    if (!id) return;
    this.id = id;
    this.link.label = "https://youtu.be/" + id;
    title = title || this.link.label;
    this.link.title = title;
  },

  set_bookmark: function (state) {
    if (state) {
      this.bookmark.get_style_context ().add_class ("selected");
      this.bookmark.image.pixbuf = this.bookmark_on;
      this.bookmark.tooltip_text = "Remove Bookmark";
      //this.bookmark.set_label ("★");
    } else {
      this.bookmark.get_style_context ().remove_class ("selected");
      this.bookmark.image.pixbuf = this.bookmark_off;
      this.bookmark.tooltip_text = "Add Bookmark";
      //this.bookmark.set_label ("☆");
    }
  },

  get_bookmark: function () {
    let svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"16\" width=\"18\" version=\"1.1\" viewBox=\"0 0 4.7624999 4.2333333\"><path d=\"m3.53 3.94c-0.21 0.15-0.94-0.42-1.2-0.42-0.25 0-0.99 0.57-1.19 0.42-0.208-0.15 0.11-1.03 0.03-1.27-0.07-0.24-0.846-0.76-0.767-1 0.078-0.25 1.01-0.21 1.22-0.36s0.46-1.05 0.72-1.04c0.25-0.005 0.51 0.89 0.71 1.04 0.21 0.15 1.14 0.12 1.22 0.36s-0.7 0.77-0.78 1.01c-0.07 0.24 0.24 1.12 0.04 1.26z\" fill=\"#bebebe\"/></svg>";
    let c = this.bookmark.get_style_context().get_color (0);
    if (c) svg = svg.replace (/bebebe/g, "%02x%02x%02x".format (c.red*255,c.green*255,c.blue*255));
    let stream = Gio.MemoryInputStream.new_from_bytes (new GLib.Bytes (svg));
    return GdkPixbuf.Pixbuf.new_from_stream (stream, null);
  }
});

var VideoDetails = new Lang.Class({
  Name: "VideoDetails",
  Extends: Gtk.Box,

  _init: function (parent) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.get_style_context ().add_class ("search-bar");
    this.settings = parent.settings;

    this.itembar = new Itembar ();
    this.pack_start (this.itembar, true, true, 0);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    this.pack_start (box, true, true, 0);

    this.channel = new Channel ();
    box.pack_start (this.channel, true, true, 0);

    this.statistics = new Statistics ();
    box.pack_end (this.statistics, false, false, 0);

    this.description = new Description ();
    this.add (this.description);

    this.itembar.bookmark.connect ('clicked', Lang.bind (this, (o) => {
      this.on_bookmark (o);
    }));
  },

  load: function (item) {
    //this.get_toplevel ().restore_position ();
    if (!item || !item.id) return;
    this.channel.load (item);
    this.statistics.load (item);
    this.description.load (item);
    this.itembar.set_link (item.id, item.title);
    this.itembar.set_bookmark (this.settings.booked (item.id));
  },

  on_bookmark: function (o) {
    this.settings.toggle_bookmark (this.itembar.id, !o.get_style_context().has_class ("selected"));
    this.itembar.set_bookmark (!o.get_style_context().has_class ("selected"));
  }
});

var Channel = new Lang.Class({
  Name: "Channel",
  Extends: Gtk.Button,

  _init: function () {
    this.parent ();
    this.get_style_context ().add_class ("channel-button");
    this.channel = null;
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.contents = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin: 8});
    this.add (this.contents);

    this.logo = Gtk.Image.new_from_file (APPDIR + "/data/icons/author.svg");
    //this.image.get_style_context ().add_class ("author-image");
    this.contents.pack_start (this.logo, false, false, 8);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.contents.add (box);

    this.author = new Gtk.Label ({xalign:0.0});
    box.pack_start (this.author, true, true, 0);
    this.published = new Gtk.Label ({xalign:0.0, yalign:0.0, opacity:0.7});
    this.published.get_style_context ().add_class ("small");
    box.pack_start (this.published, true, true, 0);

    this.show_all ();
    //this.sensitive = false;
    this.connect ("clicked", ()=>{
      if (!this.channel && !this.channel.id) return;
      let app = Gio.Application.get_default ();
      app.window.channelview.load (this.channel, this.pixbuf);
    });
  },

  load: function (data) {
    if (!data) return;
    if (data.channel.title) this.author.set_text (data.channel.title);
    if (data.channel.id) this.channel = data.channel;
    if (data.published) {
      var d = new Date (data.published);
      this.published.set_text ("Published: " + d.toLocaleDateString());
    }
    if (data.channel_thumb_url) Utils.fetch (data.channel_thumb_url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      this.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
      this.logo.pixbuf = this.pixbuf.scale_simple (56, 56, 2);
    }));
  }
});

var Statistics = new Lang.Class({
  Name: "Statistics",
  Extends: Gtk.Button,

  _init: function () {
    this.parent ();
    this.get_style_context ().add_class ("channel-button");
    this.set_relief (Gtk.ReliefStyle.NONE);
    let contents = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin: 8});
    this.add (contents);

    this.views = new Gtk.Label ({xalign:0.5, yalign:1.0, opacity:0.8});
    this.views.get_style_context ().add_class ("small");
    contents.pack_start (this.views, true, true, 0);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    contents.pack_start (box, true, true, 0);

    this.likes = new Gtk.Label ({xalign:0.5, yalign:0.0, opacity:0.8});
    this.likes.get_style_context ().add_class ("small");
    box.pack_start (this.likes, true, true, 0);

    this.show_all ();
    this.connect ("clicked", () => {
      Utils.launch_uri (this.url);
    });
  },

  load: function (data) {
    if (!data) return;
    this.views.set_text (Utils.format_size_long (data.views) + " views");
    this.likes.set_text (Utils.format_size (data.likes) + " / " + Utils.format_size (data.dislikes));
    this.url = "https://youtu.be/" + data.id;
  }
});

var Description = new Lang.Class({
  Name: "Description",
  Extends: Gtk.Expander,

  _init: function () {
    this.parent ({
      label:"Description", label_fill:false, expanded:false,
      resize_toplevel:false, opacity:0.8, margin: 8
    });

    this.info = new Gtk.Label ({
      xalign:0.0, yalign:1.0, wrap: true, margin:8
    });
    this.info.margin_left = 18;
    this.info.get_style_context ().add_class ("small");
    this.add (this.info);

    this.show_all ();
  },

  load: function (data) {
    if (!data || !data.description) return;
    this.info.set_text (data.description);
  }
});

function getCurrentFile () {
  let stack = (new Error()).stack;
  let stackLine = stack.split("\n")[1];
  if (!stackLine)
    throw new Error ("Could not find current file");
  let match = new RegExp ("@(.+):\\d+").exec(stackLine);
  if (!match)
    throw new Error ("Could not find current file");
  let path = match[1];
  let file = Gio.File.new_for_path (path).get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
