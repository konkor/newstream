/*
 * This is a part of NewStream package
 * Copyright (C) 2018-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Lang = imports.lang;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Logger = imports.common.Logger;
const Utils  = imports.common.Utils;

let APPDIR = "";

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
    this.w = parent;
    APPDIR = this.w.application.current_dir;
    this.provider = parent.provider;

    this.header = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.add (this.header);

    if (scroll) {
      this.scroll = new Gtk.ScrolledWindow ();
      this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
      this.scroll.shadow_type = Gtk.ShadowType.NONE;
      this.pack_start (this.scroll, true, true, 0);

      box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:8});
      this.scroll.add (box);
    } else box = this;

    let space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    let results_box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, valign:0});
    results_box.valign = Gtk.Align.START;
    box.pack_start (results_box, true, false, 0);

    this.results = new Gtk.FlowBox ({
      homogeneous: true,
      activate_on_single_click: false,
      max_children_per_line: 3,
      valign: Gtk.Align.START
    });
    this.results.can_focus = true;
    this.results.events |= Gdk.EventMask.FOCUS_CHANGE_MASK;
    results_box.pack_start (this.results, true, false, 0);

    this.pager = new Pager ();
    this.add (this.pager);

    space = new Gtk.Box ();
    box.pack_start (space, true, false, 0);

    this.results.connect ("child-activated", this.on_item_activated.bind (this));
    this.pager.connect ("page-selected", (o, token) => {
      this.on_page_selected (o, token);
    });
    this.results.connect ('key_release_event', (o, e) => {
      let state = o.get_selected_children ().length < 1;
      let app = Gio.Application.get_default();
      app.lookup_action ("seek-forward").set_enabled (state);
      app.lookup_action ("seek-backward").set_enabled (state);
      app.lookup_action ("volume-up").set_enabled (state);
      app.lookup_action ("volume-down").set_enabled (state);
    });
    this.results.connect ('key_press_event', (o, e) => {
      this.enable_global_actions ();
    });
    this.results.connect ('leave_notify_event', (o, e) => {
      this.enable_global_actions ();
    });
  },

  enable_global_actions: function () {
    let app = Gio.Application.get_default();
    app.lookup_action ("seek-forward").set_enabled (true);
    app.lookup_action ("seek-backward").set_enabled (true);
    app.lookup_action ("volume-up").set_enabled (true);
    app.lookup_action ("volume-down").set_enabled (true);
  },

  query: function (words) {
    this.url = this.provider.get (words, this.on_results.bind (this));
  },

  on_results: function (data, res) {
    if (res != 200) return;
    this.emit ('ready');
    this.clear_all ();
    try {
      let items = JSON.parse (Utils.bytesToString (data).toString ());
      this.add_items (items);
    } catch (e) { debug (e.message);}
    if (this.scroll) this.scroll.vadjustment.value = 0;
  },

  on_page_selected: function (o, token) {
    this.provider.get_page (this.url, token, this.etag, this.on_results.bind (this));
  },

  on_item_activated: function (o, item) {
    var child = item.get_children()[0].details;
    if (child && child.data) {
      this.w.itemview.load (child.data);
      if (this.w.stack.visible_child_name != "item")
        this.w.back.last = this.w.stack.visible_child_name;
      this.w.stack.visible_child_name = "item";
    }
  },

  add_items: function (respond) {
    if (respond.prevPageToken) this.pager.prev.token = respond.prevPageToken;
    else this.pager.prev.token = "";
    if (respond.nextPageToken) this.pager.next.token = respond.nextPageToken;
    else this.pager.next.token = "";
    if (respond.etag) this.etag = respond.etag;
    this.pager.toggle ();
    respond.items.forEach (p => {
      let item = new ResultViewItem (p);
      this.results.add (item);
      if (item.details.id) this.provider.get_info (item.details.id, (d) => {
        if (d.pageInfo && d.pageInfo.totalResults > 0) {
          item.details.parse (d.items[0]);
          item.show_details ();
        } else debug ("WARNING: failed detailed info for " + item.details.id + "\nRecived: " + JSON.stringify (d));
      });
    });
  },

  clear_all: function () {
    this.results.get_children().forEach (p => {
      this.results.remove (p);
    });
  },

  get first_item_data () {
    let child = this.results.get_children()[0];
    if (child) {
      child = child.get_children()[0].details;
      if (child && child.data) {
        child = child.data;
      }
    }
    return child;
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

    this.cbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    box.pack_start (this.cbox, true, true, 0);

    this.channel = new Gtk.Label ({label:this.details.channel_title, xalign:0, opacity: 0.7});
    this.channel.get_style_context ().add_class ("small");
    this.cbox.pack_start (this.channel, true, true, 0);

    this.dbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    box.pack_start (this.dbox, true, true, 0);

    this.published = new Gtk.Label ({label:this.details.age, xalign:0, opacity: 0.7});
    this.published.get_style_context ().add_class ("small");
    this.dbox.pack_start (this.published, true, true, 0);

    this.views = new Gtk.Label ({xalign:1, opacity: 0.7});
    this.views.get_style_context ().add_class ("small");
    this.dbox.pack_end (this.views, false, false, 0);

    this.get_thumb ();

    this.show_all ();
  },

  show_details: function () {
    if (this.details.data.views) this.views.set_text (Utils.format_size (this.details.data.views) + " views");
    if (this.details.live)
      this.published.set_text ("LIVE • " + this.published.get_text());
    else if (this.details.duration) {
      this.published.set_text (Utils.time_stamp (this.details.duration) + " • " + this.published.get_text());
    }
    this.get_channel_info ();
    this.details.set_cover_url ();
  },

  get_thumb: function () {
    let url = this.details.get_thumbnail_url ("default");
    if (url) Utils.fetch (url, null, null, (d,r) => {
      if (r != 200) return;
      //print (d.get_size(),d.get_data().length);
      this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
    });
  },

  get_channel_info: function () {
    let w = Gio.Application.get_default ().window;
    if (!this.details.data.channel.id) return;
    if (this.details.data.channel.thumbnails) this.get_channel_logo_url ();
    else if (w) w.provider.get_channel_info (this.details.data.channel.id, (d) => {
      if (d.pageInfo && d.pageInfo.resultsPerPage > 0) {
        this.details.parse (d.items[0]);
        this.get_channel_logo_url ();
      } else debug ("ResultViewItem.get_channel_info wrong data:\n" + JSON.stringify(d));
    });
  },

  get_channel_logo_url: function () {
    let url = this.details.get_channel_thumb_url ("default");
    if (url) this.details.data.channel_thumb_url = url;
  }
});

var Details = new Lang.Class({
  Name: "Details",

  _init: function (search_result) {
    if (search_result && search_result.local)
      this.data = search_result;
    else {
      this.data = {kind:"", id:"", channel:{}, live:false, duration:0};
      this.parse (search_result);
    }
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

  get duration () {
    return this.data.duration;
  },

  set_cover_url: function () {
    let url = this.get_thumbnail_url ("maxres");
    if (!url) url = this.get_thumbnail_url ("standard");
    if (!url) url = this.get_thumbnail_url ("high");
    if (!url) url = this.get_thumbnail_url ("medium");
    if (!url) url = this.get_thumbnail_url ("default");
    this.data.cover_url = url;
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

    btn.connect ('clicked', this.on_clicked.bind (this));

    return btn;
  },

  on_clicked: function (o) {
    this.emit ('page_selected', o.token);
  },

  toggle: function () {
    this.first.visible = !!this.prev.token;
    this.prev.visible = !!this.prev.token;
    this.next.visible = !!this.next.token;
  }
});

const DOMAIN = "ResultView";
function error (msg) {Logger.error (DOMAIN, msg)}
function debug (msg) {Logger.debug (DOMAIN, msg)}
function info (msg) {Logger.info (DOMAIN, msg)}
