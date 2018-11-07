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
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);

const Prefs = imports.common.Settings;
const Provider = imports.common.SearchProvider;
const Search = imports.common.Search;
const Layouts = imports.common.Layouts;

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;

var MainWindow = new Lang.Class ({
  Name: "MainWindow",
  Extends: Gtk.Window,

  _init: function (args) {
    this.parent();
    this.set_icon_name ("io.github.konkor.newstream");
    if (!this.icon) try {
      this.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/io.github.konkor.newstream.svg").pixbuf;
    } catch (e) {
      error (e.message);
    }
    this.settings = new Prefs.Settings ();
    this.provider = new Provider.SearchProvider ();
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

    let mmenu = new Gtk.Menu ();
    let mii = new Gtk.MenuItem ({label:"About"});
    mmenu.add (mii);
    mmenu.show_all ();

    this.menu_button = new Gtk.MenuButton ({tooltip_text:"Application Menu"});
    this.menu_button.image = Gtk.Image.new_from_icon_name ("open-menu-symbolic",Gtk.IconSize.LARGE_TOOLBAR);
    this.menu_button.get_style_context ().add_class ("hb-button");
    this.menu_button.set_relief (Gtk.ReliefStyle.NONE);
    //this.menu_button.menu_model = mmenu;
    this.menu_button.set_popup (mmenu);
    //this.menu_button.margin = 6;
    this.hb.pack_end (this.menu_button);

    this.phones = new Gtk.Button ({always_show_image: true, tooltip_text:"Background Player"});
    this.phones.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/headphones-symbolic.svg");
    this.phones.get_style_context ().add_class ("hb-button");
    //this.phones.margin = 6;
    this.phones.no_show_all = true;
    this.hb.pack_end (this.phones);
    this.phones.connect ('clicked', Lang.bind (this, () => {
     this.back.last = this.stack.visible_child_name;
     this.stack.visible_child_name = "item";
    }));

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
    this.stack.add_named (this.itemview, "item");

    this.hotview.query ();

    this.topbar.connect ('stack_update', Lang.bind (this, this.on_stack_update));
    this.searchview.connect ('ready', Lang.bind (this, ()=>{
      this.stack.visible_child_name = "search";
    }));
    this.searchbar.search_button.connect ('clicked', Lang.bind (this, this.on_search));
    this.back.connect ('clicked', Lang.bind (this, this.on_back));
    this.connect ('key-press-event', Lang.bind (this, (o,e)=>{
     this.on_key_press (e);
    }));
    this.stack.connect ('notify::visible-child-name', Lang.bind (this, (o,e)=>{
     if (this.stack.visible_child_name != "item" && this.itemview.playing)
      this.phones.visible = true;
     else this.phones.visible = false;
    }));
    this.connect ('unmap', Lang.bind (this, this.save_geometry));
  },

  save_geometry: function () {
    this.settings.save_geometry (this);
  },

  restore_position: function () {
    if (!this.is_maximized)
      this.move (this.settings.window_x, this.settings.window_y);
  },

  on_stack_update: function (o, index) {
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

  on_key_press: function (e) {
   var [,key] = e.get_keyval ();
   switch (key) {
    case Gdk.KEY_Escape:
     if (this.back.visible) this.on_back ();
     break;
   }
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
    btn.connect ('toggled', Lang.bind (this, this.on_toggle));
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
   if (!this.history.length || this.history[this.history.length-1] != value)
    this.history.push (value);
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
