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

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const Utils = imports.common.Utils;

let app_data_dir = get_app_data_dir ();

let save = true;
let history = [];
let history_size = 5000;
let view_history = [];
let view_history_size = 1000;
let bookmarks = [];
let channels = [];
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
    this.view_history_modified = true;
  },

  load: function () {
    save = this.get_boolean ("save-settings");
    history_size = this.get_int ("history-size");
    view_history_size = this.get_int ("view-history-size");
    this.load_history ();
    this.load_view_history ();
    this.load_bookmarks ();
    this.load_channels ();
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
        history = JSON.parse (Utils.bytesToString (ar));
      } catch (e) {
        history = [];
      }
    }
  },

  get view_history_size () { return view_history_size; },
  set view_history_size (val) {
    view_history_size = val;
    this.set_int ("view-history-size", view_history_size);
  },

  get view_history () { return view_history; },

  viewed: function (id) {
    return id && (view_history.indexOf (id) > -1);
  },

  add_view_history: function (data) {
    if (!data || !data.id) return;
    let s = data.id;
    if (!data.local) data.local = {views: 1};
    data.local.last = Date.now ();

    var i = view_history.indexOf (s);
    if (i > -1) {
      view_history.splice (i, 1);
      let it = this.get_view_history_item (s);
      if (it && it.local) data.local.views = it.local.views + 1;
    }
    view_history.unshift (s);

    //saving history
    if (view_history_size < 1) return;
    if (view_history.length > view_history_size) {
      s = view_history.pop ();
      if (s && !this.booked (s)) this.remove_data (s);
    }
    this.save_view_history (data);
    this.view_history_modified = true;
  },

  get_view_history_item: function (id) {
    let data = null;
    let f = Gio.file_new_for_path (app_data_dir + "/data/" + id + ".json");
    if (f.query_exists(null)) {
      var [res, ar, tags] = f.load_contents (null);
      if (res) try {
        data = JSON.parse (Utils.bytesToString (ar));
      } catch (e) {
        print ("Can't load item " + app_data_dir + "/" + s + ".json ...");
      }
    }
    return data;
  },

  save_view_history: function (data) {
    GLib.file_set_contents (app_data_dir + "/view_history.json", JSON.stringify (view_history));
    this.add_data (data);
  },

  load_view_history: function () {
    let f = Gio.file_new_for_path (app_data_dir + "/view_history.json");
    if (f.query_exists(null)) {
      var [res, ar, tags] = f.load_contents (null);
      if (res) try {
        view_history = JSON.parse (Utils.bytesToString (ar));
      } catch (e) {
        view_history = [];
      }
    }
  },

  add_data: function (data) {
    if (!data && !data.id) return;
    try {
      GLib.file_set_contents (app_data_dir + "/data/" + data.id + ".json", JSON.stringify (data));
    } catch (e) {
      print ("Can't store " + app_data_dir + "/data/" + data.id + ".json ...\n", e);
    }
  },

  remove_data: function (id) {
    try {
      Gio.File.new_for_path (app_data_dir + "/data/" + id + ".json").delete (null);
    } catch (e) {
      print ("Can't delete " + app_data_dir + "/data/" + id + ".json ...\n", e);
    }
  },

  get bookmarks () { return bookmarks; },

  booked: function (id) {
    return id && (bookmarks.indexOf (id) > -1);
  },

  load_bookmarks: function () {
    let f = Gio.file_new_for_path (app_data_dir + "/bookmarks.json");
    if (f.query_exists(null)) {
      var [res, ar, tags] = f.load_contents (null);
      if (res) try {
        bookmarks = JSON.parse (Utils.bytesToString (ar));
      } catch (e) {
        bookmarks = [];
      }
    }
    this.bookmarks_modified = true;
  },

  toggle_bookmark: function (id, state) {
    print ("toggle_bookmark", id, state);
    if (!id || (this.booked (id) && state) || (!this.booked (id) && !state)) return;
    if (state) bookmarks.unshift (id);
    else {
      bookmarks.splice (bookmarks.indexOf (id), 1);
      if (!this.viewed (id)) this.remove_data (id);
    }
    try {
      GLib.file_set_contents (app_data_dir + "/bookmarks.json", JSON.stringify (bookmarks));
    } catch (e) {
      print (e);
    }
    this.bookmarks_modified = true;
  },

  get channels () { return channels; },

  subscribed: function (id) {
    return id && (channels.indexOf (id) > -1);
  },

  load_channels: function () {
    let f = Gio.file_new_for_path (app_data_dir + "/channels.json");
    if (f.query_exists(null)) {
      var [res, ar, tags] = f.load_contents (null);
      if (res) try {
        channels = JSON.parse (Utils.bytesToString (ar));
      } catch (e) {
        channels = [];
      }
    }
    this.channels_modified = true;
  },

  toggle_channel: function (channel, state) {
    let id = channel.id;
    if (!id || (this.subscribed (id) && state) || (!this.subscribed (id) && !state)) return;
    if (state) {
      channels.unshift (id);
      this.add_data (channel);
    } else {
      channels.splice (channels.indexOf (id), 1);
      this.remove_data (id);
    }
    try {
      GLib.file_set_contents (app_data_dir + "/channels.json", JSON.stringify (channels));
    } catch (e) {
      print (e);
    }
    this.channels_modified = true;
  }

});

function get_app_data_dir () {
  let path = GLib.build_filenamev ([GLib.get_user_data_dir(),"newstream"]);
  if (!GLib.file_test (path, GLib.FileTest.EXISTS))
    GLib.mkdir_with_parents (path, 484);
  if (!GLib.file_test (path + "/data", GLib.FileTest.EXISTS))
    GLib.mkdir_with_parents (path + "/data", 484);
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
