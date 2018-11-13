/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const Utils = imports.common.Utils;

var ResultView = new Lang.Class({
  Name: "ResultView",
  Extends: Gtk.Box,
  Signals: {
    'ready': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED},
  },

  _init: function (parent, scroll) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    scroll = (typeof scroll !== 'undefined') ?  scroll : true;
    let box = null;
    this.owner = parent;
    this.provider = parent.provider;

    if (scroll) {
      this.scroll = new Gtk.ScrolledWindow ();
      this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
      this.scroll.shadow_type = Gtk.ShadowType.NONE;
      this.pack_start (this.scroll, true, true, 0);

      box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
      this.scroll.add (box);
    } else box = this;

    let space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    let results_box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    box.pack_start (results_box, true, false, 0);

    this.results = new Gtk.FlowBox ({
      homogeneous: true,
      activate_on_single_click: false,
      max_children_per_line: 3,
      valign: Gtk.Align.START
    });
    results_box.pack_start (this.results, true, false, 0);

    this.pager = new Pager ();
    results_box.add (this.pager);

    space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    this.results.connect ("child-activated", Lang.bind (this, (o,a) => {
      var details = a.get_children()[0];
      if (details) {
        this.owner.itemview.load (details);
        this.owner.back.last = this.owner.stack.visible_child_name;
        this.owner.stack.visible_child_name = "item";
      }
    }));
    this.pager.connect ("page-selected", (o, token) => {
      this.provider.get_page (this.url, token, this.etag, Lang.bind (this, this.on_results));
    });

  },

  query: function (words) {
    this.url = this.provider.get (words, Lang.bind (this, this.on_results));
  },

  on_results: function (data, res) {
    //print (res, data.toString());
    if (res != 200) return;
    //this.stack.visible_child_name = "search";
    this.emit ('ready');
    this.clear_all ();
    this.add_items (JSON.parse (data.toString()));
  },

  add_items: function (respond) {
    if (respond.prevPageToken) this.pager.prev.token = respond.prevPageToken;
    else this.pager.prev.token = "";
    if (respond.nextPageToken) this.pager.next.token = respond.nextPageToken;
    else this.pager.prev.token = "";
    if (respond.etag) this.etag = respond.etag;
    this.pager.toggle ();
    respond.items.forEach (p => {
      let item = new ResultViewItem (p);
      this.results.add (item);
      if (item.details.id) this.provider.get_info (item.details.id, Lang.bind (this, (d)=>{
        let data = JSON.parse (d);
        if (data.pageInfo.totalResults > 0) {
          item.details.parse (data.items[0]);
          item.show_details ();
        }
      }));
    });
  },

  clear_all: function () {
    this.results.get_children().forEach (p => {
      this.results.remove (p);
    });
  }
});

