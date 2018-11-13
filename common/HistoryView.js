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
const ResultView = imports.common.ResultView;

const IPP = 20; //items per page

var HistoryView = new Lang.Class({
  Name: "HistoryView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.settings = parent.settings;
    this.results.max_children_per_line = 1;

  },

  query: function (page) {
    page = page || 0;
    //this.url = "view_history";
    if (page*IPP >= this.settings.view_history.length) return;
    let history = this.settings.view_history.slice (page*IPP, (page+1)*IPP);
    //print (page*IPP, (page+1)*IPP,history.length,this.settings.view_history);
    if (!history.length) return;
    this.clear_all ();
    history.forEach (p => {
      let item = new ResultView.ResultViewItem (this.settings.get_view_history_item (p));
      this.results.add (item);
    });
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
