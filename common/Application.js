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

    let action_entries = [
      { name: "bookmarks",
        activate: () => {
          this.unfullscreen ();
          this.window.on_stack_update (this, "bookmarks");
        },
        accels: ["b", "<Primary>b"]
      },
      { name: "history",
        activate: () => {
          this.unfullscreen ();
          this.window.on_stack_update (this, "history");
        },
        accels: ["h", "<Primary>h"]
      },
      { name: "search",
        activate: () => {
          this.unfullscreen ();
          this.window.on_stack_update (this, "search");
        },
        accels: ["s", "<Primary>s"],
        enabled: false
      },
      { name: "search-enabled",
        activate: () => {
          this.search_enabled = true;
          this.lookup_action ("search").set_enabled (true);
        }
      },
      { name: "player",
        activate: () => {
          this.unfullscreen ();
          if (this.window.itemview.player.item)
            this.window.on_stack_update (this, "item");
        },
        accels: ["p", "<Primary>p"],
        enabled: false
      },
      { name: "player-enabled",
        activate: () => {
          this.player_enabled = true;
          this.lookup_action ("player").set_enabled (true);
        }
      },
      { name: "back-layout",
        activate: () => {this.on_back_layout ()},
        accels: ["Escape"]
      },
      { name: "toggle-fullscreen",
        activate: () => {this.on_toggle_fullscreen ()},
        accels: ["f", "<Alt>Return"]
      },
      { name: "toggle-play",
        activate: () => {this.on_toggle_play ()},
        accels: ["space"]
      }
    ];
    action_entries.forEach (Lang.bind (this, (entry) => {
      let props = {};
      ['name', 'state', 'parameter_type'].forEach ((prop) => {
        if (entry[prop]) props[prop] = entry[prop];
      });
      let action = new Gio.SimpleAction (props);
      if (entry.create_hook) entry.create_hook (action);
      if (entry.activate) action.connect ('activate', entry.activate);
      if (entry.change_state) action.connect ('change-state', entry.change_state);
      if (entry.accels) this.set_accels_for_action ('app.' + entry.name, entry.accels);
      if (typeof entry.enabled !== 'undefined' ) action.set_enabled (entry.enabled);
      this.add_action (action);
    }));
  },

  vfunc_activate: function () {
    this.window.show_all ();
    this.window.present ();
  },

  on_toggle_fullscreen: function () {
    if (this.window.stack.visible_child_name == "item")
      this.window.itemview.player.video.toggle_fullscreen ();
  },

  unfullscreen: function () {
    if (this.window.itemview.player.video.fullscreen)
      this.window.itemview.player.video.toggle_fullscreen ();
  },

  on_back_layout: function () {
    if (this.window.itemview.player.video.fullscreen)
      this.window.itemview.player.video.toggle_fullscreen ();
    else if (this.window.back.visible) this.window.on_back ();
  },

  on_toggle_play: function () {
    if (this.window.itemview.player.item)
      this.window.itemview.player.toggle_play ();
  },

  enable_global_actions: function () {
    this.lookup_action ("back-layout").set_enabled (true);
    this.lookup_action ("toggle-fullscreen").set_enabled (true);
    this.lookup_action ("toggle-play").set_enabled (true);
    this.lookup_action ("bookmarks").set_enabled (true);
    this.lookup_action ("history").set_enabled (true);
    this.lookup_action ("player").set_enabled (this.player_enabled);
    this.lookup_action ("search").set_enabled (this.search_enabled);
  },

  disable_global_actions: function () {
    this.lookup_action ("back-layout").set_enabled (false);
    this.lookup_action ("toggle-fullscreen").set_enabled (false);
    this.lookup_action ("toggle-play").set_enabled (false);
    this.lookup_action ("bookmarks").set_enabled (false);
    this.lookup_action ("history").set_enabled (false);
    this.lookup_action ("player").set_enabled (false);
    this.lookup_action ("search").set_enabled (false);
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