var ResultViewItem = new Lang.Class({
  Name: "ResultViewItem",
  Extends: Gtk.Box,

  _init: function (item) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL, margin:8, spacing:8});
    //this.get_style_context ().add_class ("sb");
    this.hexpand = false;

    this.details = new Details (item);
    this.tooltip_text = this.details.title;

    this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/newstream.item.svg");
    this.add (this.image);
    let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    //box.get_style_context ().add_class ("sb");
    this.pack_start (box, true, true, 8);

    this.title = new Gtk.Label ({
      label:this.details.title, xalign:0, wrap: true, lines: 2, ellipsize: 3
    });
    this.title.max_width_chars = 24;
    box.pack_start (this.title, false, false, 0);

    this.channel = new Gtk.Label ({label:this.details.channel_title, xalign:0, opacity: 0.7});
    this.channel.get_style_context ().add_class ("small");
    box.pack_start (this.channel, true, true, 0);

    let dbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    box.pack_start (dbox, true, true, 0);

    this.published = new Gtk.Label ({label:this.details.age, xalign:0, opacity: 0.7});
    this.published.get_style_context ().add_class ("small");
    dbox.pack_start (this.published, true, true, 0);

    this.views = new Gtk.Label ({xalign:1, opacity: 0.7});
    this.views.get_style_context ().add_class ("small");
    dbox.pack_end (this.views, false, false, 0);

    let url = this.details.get_thumbnail_url ("default");
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      //print (d.get_size(),d.get_data().length);
      this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
    }));

    this.show_all ();
  },

  show_details: function () {
    if (this.details.views) this.views.set_text (this.details.views + " views");
    if (this.details.live)
      this.published.set_text ("LIVE • " + this.published.get_text());
    else if (this.details.duration) {
      this.published.set_text (Utils.time_stamp (this.details.duration) + " • " + this.published.get_text());
    }
    this.get_channel_info ();
  },

  get_channel_info: function () {
    let w = this.get_toplevel ();
    if (!this.details.data.channel.id) return;
    if (w) w.provider.get_channel_info (this.details.data.channel.id, Lang.bind (this, (d)=>{
      let data = JSON.parse (d);
      if (data.pageInfo.totalResults > 0) {
        this.details.parse (data.items[0]);
        this.get_channel_logo ();
      }
    }));
  },

  get_channel_logo: function () {
    let url = this.details.get_channel_thumb_url ("default");
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r)=>{
      if (r != 200) return;
      this.channel_logo = GdkPixbuf.Pixbuf.new_from_stream_at_scale (Gio.MemoryInputStream.new_from_bytes (d), 56, 56, true, null);
    }));
  },

  get_cover: function (callback) {
    if (!this.details.id) return;
    if (this.cover) {
      if (callback) callback ();
      return;
    }
    let url = this.details.cover_url;
    if (url) Utils.fetch (url, null, null, Lang.bind (this, (d,r)=>{
      if (r == 200)
        this.cover = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
      if (callback) callback ();
    }));
  }
});

