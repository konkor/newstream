/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);

var Searchbar = new Lang.Class({
  Name: "Searchbar",
  Extends: Gtk.Box,

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
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

    this.clear_button.connect ('clicked', Lang.bind (this, ()=>{
      this.entry.text = "";
    }));
    this.entry.connect ('key_press_event', Lang.bind (this, (o, e)=>{
      var [,key] = e.get_keyval ();
      if (key == Gdk.KEY_Escape) this.entry.text = "";
    }));
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
