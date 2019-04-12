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
const Lang = imports.lang;

const ResultView = imports.common.ResultView;
const HistoryView = imports.common.HistoryView;
const BookmarkView = imports.common.BookmarkView;
const SubscriptionView = imports.common.SubscriptionView;
const ChannelView = imports.common.ChannelView;
const Item = imports.common.ItemView;

var HistoryLayout = new Lang.Class({
  Name: "HistoryLayout",
  Extends: HistoryView.HistoryView,

  _init: function (parent) {
    this.parent (parent);

    this.connect ("map", Lang.bind (this, this.setup));
  },

  setup: function (o, e) {
    if (this.w.settings.view_history_modified) this.query ();
    this.w.settings.view_history_modified = false;
    this.w.section.label = "History";
    this.w.home.visible = false;
    this.w.back.visible = true;
    this.w.searchbar.visible = false;
    this.w.topbar.visible = false;
    this.w.menu_button.visible = true;
  }
});

var BookmarkLayout = new Lang.Class({
  Name: "BookmarkLayout",
  Extends: BookmarkView.BookmarkView,

  _init: function (parent) {
    this.parent (parent);

    this.connect ("map", Lang.bind (this, this.setup));
  },

  setup: function (o, e) {
    if (this.w.settings.bookmarks_modified) this.query ();
    this.w.settings.bookmarks_modified = false;
    this.w.section.label = "Bookmarks";
    this.w.home.visible = false;
    this.w.back.visible = true;
    this.w.searchbar.visible = false;
    this.w.topbar.visible = false;
    this.w.menu_button.visible = true;
  }
});

var SubscriptionLayout = new Lang.Class({
  Name: "SubscriptionLayout",
  Extends: SubscriptionView.SubscriptionView,

  _init: function (parent) {
    this.parent (parent);
    this.connect ("map", Lang.bind (this, this.setup));
  },

  setup: function (o, e) {
    if (this.w.settings.channels_modified) this.query ();
    this.w.settings.channels_modified = false;
    this.w.section.label = "Subscriptions";
    this.w.home.visible = false;
    this.w.back.visible = true;
    this.w.searchbar.visible = false;
    this.w.topbar.visible = false;
    this.w.menu_button.visible = true;
  }
});

var ItemLayout = new Lang.Class({
  Name: "ItemLayout",
  Extends: Item.ItemView,

  _init: function (parent) {
    this.parent (parent);
    this.w = parent;

    this.connect ("map", Lang.bind (this, this.setup));
  },

  query: function (item) {
    this.load (item);
  },

  setup: function (o, e) {
    if (this.player.item) this.w.section.label = this.player.item.title;
    this.w.home.visible = false;
    this.w.back.visible = true;
    this.w.searchbar.visible = false;
    this.w.topbar.visible = false;
    this.w.menu_button.visible = false;
  }
});

var HotView = new Lang.Class({
  Name: "HotView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.w = parent;

    this.connect ("map", Lang.bind (this, this.setup));
  },

  query: function (words) {
    this.url = this.provider.get_hot (Lang.bind (this, this.on_results));
  },

  setup: function (o, e) {
    this.w.section.label = "New Stream";
    this.w.home.visible = true;
    this.w.back.visible = false;
    this.w.searchbar.visible = true;
    this.w.topbar.visible = true;
    this.w.menu_button.visible = true;
  }
});

var NewView = new Lang.Class({
  Name: "NewView",
  Extends: HotView,

  _init: function (parent) {
    this.parent (parent);
  },

  query: function (words) {
    this.url = this.provider.get_day (Lang.bind (this, this.on_results));
  }
});

var HitView = new Lang.Class({
  Name: "HitView",
  Extends: HotView,

  _init: function (parent) {
    this.parent (parent);
  },

  query: function (words) {
    this.url = this.provider.get_hit (Lang.bind (this, this.on_results));
  }
});

var SearchView = new Lang.Class({
  Name: "SearchView",
  Extends: ResultView.ResultView,

  _init: function (parent) {
    this.parent (parent);
    this.w = parent;
    this.words = "New Stream";

    this.connect ("map", Lang.bind (this, this.setup));
  },

  query: function (words) {
    if (!words) return;
    this.words = words;
    this.url = this.provider.get (words, Lang.bind (this, this.on_results));
  },

  setup: function (o, e) {
    this.w.section.label = this.words;
    this.w.home.visible = false;
    this.w.back.visible = true;
    this.w.searchbar.visible = false;
    this.w.topbar.visible = false;
    this.w.menu_button.visible = true;
  }
});

var ChannelLayout = new Lang.Class({
  Name: "ChannelLayout",
  Extends: SearchView,

  _init: function (parent) {
    this.parent (parent);
    this.channel = null;

    this.details = new ChannelView.ChannelDetails (this);
    this.header.add (this.details);
  },

  query: function (words) {
    if (this.channel)
      this.url = this.provider.get_channel (this.channel.id, Lang.bind (this, this.on_results));
  },

  load: function (channel, pixbuf) {
    if (!channel) return;
    if (!this.channel || (this.channel.id != channel.id))
      this.details.load (channel, pixbuf);
    this.channel = channel;
    //print (JSON.stringify (channel));
    this.query ();
    if (this.channel.title) this.words = this.channel.title;
  },

  get_channel_data: function () {
    if (!this.channel) return null;
    if (!this.channel.local) this.channel.local = {};
    this.channel.local.last = this.first_item_data.id;
    return this.channel;
  }
});