var Details = new Lang.Class({
  Name: "Details",

  _init: function (search_result) {
    this.data = {kind:"", id:"", channel:{}, live:false, duration:0};
    this.parse (search_result);
  },

  get id () {
    return this.data.id;
  },

  get title () {
    if (this.data.title) return this.data.title;
    else return "";
  },

  get age () {
    if (!this.data.published) return "";
    return Utils.age (new Date (this.data.published));
  },

  get date () {
    if (!this.data.published) return "";
    var d = new Date (this.data.published);
    return "Published: " + d.toLocaleDateString();
  },

  get channel_title () {
    var channel = this.data.channel;
    let s = "";
    if (channel && channel.title) s = channel.title;
    return s;
  },

  get channel_id () {
    var channel = this.data.channel;
    let s = "";
    if (channel && channel.id) s = channel.id;
    return s;
  },

  get live () {
    return this.data.live || false;
  },

  get views () {
    if (this.data.views) return Utils.format_size (this.data.views);
    else return "";
  },

  get likes () {
    if (this.data.likes) return Utils.format_size (this.data.likes);
    else return "";
  },

  get dislikes () {
    if (this.data.dislikes) return Utils.format_size (this.data.dislikes);
    else return "";
  },

  get duration () {
    return this.data.duration;
  },

  get cover_url () {
    let url = this.get_thumbnail_url ("maxres");
    if (!url) url = this.get_thumbnail_url ("standard");
    if (!url) url = this.get_thumbnail_url ("high");
    if (!url) url = this.get_thumbnail_url ("medium");
    if (!url) url = this.get_thumbnail_url ("default");
    return url;
  },

  get_thumbnail_url: function (preset) {
    let s = "";
    if (!this.data.thumbnails) return s;
    preset = preset || "default";
    var p = this.data.thumbnails[preset];
    if (p && p.url) s = p.url;
    return s;
  },

  get_channel_thumb_url: function (preset) {
    let s = "";
    if (!this.data.channel.thumbnails) return s;
    preset = preset || "default";
    var p = this.data.channel.thumbnails[preset];
    if (p && p.url) s = p.url;
    return s;
  },

  parse: function (data) {
    if (!data) return;
    //print (JSON.stringify (search_result));
    if (data.kind == "youtube#searchResult") this.parse_search (data);
    else if (data.kind == "youtube#video") this.parse_search (data);
    else if (data.kind == "youtube#channel") this.parse_channel (data);
  },

  parse_search: function (data) {
    if (!data.id) return;
    if (data.id.kind) this.data.kind = data.id.kind;
    if (data.id.videoId) this.data.id = data.id.videoId;
    if (data.snippet) this.parse_snippet (data.snippet);
    if (data.contentDetails) this.parse_content (data.contentDetails);
    if (data.statistics) this.parse_statistics (data.statistics);
  },

  parse_snippet: function (snippet) {
    if (snippet.liveBroadcastContent && snippet.liveBroadcastContent != "none") this.data.live = true;
    if (snippet.title) this.data.title = snippet.title;
    if (snippet.publishedAt) this.data.published = snippet.publishedAt;
    if (snippet.description) this.data.description = snippet.description;
    if (snippet.channelId) this.data.channel.id = snippet.channelId;
    if (snippet.channelTitle) this.data.channel.title = snippet.channelTitle;
    // "name":{url:"",width:n,height:n}
    if (snippet.thumbnails) this.data.thumbnails = snippet.thumbnails;
    if (snippet.tags) this.data.tags = snippet.tags;
    if (snippet.categoryId) this.data.category_id = snippet.categoryId;
  },

  parse_channel: function (item) {
    if (item.snippet.title) this.data.channel.title = item.snippet.title;
    if (item.snippet.publishedAt) this.data.channel.published = item.snippet.publishedAt;
    if (item.snippet.description) this.data.channel.description = item.snippet.description;
    if (item.snippet.thumbnails) this.data.channel.thumbnails = item.snippet.thumbnails;
    if (!item.statistics) return;
    if (item.statistics.viewCount) this.data.channel.views = item.statistics.viewCount;
    if (item.statistics.subscriberCount) this.data.channel.subscribers = item.statistics.subscriberCount;
    if (item.statistics.videoCount) this.data.channel.videos = item.statistics.videoCount;
  },

  parse_content: function (data) {
    if (data.duration) this.data.duration = this.parse_duration (data.duration);
    // dimension, definition, caption, licensedContent, projection
  },

  parse_duration: function (data) {
    let s = data.substring (2);
    let h = 0, m = 0, sec = 0, i;
    if (s.length < 3) return 0;
    i = s.indexOf ("H");
    if (i > -1) {
      h = parseInt(s.substring (0,i));
      if (!Number.isInteger (h)) h = 0;
      s = s.substring (i + 1);
    }
    i = s.indexOf ("M");
    if (i > -1) {
      m = parseInt(s.substring (0,i));
      if (!Number.isInteger (m)) m = 0;
      s = s.substring (i + 1);
    }
    i = s.indexOf ("S");
    if (i > -1) {
      sec = parseInt(s.substring (0,i));
      if (!Number.isInteger (sec)) sec = 0;
    }
    return h*3600 + m*60 + sec;
  },

  parse_statistics: function (data) {
    if (data.viewCount) this.data.views = data.viewCount;
    if (data.likeCount) this.data.likes = data.likeCount;
    if (data.dislikeCount) this.data.dislikes = data.dislikeCount;
    // favoriteCount, commentCount
  }
});

var Pager = new Lang.Class({
  Name: "Pager",
  Extends: Gtk.Box,
  Signals: {
    'page-selected': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_STRING]},
  },

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
    //this.get_style_context ().add_class ("sb");

    let space = new Gtk.Box ();
    this.pack_start (space, true, false, 0);

    this.first = this.add_button ("First", "First page");
    this.prev = this.add_button ("Previous", "Previous page");
    this.next = this.add_button ("Next", "Next page");

    space = new Gtk.Box ();
    this.pack_start (space, true, false, 0);

    this.current = this.first;
    this.show_all ();
    //this.first.visible = true;
  },

  add_button: function (label, tooltip) {
    let btn = new Gtk.Button ({label:label, tooltip_text:tooltip});
    //btn.get_style_context ().add_class ("sb-button");
    btn.token = "";
    btn.no_show_all = true;
    this.pack_start (btn, false, false, 8);

    btn.connect ('clicked', Lang.bind (this, this.on_clicked));

    return btn;
  },

  on_clicked: function (o) {
    this.emit ('page_selected', o.token);
  },

  toggle: function () {
    this.first.visible = this.prev.token;
    this.prev.visible = this.prev.token;
    this.next.visible = this.next.token;
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
