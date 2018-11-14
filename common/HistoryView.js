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
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const Utils = imports.common.Utils;
const ResultView = imports.common.ResultView;

const IPP = 20; //items per page

var HistoryView = new Lang.Class({
  Name: "HistoryView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.settings = parent.settings;
    this.results.max_children_per_line = 1;
    this.results.homogeneous = false;

    this.date = "";
    this.date_options = {  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
      let item = new HistoryViewItem (this.settings.get_view_history_item (p));
      item.show_details ();
      var d = new Date (item.details.data.local.last).toLocaleDateString ("lookup", this.date_options);
      if (this.date != d) {
        this.add_date (d);
      }
      this.results.add (item);
    });
  },

  add_date: function (date) {
    this.date = date;
    let label = new Gtk.Label({label:this.date, xalign:0.0, margin:6, sensitive:true});
    label.show_all ();
    this.results.add (label);
  }
});

var HistoryViewItem = new Lang.Class({
  Name: "HistoryViewItem",
  Extends: ResultView.ResultViewItem,

  _init: function (data) {
    this.parent (data);
    this.margin = 2;
    this.title.max_width_chars = 64;
    this.title.lines = 1;
    //this.image.pixbuf = this.image.pixbuf.scale_simple (16, 16, 2);
    this.dbox.no_show_all = true;
    this.dbox.visible = false;

    this.local = new Gtk.Label ({label:this.details.data.local.views + " views", xalign:1, opacity: 0.7});
    this.local.get_style_context ().add_class ("small");
    this.cbox.pack_end (this.local, false, false, 0);
    this.local.show ();
  },

  get_thumb: function () {
    let url = this.details.get_thumbnail_url ("default");
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale (Gio.MemoryInputStream.new_from_bytes (d), 48, 48, true, null);
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
