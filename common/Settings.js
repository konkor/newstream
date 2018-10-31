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
const Gio = imports.gi.Gio;

let app_data_dir = get_app_data_dir ();

const SAVE_SETTINGS_KEY = 'save-settings';
const HISTORY_SIZE_KEY = 'history-size';

let save = true;
let history = [];
let history_size = 5;

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
    _save = this.get_boolean (SAVE_SETTINGS_KEY);
    _history_size = this.get_int (HISTORY_SIZE_KEY);
  },

  get save () { return _save; },
  set save (val) {
    _save = val;
    this.set_boolean (SAVE_SETTINGS_KEY, _save);
  },

  get history () { return _history; },
  set history (val) {
    _history = val;
    //TODO HISTORY_ROTATION
  },

  get history_size () { return _history_size; },
  set history_size (val) {
    _history_size = val;
    this.set_int (HISTORY_SIZE_KEY, _history_size);
  }

});

function get_app_data_dir () {
  let path = GLib.build_filenamev ([GLib.get_user_data_dir(),"newstream"]);
  if (!GLib.file_test (GLib.FileTest.EXISTS))
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