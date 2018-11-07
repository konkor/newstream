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
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const Window = imports.common.MainWindow;

var NewStreamApplication = new Lang.Class ({
  Name: "NewStreamApplication",
  Extends: Gtk.Application,

  _init: function (args) {
    this.parent ({
      application_id: "io.github.konkor.newstream",
      flags: Gio.ApplicationFlags.HANDLES_OPEN
    });
    GLib.set_prgname ("New Stream");
    GLib.set_application_name ("New Stream");
  },

  vfunc_startup: function() {
    this.parent();
    this.window = new Window.MainWindow (this);
    this.add_window (this.window);
  },

  vfunc_activate: function() {
    this.window.show_all ();
    this.window.present ();
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
