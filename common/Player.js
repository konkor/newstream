/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkX11 = imports.gi.GdkX11;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GtkClutter = imports.gi.GtkClutter;
const Clutter = imports.gi.Clutter;
//const Cogl = imports.gi.Cogl;
const ClutterGst = imports.gi.ClutterGst;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const System = imports.system;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const PlayerEngine = imports.common.PlayerEngine;
const Utils = imports.common.Utils;

var CG_VERSION = 3;
if (!ClutterGst.Content) CG_VERSION = 2;

const OVERLAY_OPACITY = 220;

let window_handler = 0;

var Player = new Lang.Class({
  Name: "Player",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.w = sender;

    GtkClutter.init (null);
    ClutterGst.init(null);

    this.engine = new PlayerEngine.PlayerEngine ();
    this.video = new VideoFrame (this);
    this.pack_start (this.video, true, true, 0);

    this.details = new VideoDetails (this.w);
    this.pack_start (this.details, true, true, 0);

    this.connect ('unrealize', Lang.bind (this, (o)=>{
      this.engine.stop ();
    }));
    this.engine.connect ('state-changed', Lang.bind (this, (s,o,n,p)=>{
      //print ("state-changed:", o,n,p);
      if (this.w.stack.visible_child_name != "item") {
        this.w.phones.visible = n == 4;
      } else {
        if (this.item.title != this.w.section.label)
          this.w.section.label = this.item.title;
          this.video.contents.header.label = this.item.title;
      }
    }));
  },

  load: function (item) {
    if (!item || !item.id) return;
    if (!this.item || (this.item.id != item.id)) {
      this.item = item;
      this.get_cover ();
      this.details.load (this.item);
      if (this.item.id) Utils.fetch_formats (this.item.id, Lang.bind (this, (d)=>{
        this.formats = d;
        var url = "";
        if (d && d.formats) d.formats.forEach (p => {
          if (d.format_id == p.format_id) url = p.url;
        });
        if (url) {
          this.w.settings.add_view_history (this.item);
          this.engine.open (url);
          this.show_all ();
        }
        //print (d.format_id, d.id, d.ext);
        //if (d.formats) d.formats.forEach ( p => {
        //print (p.format);
        //print (p.url);
      }));
      this.w.application.lookup_action ("player-enabled").activate (null);
    } else {
      if (this.engine.state != 4) {
        this.w.settings.add_view_history (this.item);
      }
      this.engine.play ();
    }
    System.gc ();
  },

  play: function () {
    if (this.engine) this.engine.play ();
  },

  pause: function () {
    if (this.engine) this.engine.pause ();
  },

  toggle_play: function () {
    if (this.engine.state == 4) this.engine.pause ();
    else this.engine.play ();
  },

  seek: function (pos) {
    if (this.engine) this.engine.seek (pos);
  },

  get_cover: function () {
    this.video.contents.set_cover (null);
    if (!this.item.id) return;

    if (this.item.cover_url) Utils.fetch (this.item.cover_url, null, null, Lang.bind (this, (d,r)=>{
      if (r == 200)
        this.video.contents.set_cover (GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null));
    }));
  }
});

var Itembar = new Lang.Class({
  Name: "Itembar",
  Extends: Gtk.Box,

  _init: function (parent) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
    this.settings = parent.settings;
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

    this.bookmark.connect ('clicked', Lang.bind (this, (o) => {
      this.settings.toggle_bookmark (this.id, !this.bookmark.get_style_context().has_class ("selected"));
      this.set_bookmark (!this.bookmark.get_style_context().has_class ("selected"));
    }));
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
    this.set_bookmark (this.settings.booked (id));
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

    this.itembar = new Itembar (parent);
    this.pack_start (this.itembar, true, true, 0);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    this.pack_start (box, true, true, 0);

    this.channel = new Channel ();
    box.pack_start (this.channel, true, true, 0);

    this.statistics = new Statistics ();
    box.pack_end (this.statistics, false, false, 0);

    this.description = new Description ();
    this.add (this.description);
  },

  load: function (item) {
    //this.get_toplevel ().restore_position ();
    if (!item || !item.id) return;
    this.channel.load (item);
    this.statistics.load (item);
    this.description.load (item);
    this.itembar.set_link (item.id, item.title);
  }
});

