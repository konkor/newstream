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

var SubscriptionView = new Lang.Class({
  Name: "SubscriptionView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.settings = parent.settings;
    this.results.max_children_per_line = 1;
    this.results.homogeneous = false;
  },

  query: function (page) {
    page = page || 0;
    if (page*IPP >= this.settings.channels.length) return;
    let marks = this.settings.channels.slice (page*IPP, (page+1)*IPP);
    if (!marks.length) return;
    if (page) this.pager.prev.token = (page - 1).toString ();
    else this.pager.prev.token = "";
    if ((this.settings.channels.length - (page+1)*IPP) > 0) this.pager.next.token = (page + 1).toString ();
    else this.pager.next.token = "";
    this.pager.toggle ();
    this.clear_all ();
    marks.forEach (p => {
      let item = new SubscriptionViewItem (this.settings.get_view_history_item (p));
      //item.show_details ();
      this.results.add (item);
    });
    if (this.scroll) this.scroll.vadjustment.value = 0;
  },

  on_page_selected: function (o, token) {
    this.query (parseInt (token));
  }
});

var SubscriptionViewItem = new Lang.Class({
  Name: "SubscriptionViewItem",
  Extends: Gtk.Box,

  _init: function (data) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL, margin:2, spacing:8});
    this.hexpand = false;

    this.channel = data;
    //print (JSON data);
    this.tooltip_text = this.channel.title;

    this.image = new Gtk.Image ();
    this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_file (APPDIR + "/data/icons/newstream.item.svg").scale_simple (48, 30, 2);
    this.add (this.image);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    //box.get_style_context ().add_class ("sb");
    this.pack_start (box, true, true, 8);

    this.title = new Gtk.Label ({
      label:this.channel.title, xalign:0, wrap: true, lines: 1, ellipsize: 3
    });
    this.title.max_width_chars = 64;
    box.pack_start (this.title, false, false, 0);

    let d = new Date (this.channel.published).toLocaleDateString ("lookup", {  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || "";
    this.published = new Gtk.Label ({label:d, xalign:0, opacity: 0.7});
    this.published.get_style_context ().add_class ("small");
    box.pack_start (this.published, true, true, 0);

    this.get_thumb ();
    this.show_all ();
  },

  get_thumb: function () {
    let url = this.channel.thumbnails["default"].url;
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale (Gio.MemoryInputStream.new_from_bytes (d), 32, 32, true, null);
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