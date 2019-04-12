/*
 * This is a part of NewStream package
 * Copyright (C) 2018-2019 konkor <konkor.github.io>
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

const Logger = imports.common.Logger;
const Utils = imports.common.Utils;
const ResultView = imports.common.ResultView;
const ItemView = imports.common.ItemView;

let IPP = 20; //items per page
let APPDIR = "";

var SubscriptionView = new Lang.Class({
  Name: "SubscriptionView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.settings = parent.settings;
    APPDIR = parent.application.current_dir;
    this.results.max_children_per_line = 5;
    this.activate_on_single_click = true,
    this.results.homogeneous = true;
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
  },

  on_item_activated: function (o, item) {
    var child = item.get_children()[0];
    if (child && child.channel) {
      let app = Gio.Application.get_default ();
      app.window.channelview.load (child.channel, child.pixbuf);
      this.w.back.last = this.w.stack.visible_child_name;
    }
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

    this.bookmark = new ItemView.BookButton ();
    this.settings = Gio.Application.get_default ().window.settings;
    this.bookmark.set_bookmark (this.settings.subscribed (this.channel.id));
    this.bookmark.editor.setup_channel (this.channel);
    this.pack_end (this.bookmark, false, false, 0);

    this.get_thumb ();
    this.show_all ();
  },

  get_thumb: function () {
    let url = this.channel.thumbnails["default"].url;
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r) => {
      if (r != 200) return;
      try {
        this.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
        this.image.pixbuf = this.pixbuf.scale_simple (32, 32, 2);
      } catch (e) {debug (e.message);};
    }));
  }
});

const DOMAIN = "Subscriptions";
function error (msg) {Logger.error (DOMAIN, msg)}
function debug (msg) {Logger.debug (DOMAIN, msg)}
function info (msg) {Logger.info (DOMAIN, msg)}