var Channel = new Lang.Class({
  Name: "Channel",
  Extends: Gtk.Button,

  _init: function () {
    this.parent ();
    this.get_style_context ().add_class ("channel-button");
    this.id = "";
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
  },

  load: function (data) {
    if (!data) return;
    if (data.channel.title) this.author.set_text (data.channel.title);
    if (data.channel.id) this.id = data.channel.id;
    if (data.published) {
      var d = new Date (data.published);
      this.published.set_text ("Published: " + d.toLocaleDateString());
    }
    if (data.channel_thumb_url) Utils.fetch (data.channel_thumb_url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      this.logo.pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale (Gio.MemoryInputStream.new_from_bytes (d), 56, 56, true, null);
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

var VideoFrame = new Lang.Class({
  Name: "VideoFrame",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});

    this.contents = new VideoWidget (sender);
    this.video_window = new FullscreenWindow (sender);
    this.video_window.realize ();
    this.video_window.add (this.contents);

    this.frame = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.frame.override_background_color (Gtk.StateFlags.NORMAL, new Gdk.RGBA({alpha:1}));
    this.frame.set_size_request (100,480);
    this.frame.show ();
    this.pack_start (this.frame, true, true, 0);
    this.contents.connect ('button-press-event', Lang.bind (this, (o, e)=>{
      //print ('button-press-event', e.get_event_type());
      if (e.get_event_type() == Gdk.EventType.DOUBLE_BUTTON_PRESS) this.toggle_fullscreen ();
    }));
    this.connect ('realize', Lang.bind (this, ()=>{
      this.move_internal ();
    }));
  },

  toggle_fullscreen: function () {
    this.contents.set_controls_visibility (false, false);
    this.get_toplevel ().present ();

    if (this.fullscreen) {
      this.move_internal ();
    } else {
      this.move_fullscreen ();
    }
  },

  move_fullscreen: function () {
    this.get_toplevel ().save_geometry ();
    if (this.contents.parent != this.video_window) {
      this.contents.reparent (this.video_window);
      this.contents.show_all ();
      this.fullscreen = true;
      this.get_toplevel ().hide ();
      this.video_window.show ();
      this.video_window.fullscreen ();
    }
    this.get_toplevel ().inhibit ();
  },

  move_internal: function () {
    this.get_toplevel ().restore_position ();
    this.video_window.unfullscreen ();
    this.video_window.hide ();
    if (this.contents.parent != this.frame) {
      this.get_toplevel ().present ();
      this.contents.reparent (this.frame);
      this.contents.show_all ();
      this.fullscreen = false;
    }
    this.get_toplevel ().uninhibit ();
  }
});

var FullscreenWindow = new Lang.Class({
  Name: "FullscreenWindow",
  Extends: Gtk.Window,

  _init: function (sender) {
    this.parent ({type: Gtk.WindowType.TOPLEVEL});
    this.mainwindow = sender.w;
    if (this.mainwindow.icon) this.icon = this.mainwindow.icon;
    this.can_focus = true;
    this.decorated = false;
    this.deletable = false;
    this.transient_for = null;

    //this.control = null;
    let app = Gio.Application.get_default();
    this.application = app;

    this.connect ('window_state_event', Lang.bind (this, (o, e)=>{
      var state = this.window.get_state();
      if (state == Gdk.WindowState.FULLSCREEN) this.set_bounds ();
    }));
  },

  set_bounds: function () {
    var monitor = 0;
    if (this.mainwindow.window) monitor = this.screen.get_monitor_at_window (this.mainwindow.window);
    var bounds = this.screen.get_monitor_geometry (0);
    this.move (bounds.x, bounds.y);
    this.resize (bounds.width, bounds.height);
  }
});

var VideoWidget = new Lang.Class ({
  Name: "VideoWidget",
  Extends: GtkClutter.Embed,

  _init: function (sender) {
    if (!sender || !sender.engine) throw "No player engine!";
    this.player = sender;
    this.control_visible = false;
    this.control_timeout_id = 0;
    this.parent ();
    this.build ();

    this.connect ("motion_notify_event", Lang.bind (this, this.on_motion_notify));
    this.player.engine.connect ('state-changed', Lang.bind (this, this.on_player_state));

    this.set_controls_visibility (false);
  },

  build: function () {
    this.stage = this.get_stage ();
    this.stage.set_layout_manager (new Clutter.BinLayout ({
      x_align: Clutter.BinAlignment.FILL,
      y_align: Clutter.BinAlignment.FILL,
    }));
    this.stage.set_background_color (new Clutter.Color ());

    this.cover_frame = new GtkClutter.Actor ();
    this.cover = Clutter.Image.new ();
    this.cover_frame.set_content (this.cover);
    this.cover_frame.set_content_gravity (Clutter.ContentGravity.RESIZE_ASPECT);
    this.stage.add_child (this.cover_frame);
    //this.cover_frame.hide ();

    if (CG_VERSION < 3) {
      //this.videosink = Gst.ElementFactory.make ("cluttersink", "videosink");
      this.texture = new Clutter.Texture ({"disable-slicing":true, "reactive":true});
      this.player.engine.get_videosink().set_property ("texture", this.texture);
      this.frame = new AspectFrame ();
      this.frame.add_child (this.texture);
    } else {
      let videosink = new ClutterGst.VideoSink ();
      this.frame = new Clutter.Actor ({
        "content": new ClutterGst.Aspectratio ({"sink": videosink}),
        "name": "texture",
        "reactive": true
      });
      this.player.engine.set_videosink (videosink);
    }
    this.stage.add_child (this.frame);
    this.stage.set_child_above_sibling (this.cover_frame, this.frame);

    /* Fullscreen header controls */
    this.header_controls = new GtkClutter.Actor ();
    this.header_controls.set_opacity (OVERLAY_OPACITY);
    this.header_controls.add_constraint (new Clutter.BindConstraint (this.stage, Clutter.BindCoordinate.WIDTH, 0));
    let layout = new Clutter.Actor ({
      "layout-manager": new Clutter.BinLayout ({
        x_align: Clutter.BinAlignment.CENTER,
        y_align: Clutter.BinAlignment.START,
      })
    });
    layout.add_child (this.header_controls);
    this.stage.add_child (layout);
    this.header = new Gtk.Label ({label:"New Stream", wrap: true, lines: 1, ellipsize: 3, xalign:0});
    this.header.margin = 8;
    this.header_controls.get_widget().add (this.header);
    this.header.show_all ();
    this.stage.set_child_above_sibling (layout, this.frame);

    /* Video controls */
    this.controls = new VideoControl (this);
    this.controls.set_opacity (OVERLAY_OPACITY);
    this.controls.add_constraint (new Clutter.BindConstraint (this.stage, Clutter.BindCoordinate.WIDTH, 0));
    layout = new Clutter.Actor ({
      "layout-manager": new Clutter.BinLayout ({
        x_align: Clutter.BinAlignment.FILL,
        y_align: Clutter.BinAlignment.END,
      })
    });
    layout.add_child (this.controls);
    this.stage.add_child (layout);
    this.stage.set_child_above_sibling (layout, this.cover_frame);

    //var theme = Gtk.IconTheme.get_for_screen (this.player.get_screen ());
    //this.logo_pixbuf = theme.load_icon ("applications-multimedia", 256, 0);
    this.logo_pixbuf = GdkPixbuf.Pixbuf.new_from_file (APPDIR + "/data/icons/newstream.cover.svg");
    this.set_cover ();
  },

  get_cover_pixbuf: function () {
    if (this.cover_pixbuf) return this.cover_pixbuf;
    else return this.logo_pixbuf;
  },

  set_cover: function (cover) {
    this.cover_pixbuf = cover || null;
    var pb = this.get_cover_pixbuf ();
    if (!pb) return;
    this.cover.set_data (
      pb.get_pixels(), pb.get_has_alpha() ? 19 : 2,
      pb.get_width (), pb.get_height (), pb.get_rowstride ()
    );
  },

  set_cover_visiblity: function (val) {
    if (val) {
      /*if (this.cover_id) {
        GLib.source_remove (this.cover_id);
        this.cover_id = 0;
      }*/
      this.cover_frame.show ();
      //this.cover_frame.set_opacity (255);
      this.frame.hide ();
    } else {
      this.frame.show ();
      this.cover_frame.hide ();
      /*this.cover_frame.set_easing_duration (500);
      this.cover_frame.set_opacity (0);
      this.cover_id = GLib.timeout_add (0, 500, () => {
        this.cover_id = 0;
        this.cover_frame.hide ();
        return false;
      });*/
    }
  },

  on_player_state: function (engine, o,n,p) {
    //print (o,n,p,!((n == 4) || (n == 3)));
    this.set_cover_visiblity (!((n == 4) || (n == 3)));
  },

  set_controls_busy: function (val) {
    if (val) {
      this.unschedule_hiding_popup ();
      this.set_controls_visibility (true, false);
    } else this.schedule_hiding_popup ();
  },

  on_motion_notify: function (o, event) {
    //print (o, event);
    if (!this.control_visible)
      this.set_controls_visibility (true);
    let [,x,y] = event.get_coords ();
    //let src = event.get_window().get_user_data (); Always NULL
    //TODO: we could use other methods like handle focus-in event
    [,x,y] = this.controls.box.translate_coordinates (o, x, y);
    if (this.ignore_motion (x, y)) {
      this.unschedule_hiding_popup ();
    } else {
      this.schedule_hiding_popup ();
    }
  },

  ignore_motion: function (x, y) {
    let actor = this.stage.get_actor_at_pos (Clutter.PickMode.REACTIVE, x, y);
    if (actor == this.controls) return true;
    return false;
  },

  set_controls_visibility: function (visible, animate) {
    animate = animate || true;
    let transition = animate ? 250 : 0;
    if (this.player.video && this.player.video.fullscreen || !visible) {
      let [,header_controls_height] = this.header_controls.get_preferred_height (this.header_controls);
      let header_controls_y = visible ? 0 : -header_controls_height;
      //print (header_controls_y);
      this.header_controls.set_easing_duration (transition);
      this.header_controls.set_y (header_controls_y);
    }
    let opacity = visible ? OVERLAY_OPACITY : 0;
    this.controls.set_easing_duration (transition);
    this.controls.set_opacity (opacity);

    this.set_show_cursor (visible);
    //if (visible) this.schedule_hiding_popup ();
    this.control_visible = visible;
  },

  schedule_hiding_popup: function () {
    this.unschedule_hiding_popup ();
    this.control_timeout_id = GLib.timeout_add (0, 5000, () => {
      this.unschedule_hiding_popup ();
      this.set_controls_visibility (false);
      return false;
    });
  },

  unschedule_hiding_popup: function () {
    if (this.control_timeout_id > 0)
      GLib.source_remove (this.control_timeout_id);
    this.control_timeout_id = 0;
  },

  set_show_cursor: function (show) {
    let window = this.get_window ();
    if (!window) return;

    if (show) window.cursor = null;
    else {
      let cursor = Gdk.Cursor.new (Gdk.CursorType.BLANK_CURSOR);
      window.cursor = cursor;
    }
  }

});

var VideoControl = new Lang.Class ({
  Name: "VideoControl",
  Extends: GtkClutter.Actor,

  _init: function (sender) {
    this.parent ();
    this.sender = sender;
    this.player = sender.player;
    this.seekable = false;
    this.seek_lock = false;
    this.current_position = 0;
    this.duration = 0;
    this.build ();
    this.show_all ();
  },

  build: function () {
    this.box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, spacing:8});
    this.box.get_style_context ().add_class ("osd");
    this.box.get_style_context ().add_class ("bottom");
    //this.box.override_background_color (0, new Gdk.RGBA ());
    this.box.hexpand = true;
    this.get_widget ().add (this.box);

    this.play = new PlayButton ();
    this.play.connect ("play", Lang.bind (this, this.on_play));
    this.box.add (this.play);

    this.time = new Gtk.Label ({label: "0:00"});
    this.time.get_style_context ().add_class ("small");
    this.box.add (this.time);

    this.seek_scale = new Gtk.Scale ({
      orientation:Gtk.Orientation.HORIZONTAL,
      draw_value:false,
      restrict_to_fill_level:false
    });
    this.seek_scale.adjustment.upper = 0.0;
    this.seek_scale.adjustment.page_increment = 10;
    this.seek_scale.adjustment.step_increment = 0.1;
    this.seek_scale.expand = true;
    this.box.pack_start (this.seek_scale, true, true, 0);
    //this.box.add (this.seek_scale);

    this.time_duration = new Gtk.Label ({label: "-",margin_right:24});
    this.time_duration.get_style_context ().add_class ("small");
    this.box.add (this.time_duration);

    this.box.show_all ();

    this.player.engine.connect ('state-changed', Lang.bind (this, (s,o,n,p)=>{
      //print ("state-changed:", o,n,p,this.play.state);
      this.play.toggle (n == 4);
    }));
    this.player.engine.connect ('progress', Lang.bind (this, this.on_progress));

    this.seek_scale.connect ('button-press-event', () => {
      this.sender.set_controls_busy (true);
      this.seek_lock = true;
    });
    this.seek_scale.connect ('button-release-event', () => {
      this.seek_lock = false;
      this.sender.set_controls_busy (false);
    });
    this.seek_scale.connect ('value-changed', Lang.bind (this, this.on_seek));
  },

  on_play: function (o, state) {
    if (state) this.player.play ();
    else this.player.pause ();
  },

  on_progress: function (o, pos, dur) {
    //print ("progress", pos, dur);
    this.update_slider_visibility (dur);

    if (dur) this.seekable = true;
    else this.seekable = false;

    if (this.duration != dur) {
      this.duration = dur;
      this.set_time (this.time_duration, dur);
      this.seek_scale.sensitive = this.seekable;
    }
    if (dur <= 0) this.current_position = 0;
    else this.current_position = pos / dur;

    if (!this.seek_lock) {
      this.seek_scale.set_value (this.current_position * 65535);
      this.set_time (this.time, pos);
    }
  },

  on_seek: function (o) {
    if (!this.seek_lock) return;
    let pos = o.get_value () / 65535 * this.duration;
    this.set_time (this.time, pos);
    this.player.seek (pos);
  },

  update_slider_visibility: function (dur) {
    if (this.duration == dur) return;
    if (this.duration > 0 && dur > 0) return;
    if (dur > 0) this.seek_scale.set_range (0.0, 65535.0);
    else this.seek_scale.set_range (0.0, 0.0);
  },

  set_time: function (label, time) {
    if (time < 0) {
      label.set_text ("-");
      return;
    }
    label.set_text (Utils.time_stamp (time/1000));
  }
});

