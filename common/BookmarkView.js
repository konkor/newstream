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

var BookmarkView = new Lang.Class({
  Name: "BookmarkView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.settings = parent.settings;
    this.results.max_children_per_line = 1;
    this.results.homogeneous = false;
  },

  query: function (page) {
    page = page || 0;
    //this.url = "view_history";
    if (page*IPP >= this.settings.bookmarks.length) return;
    let marks = this.settings.bookmarks.slice (page*IPP, (page+1)*IPP);
    //print (page*IPP, (page+1)*IPP,history.length,this.settings.view_history);
    if (!marks.length) return;
    if (page) this.pager.prev.token = (page - 1).toString ();
    else this.pager.prev.token = "";
    if ((this.settings.bookmarks.length - (page+1)*IPP) > 0) this.pager.next.token = (page + 1).toString ();
    else this.pager.next.token = "";
    this.pager.toggle ();
    this.clear_all ();
    marks.forEach (p => {
      let data = this.settings.get_view_history_item (p);
      if (!data) {
        this.settings.toggle_bookmark (p, false);
        return;
      }
      let item = new BookmarkViewItem (data);
      item.show_details ();
      this.results.add (item);
    });
    if (this.scroll) this.scroll.vadjustment.value = 0;
  },

  on_page_selected: function (o, token) {
    this.query (parseInt (token));
  }
});

var BookmarkViewItem = new Lang.Class({
  Name: "BookmarkViewItem",
  Extends: ResultView.ResultViewItem,

  _init: function (data) {
    this.parent (data);
    this.margin = 2;
    this.title.max_width_chars = 64;
    this.title.lines = 1;
    this.dbox.no_show_all = true;
    this.dbox.visible = false;
    this.image.pixbuf = this.image.pixbuf.scale_simple (48, 30, 2);

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
