/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Lang = imports.lang;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

let app_data_dir = get_app_data_dir ();

let save = true;
let history = [];
let history_size = 5000;
let window_height = 480;
let window_width = 800;
let window_x = 0;
let window_y = 0;
let window_maximized = false;

var Settings = new Lang.Class({
  Name: "Settings",
  Extends: Gio.Settings,

  _init: function () {
    const schema = 'io.github.konkor.newstream';
    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = Gio.File.new_for_path (getCurrentFile()[1] + '/schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
      schemaSource = GioSSS.new_from_directory (
        schemaDir.get_path(),
        GioSSS.get_default(),
        false
      );
    else
      schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
      throw new Error('Schema ' + schema + ' could not be found. \n' +
                      'Please check your installation.');
    this.parent ({ settings_schema: schemaObj });
    this.load ();
  },

  load: function () {
    save = this.get_boolean ("save-settings");
    history_size = this.get_int ("history-size");
    this.load_history ();
    window_height = this.get_int ("window-height");
    window_width = this.get_int ("window-width");
    window_x = this.get_int ("window-x");
    window_y = this.get_int ("window-y");
    window_maximized = this.get_boolean ("window-maximized");
  },

  get save () { return save; },
  set save (val) {
    save = val;
    this.set_boolean ("save-settings", save);
  },

  get window_height () { return window_height; },
  get window_width () { return window_width; },
  get window_x () { return window_x; },
  get window_y () { return window_y; },
  get window_maximized () { return window_maximized; },

  save_geometry: function (o) {
    let window = o.get_window ();
    if (!window) return;
    let ws = window.get_state();
    let x = 0, y = 0;
    window_maximized = false;

    if (Gdk.WindowState.MAXIMIZED & ws) {
      window_maximized = true;
    } else if ((Gdk.WindowState.TILED & ws) == 0) {
      [x, y, window_width, window_height] = window.get_geometry ();
      [, x, y] = window.get_origin ();
      if (x > 0 && y > 0) {
        window_x = x; window_y = y;
      }
    }

    this.set_int ("window-height", window_height);
    this.set_int ("window-width", window_width);
    this.set_int ("window-x", window_x);
    this.set_int ("window-y", window_y);
    this.set_boolean ("window-maximized", window_maximized);
  },

  get history () { return history; },
  set history (val) {
    history = val;
    this.save_history ();
  },

  get history_size () { return history_size; },
  set history_size (val) {
    history_size = val;
    this.set_int ("history-size", history_size);
  },

  history_add: function (text) {
    if (!text) return;
    let s = text.trim ();
    if (!s) return;

    var i = history.indexOf (s);
    if (i > -1) history.splice (i, 1);
    history.unshift (s);

    //saving history
    if (history_size < 1) return;
    if (history.length > history_size) history.pop ();
    this.save_history ();
  },

  save_history: function () {
    GLib.file_set_contents (app_data_dir + "/history.json", JSON.stringify (history));
  },

  load_history: function () {
    let f = Gio.file_new_for_path (app_data_dir + "/history.json");
    if (f.query_exists(null)) {
      var [res, ar, tags] = f.load_contents (null);
      if (res) try {
        history = JSON.parse (ar);
      } catch (e) {
        history = [];
      }
    }
  }

});

function get_app_data_dir () {
  let path = GLib.build_filenamev ([GLib.get_user_data_dir(),"newstream"]);
  if (!GLib.file_test (path, GLib.FileTest.EXISTS))
    GLib.mkdir_with_parents (path, 484);
  return path;
}

function getCurrentFile () {
  let stack = (new Error()).stack;
  let stackLine = stack.split('\n')[1];
  if (!stackLine)
    throw new Error ('Could not find current file');
  let match = new RegExp ('@(.+):\\d+').exec(stackLine);
  if (!match)
    throw new Error ('Could not find current file');
  let path = match[1];
  let file = Gio.File.new_for_path (path).get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