var PlayButton = new Lang.Class({
  Name: "PlayButton",
  Extends: Gtk.Button,
  Signals: {
    'play': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_BOOLEAN]},
  },

  _init: function () {
    this.parent ({always_show_image: true, tooltip_text:"Play/Pause (Space)"});
    this.get_style_context ().add_class ("play-button");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.play_image = Gtk.Image.new_from_icon_name ("media-playback-start-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.pause_image = Gtk.Image.new_from_icon_name ("media-playback-pause-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.image = this.play_image;
    // States false - paused, true - playing
    this.state = false;
    this.connect ("clicked", () => {
      this.emit ("play", !this.state);
    });
  },

  toggle: function (state) {
    state = (typeof state !== 'undefined') ?  state : !this.state;
    if (state == this.state) return;
    this.state = state;
    if (this.state) this.image = this.pause_image;
    else this.image = this.play_image;
  }
});

var AspectFrame = new Lang.Class ({
  Name: "AspectFrame",
  Extends: Clutter.Actor,

  _init: function () {
    this.parent ({name: "frame"});
    this.set_pivot_point ( 0.5, 0.5);
  },

  vfunc_allocate: function (box, flags) {
    this.parent (box, flags);
    let child = this.get_child_at_index (0);
    if (!child) return;
    var box_width = box.x2 - box.x1;
    var box_height = box.y2 - box.y1;
    let [,,width, height] = child.get_preferred_size ();
    if (width <= 0 || height <= 0) return;

    var aspect = box_width / box_height;
    var child_aspect = width / height;

    if (aspect < child_aspect) {
      width = box_width;
      height = box_width / child_aspect;
    } else {
      height = box_height;
      width = box_height * child_aspect;
    }
    let child_box = new Clutter.ActorBox({
      x1: (box_width - width) / 2,
      y1: (box_height - height) / 2,
      x2: (box_width - width) / 2 + width,
      y2: (box_height - height) / 2 + height
    });
    child.allocate (child_box, flags);
    child.queue_redraw ();
  },

  on_pick: function (color) {
    let child = this.get_child_at_index (0);
    if (!child) return;
    child.paint ();
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
