/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
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

    _init: function (parent, id) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL});
        this.owner = parent;
        this.provider = parent.provider;

        this.scroll = new Gtk.ScrolledWindow ();
        this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
        this.scroll.shadow_type = Gtk.ShadowType.NONE;
        this.pack_start (this.scroll, true, true, 0);

        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        this.scroll.add (box);

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
            var details = a.get_children()[0].details;
            if (details) {
                this.owner.itemview.load (details);
                this.owner.stack.visible_child_name = "item";
            }
            /*var data = a.get_children()[0].item.data, url = "";
            //print (o,item);
            if (data && data.formats) data.formats.forEach (p => {
                if (data.format_id == p.format_id) url = p.url;
            });
            if (url) Utils.spawn_async ([GLib.find_program_in_path ("gst-launch-1.0"),"playbin","uri="+url],null);*/
        }));
        this.pager.connect ("page-selected", (o, token) => {
            this.provider.get_page (this.url, token, this.etag, Lang.bind (this, this.on_results));
        });

    },

    get_hot: function () {
        this.url = this.provider.get_hot (Lang.bind (this, this.on_results));
    },

    get_day: function () {
        this.url = this.provider.get_day (Lang.bind (this, this.on_results));
    },

    get_hit: function () {
        this.url = this.provider.get_hit (Lang.bind (this, this.on_results));
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
            if (item.id) this.provider.get_info (item.id.videoId, Lang.bind (this, (d)=>{
                item.details = d;
                //print (d);
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
        this.id = item.id;
        //if (item.snippet.thumbnails) this.thumbnails = item.snippet.thumbnails;

        this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/newstream.item.svg");
        this.add (this.image);
        let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        //box.get_style_context ().add_class ("sb");
        this.pack_start (box, true, true, 8);

        this.title = new Gtk.Label ({xalign:0, wrap: true, lines: 2, ellipsize: 3});
        this.title.max_width_chars = 27;
        if (item.snippet.title) {
            this.tooltip_text = item.snippet.title;
            this.title.set_text (item.snippet.title);
        }
        box.pack_start (this.title, false, false, 0);
        
        this.channel = new Gtk.Label ({xalign:0, opacity: 0.7});
        //this.channel.opacity = 0.7;
        this.channel.get_style_context ().add_class ("small");
        if (item.snippet.channelTitle) this.channel.set_text (item.snippet.channelTitle);
        box.pack_start (this.channel, true, true, 0);
        
        this.published = new Gtk.Label ({xalign:0, opacity: 0.7});
        this.published.get_style_context ().add_class ("small");
        if (item.snippet.publishedAt) this.published.set_text (item.snippet.publishedAt);
        box.pack_start (this.published, true, true, 0);
        
        if (item.snippet.thumbnails.default.url) Utils.fetch (item.snippet.thumbnails.default.url,null,null, Lang.bind (this, (d,r)=>{
            if (r != 200) return;
            //print (d.get_size(),d.get_data().length);
            this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
        }));
        //print (item.videoId);
        /*if (item.id.videoId) Utils.fetch_formats (item.id.videoId, Lang.bind (this, (d)=>{
            this.item.data = d;
            //print (d.format_id, d.id, d.ext);
            //if (d.formats) d.formats.forEach ( p => {
                //print (p.format);
                //print (p.url);
            });
        }));*/

        //this.connect ("notify", (o,a,b,c) => {print (o,a);});

        this.show_all ();
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
