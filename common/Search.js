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

var Searchbar = new Lang.Class({
  Name: "Searchbar",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.settings = sender.settings;
    this.get_style_context ().add_class ("search-bar");

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    box.margin = 8;
    this.pack_start (box, true, true, 0);

    let space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    this.search_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Search"});
    this.search_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/folder-saved-search-symbolic.svg");
    this.search_button.get_style_context ().add_class ("hb-button");
    box.pack_start (this.search_button, false, false, 8);

    this.entry = new Gtk.Entry ();
    this.entry.get_style_context ().add_class ("search-entry");
    this.entry.input_hints = Gtk.InputHints.SPELLCHECK | Gtk.InputHints.WORD_COMPLETION;
    this.entry.placeholder_text = "Search";
    box.pack_start (this.entry, true, true, 0);

    this.clear_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Clear"});
    this.clear_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/window-close-symbolic.svg");
    this.clear_button.get_style_context ().add_class ("hb-button");
    box.pack_start (this.clear_button, false, false, 8);

    space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    this.history = new SearchHistory (this);
    this.add (this.history);

    this.clear_button.connect ('clicked', Lang.bind (this, ()=>{
      this.entry.text = "";
    }));
    this.entry.connect ('key_press_event', Lang.bind (this, (o, e)=>{
      var [,key] = e.get_keyval ();
      if (key == Gdk.KEY_Escape) this.entry.text = "";
    }));
    this.entry.connect ('activate', Lang.bind (this, ()=>{
      this.search_button.clicked ();
    }));
    this.entry.connect ('notify::text', Lang.bind (this, (o,a)=>{
      this.history.update ();
    }));
    this.entry.connect ('focus-in-event', Lang.bind (this, (o, e)=>{
      this.history.visible = true;
    }));
    this.entry.connect ('focus-out-event', Lang.bind (this, (o, e)=>{
      //this.history.visible = false;
      GLib.timeout_add (0, 200, Lang.bind (this, ()=>{
        this.history.visible = false;
        return false;
      }));
    }));
    this.history.connect ('selected', Lang.bind (this, (o, t)=>{
      //print ("selected", t);
      this.entry.text = t;
      this.search_button.clicked ();
    }));
  }
});

var SearchHistory = new Lang.Class({
  Name: "SearchHistory",
  Extends: Gtk.Box,
  Signals: {
    'selected': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_STRING]},
  },

  _init: function (bar) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL, spacing:8});
    this.get_style_context ().add_class ("search-bar");
    this.no_show_all = true;
    this.bar = bar;

    this.items = [];

    this.items.push (new SearchHistoryItem ());
    this.items.push (new SearchHistoryItem ());
    this.items.push (new SearchHistoryItem ());
    this.items.forEach (p => {
      this.add (p);
      p.connect ("clicked", Lang.bind (this, (o)=>{
        this.emit ("selected", o.get_label ());
      }));
    });

    this.connect ("map", Lang.bind (this, this.update));
  },

  update: function (o, e) {
    let history = this.get_history ();
    for (let i = 0; i < 3; i++) {
      if (history[i]) this.items[i].set_text (history[i]);
      else this.items[i].set_text ("");
    }
  },

  get_history: function () {
    var filter = this.bar.entry.text.trim().toLowerCase();
    var sh = this.bar.settings.history;
    let history = [];
    for (let i = 0; i < sh.length; i++) {
      if (filter) {
        if (sh[i].toLowerCase().indexOf (filter) > -1)
          history.push (sh[i]);
      } else history.push (sh[i]);
      if (history.length > 2) break;
    }
    return history;
  }

});

var SearchHistoryItem = new Lang.Class({
  Name: "SearchHistoryItem",
  Extends: Gtk.Button,

  _init: function (text) {
    this.parent ({always_show_image: true, tooltip_text:"Search History", xalign:0});
    //this.get_style_context ().add_class ("search-bar");
    this.set_relief (Gtk.ReliefStyle.NONE);

    this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/history-symbolic.svg");
    var l = this.get_image ();
    l.margin_right = 12;
    l.margin_left = 64;

    //wrap: true, lines: 1, ellipsize: 3, xalign:0});
    //this.width_chars = 12;
    this.show_all ();
    this.set_text (text);
  },

  set_text: function (text) {
    text = text || "";
    this.set_label (text.trim());
    this.visible = this.get_label().length != 0;
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