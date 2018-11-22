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
const ItemView = imports.common.ItemView;

var ChannelDetails = new Lang.Class({
  Name: "ChannelDetails",
  Extends: Gtk.Box,

  _init: function (view) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
    this.get_style_context ().add_class ("search-bar");
    this.view = view;

    //let space = new Gtk.Box ();
    //this.pack_start (space, true, true, 0);

    //this.frame = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
    //this.frame.margin_left = 48;
    this.logo = new Gtk.Button ({always_show_image: true,yalign: 0.0});
    this.logo.image = new Gtk.Image ();
    this.logo.get_style_context ().add_class ("channel-button");
    this.logo.set_relief (Gtk.ReliefStyle.NONE);
    this.add (this.logo);

    let contents = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.pack_start (contents, true, true, 0);

    //let space = new Gtk.Box ();
    //this.pack_start (space, true, true, 0);

    this.itembar = new ItemView.Itembar ();
    contents.pack_start (this.itembar, true, true, 0);

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    contents.pack_start (box, true, true, 0);

    this.channel = new ItemView.Channel ();
    box.pack_start (this.channel, true, true, 0);
    //this.channel.logo.reparent (this.frame);
    //this.channel.logo.yalign = 0.0;
    this.channel.logo.pixbuf = null;

    this.statistics = new ItemView.Statistics ();
    box.pack_end (this.statistics, false, false, 0);

    this.description = new ItemView.Description ();
    contents.add (this.description);

    this.itembar.bookmark.connect ('clicked', Lang.bind (this, (o) => {
      this.on_bookmark (o);
    }));
  },

  load: function (channel, pixbuf) {
    if (!channel || !channel.id) return;
    //this.channel.load (item);
    this.channel.channel = channel;
    channel.videos = channel.videos || "0";
    this.channel.author.set_text (Utils.format_size_long (channel.videos) + " videos created");
    if (channel.published) {
      this.channel.published.set_text ("since " + (new Date (channel.published)).toLocaleDateString());
    } else this.channel.published.set_text ("");
    if (pixbuf) this.logo.image.pixbuf = pixbuf.scale_simple (128,128,3);

    //this.statistics.load (item);
    channel.views = channel.views || "0";
    this.statistics.views.set_text (Utils.format_size_long (channel.views) + " views");
    channel.subscribers = channel.subscribers || "0";
    this.statistics.likes.set_text (Utils.format_size_long (channel.subscribers) + " subscribers");
    this.statistics.url = "https://youtube.com/channel" + channel.id;

    //this.description.load (item);
    channel.description = channel.description || "";
    this.description.info.set_text (channel.description);

    this.itembar.base_url = "https://youtube.com/channel/";
    this.itembar.set_link (channel.id, channel.title, this.view.w.settings.subscribed (channel.id));
  },

  on_bookmark: function (o) {
    this.view.w.settings.toggle_channel (this.view.get_channel_data (), o.get_style_context().has_class ("selected"));
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
