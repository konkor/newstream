/*
 * This is a part of NewStream package
 * Copyright (C) 2018-2019 konkor <konkor.github.io>
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
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const Logger = imports.common.Logger;
const Prefs = imports.common.Settings;
const Provider = imports.common.SearchProvider;
const Search = imports.common.Search;
const Layouts = imports.common.Layouts;
const Menu = imports.common.SideMenu;
const Utils = imports.common.Utils;

let APPDIR = "";
let theme_gui = "/data/themes/default/gtk.css";
let cssp = null;

var MainWindow = new Lang.Class ({
  Name: "MainWindow",
  Extends: Gtk.ApplicationWindow,

  _init: function (params) {
    this.parent (params);
    APPDIR = this.application.current_dir;
    theme_gui = APPDIR + theme_gui;
    this.set_icon_name ("io.github.konkor.newstream");
    if (!this.icon) try {
      this.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/hicolor/scalable/apps/io.github.konkor.newstream.svg").pixbuf;
    } catch (e) {
      error (e.message);
    }
    this.settings = new Prefs.Settings ();
    this.provider = new Provider.SearchProvider ();
    let ydl_install = Utils.check_install_ydl ();
    if (!ydl_install) Utils.install_ydl ();
    else Utils.check_update_ydl ();
    this.build ();
    this.restore_position ();
    if (this.settings.window_maximized) this.maximize ();
  },

  build: function() {
    this.set_default_size (this.settings.window_width, this.settings.window_height);
    Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
    cssp = get_css_provider ();
    if (cssp) {
      Gtk.StyleContext.add_provider_for_screen (
        this.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    }
    this.hb = new Gtk.HeaderBar ();
    this.hb.set_show_close_button (true);
    this.hb.get_style_context ().add_class ("hb");
    this.set_titlebar (this.hb);

    this.home = new Gtk.Button ({always_show_image: true, tooltip_text:"Home"});
    this.home.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/io.github.konkor.newstream.svg");
    //this.home.get_style_context ().add_class ("hb-button");
    this.home.set_relief (Gtk.ReliefStyle.NONE);
    //this.home.margin = 4;
    this.hb.add (this.home);
    this.home.connect ('clicked', () => {
     let app = Gio.AppInfo.get_default_for_uri_scheme ("https");
     app.launch_uris (["https://github.com/konkor/newstream"], null);
    });

    this.back = new BackButton ();
    this.hb.add (this.back);

    this.section = new Gtk.Label ({label:"New Stream", wrap: true, lines: 1, ellipsize: 3, xalign:0});
    this.section.width_chars = 12;
    this.hb.add (this.section);

    this.menu_button = new Gtk.MenuButton ({tooltip_text:"Application Menu"});
    this.menu_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/open-menu-symbolic.svg");
    this.menu_button.get_style_context ().add_class ("hb-button");
    this.menu_button.set_relief (Gtk.ReliefStyle.NONE);
    //this.menu_button.margin = 6;
    this.hb.pack_end (this.menu_button);

    this.phones = new Gtk.Button ({always_show_image: true, tooltip_text:"Background Player"});
    this.phones.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/headphones-symbolic.svg");
    this.phones.get_style_context ().add_class ("hb-button");
    //this.phones.margin = 6;
    this.phones.no_show_all = true;
    this.hb.pack_end (this.phones);
    this.phones.connect ('clicked', () => {
     this.back.last = this.stack.visible_child_name;
     this.stack.visible_child_name = "item";
    });

    this.player_menu = new PlayerMenu ();
    this.hb.pack_end (this.player_menu);

    this.fullscreen = Gtk.Button.new_from_icon_name ("view-fullscreen-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.fullscreen.get_style_context ().add_class ("hb-button");
    this.fullscreen.set_relief (Gtk.ReliefStyle.NONE);
    this.fullscreen.no_show_all = true;
    this.hb.pack_end (this.fullscreen);
    this.fullscreen.connect ('clicked', () => {
      this.application.lookup_action ("toggle-fullscreen").activate (null);
    });

    let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.add (box);

    this.searchbar = new Search.Searchbar (this);
    box.add (this.searchbar);

    this.topbar = new Topbar ();
    box.add (this.topbar);

    this.stack = new Gtk.Stack ();
    this.stack.transition_type = Gtk.StackTransitionType.SLIDE_UP_DOWN;
    box.pack_start (this.stack, true, true, 0);

    this.hotview = new Layouts.HotView (this);
    this.stack.add_named (this.hotview, "0");

    this.newview = new Layouts.NewView (this);
    this.stack.add_named (this.newview, "1");

    this.hitview = new Layouts.HitView (this);
    this.stack.add_named (this.hitview, "2");

    this.searchview = new Layouts.SearchView (this);
    this.stack.add_named (this.searchview, "search");

    this.itemview = new Layouts.ItemLayout (this);
    this.player_menu.player = this.itemview.player;
    this.stack.add_named (this.itemview, "item");

    this.history = new Layouts.HistoryLayout (this);
    this.stack.add_named (this.history, "history");

    this.bookmarks = new Layouts.BookmarkLayout (this);
    this.stack.add_named (this.bookmarks, "bookmarks");

    this.subscriptions = new Layouts.SubscriptionLayout (this);
    this.stack.add_named (this.subscriptions, "subscriptions");

    this.channelview = new Layouts.ChannelLayout (this);
    this.stack.add_named (this.channelview, "channel");

    let mmenu = new Gtk.Menu (), mii;

    mii = new Gtk.MenuItem ({label:"Bookmarks"});
    this.set_accel (mii, "<Ctrl>B");
    mii.set_action_name ("app.bookmarks");
    mmenu.add (mii);

    mii = new Gtk.MenuItem ({label:"Subscriptions"});
    this.set_accel (mii, "<Ctrl>S");
    mii.set_action_name ("app.subscriptions");
    mmenu.add (mii);

    this.player_mi = new Gtk.MenuItem ({label:"Player", sensitive:false});
    this.set_accel (this.player_mi, "P");
    this.player_mi.set_action_name ("app.player");
    mmenu.add (this.player_mi);

    mii = new Gtk.MenuItem ({label:"Last Channel", sensitive:false});
    this.set_accel (mii, "C");
    mii.set_action_name ("app.channel");
    mmenu.add (mii);

    mii = new Gtk.MenuItem ({label:"Last Search"});
    this.set_accel (mii, "<Alt>S");
    mii.set_action_name ("app.search");
    mmenu.add (mii);

    mii = new Gtk.MenuItem ({label:"History"});
    this.set_accel (mii, "<Ctrl>H");
    mii.set_action_name ("app.history");
    mmenu.add (mii);

    mmenu.add (new Gtk.SeparatorMenuItem ());
    mii = new Gtk.MenuItem ({label:"About"});
    mmenu.add (mii);
    mii.connect ("activate", () => {this.about ()});

    mmenu.show_all ();
    this.menu_button.set_popup (mmenu);

    this.hotview.query ();

    this.topbar.connect ('stack_update', this.on_stack_update.bind (this));
    this.searchview.connect ('ready', () => {
      this.stack.visible_child_name = "search";
      this.application.lookup_action ("search-enabled").activate (null);
    });
    this.channelview.connect ('ready', () => {
      this.stack.visible_child_name = "channel";
      this.application.lookup_action ("channel-enabled").activate (null);
    });
    this.searchbar.search_button.connect ('clicked', this.on_search.bind (this));
    this.back.connect ('clicked', this.on_back.bind (this));
    this.connect ('delete_event', () => {
      this.application.quit ();
    });
    this.stack.connect ('notify::visible-child-name', (o,e) => {
      if (this.stack.visible_child_name != "item" && this.itemview.playing)
        this.phones.visible = true;
      else this.phones.visible = false;
    });
    this.connect ('unmap', this.save_geometry.bind (this));
  },

  set_accel: function (mi, accel) {
    if (!accel || !mi) return;
    let [key,mods] = Gtk.accelerator_parse (accel);
    let label = mi.get_child ();
    if (label && key) label.set_accel (key, mods);
  },

  save_geometry: function () {
    this.settings.save_geometry (this);
  },

  restore_position: function () {
    if (!this.is_maximized)
      this.move (this.settings.window_x, this.settings.window_y);
  },

  on_stack_update: function (o, index) {
    if (this.stack.visible_child_name != index.toString ())
      this.back.last = this.stack.visible_child_name;
    this.stack.visible_child_name = index.toString ();
    if (index == 0) this.hotview.query ();
    else if (index == 1) this.newview.query ();
    else if (index == 2) this.hitview.query ();
  },

  on_search: function () {
    if (!this.searchbar.entry.text) return;
    this.back.last = this.stack.visible_child_name;
    this.searchview.query (this.searchbar.entry.text);
    this.settings.history_add (this.searchbar.entry.text);
  },

  on_back: function () {
    var view = this.back.last;
    if (!view) return;
    this.stack.visible_child_name = view;
  },

  about: function () {
    let dlg = new Gtk.AboutDialog ({
      transient_for: this,
      program_name: "New Stream",
      copyright: "Copyright © 2018 konkor <konkor.github.io>",
      license_type: Gtk.License.GPL_3_0,
      authors: ["konkor"],
      website: "https://github.com/konkor/newstream",
      logo: this.icon,
      logo_icon_name: "io.github.konkor.newstream"
    });
    dlg.run ();
    dlg.destroy ();
  }
});

var Topbar = new Lang.Class({
  Name: "Topbar",
  Extends: Gtk.Box,
  Signals: {
    'stack_update': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_INT]},
  },

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
    this.get_style_context ().add_class ("sb");
    this.buttons = [];

    this.add_button ("Hot", "Trending Videos");
    this.add_button ("24h", "Latest Videos");
    this.add_button ("Hit", "Hit Videos");

    this.current = 0;
  },

  add_button: function (label, tooltip) {
    let btn = new Gtk.ToggleButton ({label:label, tooltip_text:tooltip});
    btn.get_style_context ().add_class ("sb-button");
    btn.index = this.buttons.length;
    if (btn.index == 0) btn.active = true;
    this.pack_start (btn, true, true, 0);
    this.buttons.push (btn);
    btn.connect ('toggled', this.on_toggle.bind (this));
  },

  on_toggle: function (o) {
    if (this.toggle_lock) return;
    if (o.index == this.current) {
      if (!o.active) o.active = true;
      return;
    }
    this.toggle_lock = true;
    this.buttons[this.current].active = false;
    this.current = o.index;
    this.emit ('stack_update', o.index);
    this.toggle_lock = false;
  }
});

var BackButton = new Lang.Class({
  Name: "BackButton",
  Extends: Gtk.Button,

  _init: function () {
    this.parent ({always_show_image: true, tooltip_text:"Back (Escape)"});
    this.get_style_context ().add_class ("hb-button");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/back-symbolic.svg");
    this.history = [];
    //this.set_size_request (64,-1);
  },

  get last () {
   var view = this.history.pop () || "";
   return view;
  },

  set last (value) {
    //if (value == "item") return;
    if (!this.history.length || this.history[this.history.length-1] != value)
      this.history.push (value);
  }
});

let qs = [144,240,360,480,720,1080,1440,2160,4320];
var PlayerMenu = new Lang.Class ({
  Name: "PlayerMenu",
  Extends: Gtk.MenuButton,

  _init: function () {
    this.parent ({tooltip_text:"Player Menu"});
    this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/open-menu-symbolic.svg");
    this.get_style_context ().add_class ("hb-button");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.use_popover = true;

    let popover = new Gtk.Popover ();
    this.popover = popover;

    this.menu = new Menu.SideMenu ();
    this.menu.set_size_request (224, 32);
    popover.add (this.menu);
    this.add_profiles ();

    this.video = new Menu.SideSubmenu ("Auto", "", "Video Stream");
    this.video.info.add (Gtk.Image.new_from_icon_name ("camera-video-symbolic", Gtk.IconSize.SMALL_TOOLBAR));
    this.menu.add_submenu (this.video);

    this.audio = new Menu.SideSubmenu ("Auto", "", "Audio Stream");
    this.audio.info.add (Gtk.Image.new_from_icon_name ("audio-speakers-symbolic", Gtk.IconSize.SMALL_TOOLBAR));
    this.menu.add_submenu (this.audio);

    this.menu.show_all ();
    this.video.visible = false;
    this.audio.visible = false;
  },

  load_formats: function (formats) {
    let item, i = 0, maxq = -1;
    this.audio_auto = true;
    this.audio_format = null;
    this.video_auto = true;
    this.video_format = null;
    this.video.remove_all ();
    item = new Menu.SideItem ("Auto");
    this.video.add_item (item);
    item.connect ('clicked', this.on_video_auto.bind (this));
    item = new Menu.SideItem ("None Video");
    this.video.add_item (item);
    item.connect ('clicked', this.on_video_none.bind (this));

    this.audio.remove_all ();
    item = new Menu.SideItem ("Auto");
    this.audio.add_item (item);
    item.connect ('clicked', this.on_audio_auto.bind (this));
    item = new Menu.SideItem ("None Sound");
    this.audio.add_item (item);
    item.connect ('clicked', this.on_audio_none.bind (this));

    this.formats = formats;
    if (!formats) return;
    formats.forEach (p => {
      if (p.vcodec != "none") this.add_video_format (p);
      if (p.acodec != "none") this.add_audio_format (p);
      if (p.vcodec == "none") return;
      if (p.height > maxq) maxq = p.height;
    });
    this.profiles.section.get_children ().forEach (p => {
      if (i > 1) p.visible = maxq >= qs[i-2];
      i++;
    });
  },

  add_video_format: function (format) {
    let item = new Menu.SideItem (this.get_format_string (format));
    if (format.filesize) item.info.info.set_text (GLib.format_size (format.filesize));
    item.format = format;
    this.video.add_item (item);
    item.connect ('clicked', this.on_video_format.bind (this));
  },

  on_video_format: function (o) {
    this.video.info.label.set_text (o.info.label.label);
    debug (o.format.url);
    if (this.player && o.format.url) {
      this.player.set_video (o.format.url);
      if ((o.format.acodec == "none") && (this.audio_auto)) {
        this.player.set_audio (this.choose_auto_audio (o.format));
      }
    }
    this.video_auto = false;
  },

  on_video_auto: function () {
    //TODO
    this.video.info.label.set_text ("Auto");
  },

  on_video_none: function () {
    this.video.info.label.set_text ("None");
    this.player.set_video ();
    this.player.set_audio (this.choose_auto_audio ());
    this.video_auto = false;
  },

  add_audio_format: function (format) {
    let item = new Menu.SideItem (this.get_format_string (format));
    if (format.filesize) item.info.info.set_text (GLib.format_size (format.filesize));
    item.format = format;
    this.audio.add_item (item);
    item.connect ('clicked', this.on_audio_format.bind (this));
  },

  on_audio_format: function (o) {
    //TODO
    this.audio.info.label.set_text (o.info.label.label);
    debug (o.format.url);
    if (this.player && o.format.url) this.player.set_audio (o.format.url);
  },

  on_audio_auto: function () {
    //TODO
    this.audio.info.label.set_text ("Auto");
  },

  on_audio_none: function () {
    //TODO
    this.audio.info.label.set_text ("None");
  },

  choose_auto_audio: function (video_format) {
    let best = null;
    if (!this.audio_auto)
      if (this.audio_format) return this.audio_format.url;
      else return null;
    if (this.formats) this.formats.forEach (f => {
      if (f.acodec != "none") {
        if (!best) best = f;
        else if (f.vcodec == "none") {
          if ((best.abr <= f.abr) || (video_format && (f.ext == video_format.ext))) best = f;
        }
      }
    });
    debug ("choose_auto_audio: %s".format (JSON.stringify (best)));
    if (best) return best.url;
    return null;
  },

  get_format_string: function (f) {
    let s = "";
    if (f.vcodec != "none") {
      s = "%sp %s %s".format (f.height, f.ext, f.vcodec);
    }
    if (f.acodec != "none") {
      if (s) s += " / ";
      s += "%d kbit %s".format (f.abr, f.acodec);
    }
    return s.trim ();
  },

  add_profiles: function () {
    let item, i = 0;
    this.profiles = new Menu.SideSubmenu ("Auto", "", "Quality Preset");
    this.profiles.info.add (Gtk.Image.new_from_icon_name ("emblem-system-symbolic", Gtk.IconSize.SMALL_TOOLBAR));
    this.menu.add_submenu (this.profiles);

    item = new Menu.SideItem ("Auto");
    this.profiles.add_item (item);
    item.connect ('clicked', (o) => {
      this.profiles.info.label.set_text (o.info.label.label);
      this.profiles.button.tooltip_text = "Quality Preset";
      this.on_custom_profile ();
    });
    item = new Menu.SideItem ("Custom");
    this.profiles.add_item (item);
    item.connect ('clicked', this.on_custom_profile.bind (this));
    ["Lowest","Mobile","Video CD","DVD Video","HD Ready","Full HD","2K Video","4K Video","8K Video"].forEach (s => {
      item = new Menu.SideItem (s,"",qs[i++] + "p");
      item.id = i - 1;
      this.profiles.add_item (item);
      item.connect ('clicked', this.on_profile.bind (this));
    });
  },

  on_profile: function (o) {
    //TODO: on profile selected
    this.on_custom_profile ();
    this.profiles.info.label.set_text (o.info.label.label);
    this.profiles.button.tooltip_text = o.info.info.label;
  },

  on_custom_profile: function (o) {
    this.video.visible = this.audio.visible = !!o;
    if (this.video.visible) {
      this.profiles.info.label.set_text ("Custom");
      this.profiles.button.tooltip_text = "Quality Preset";
    }
    this.menu.on_submenu_activate ();
  }
});

function get_css_provider () {
  let cssp = new Gtk.CssProvider ();
  let css_file = Gio.File.new_for_path (theme_gui);
  try {
    cssp.load_from_file (css_file);
  } catch (e) {
    print (e);
    cssp = null;
  }
  return cssp;
}

const DOMAIN = "MainWindow";
function error (msg) {Logger.error (DOMAIN, msg)}
function debug (msg) {Logger.debug (DOMAIN, msg)}
function info (msg) {Logger.info (DOMAIN, msg)}
