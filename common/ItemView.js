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
    this.owner = owner;

    this.scroll = new Gtk.ScrolledWindow ();
    this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.scroll.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.scroll.shadow_type = Gtk.ShadowType.NONE;
    this.pack_start (this.scroll, true, true, 0);

    this.box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.scroll.add (this.box);

    this.player = new Player.Player (this.owner);
    this.box.pack_start (this.player, true, true, 0);

    this.results = new ResultView.ResultView (owner);
    this.box.pack_end (this.results, true, true, 0);
  },

  load: function (item) {
    this.player.load (item);
  },

  get playing () {
    return this.player.engine.state == 4;
  },

  clear_all: function () {

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
