/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const ByteArray = imports.byteArray;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const Utils = imports.common.Utils;

var ResultView = new Lang.Class({
    Name: "ResultView",
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.VERTICAL});

        this.scroll = new Gtk.ScrolledWindow ();
        this.scroll.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
        this.scroll.shadow_type = Gtk.ShadowType.NONE;
        this.pack_start (this.scroll, true, true, 0);

        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        this.scroll.add (box);

        let space = new Gtk.Box ();
        box.pack_start (space, true, false, 0);
        
        this.results = new Gtk.FlowBox ({
            homogeneous: true,
            activate_on_single_click: false,
            max_children_per_line: 1,
            valign: Gtk.Align.START
        });
        box.pack_start (this.results, true, false, 0);
        
        space = new Gtk.Box ();
        box.pack_start (space, true, false, 0);
        this.results.connect ("child-activated", (o,a,b,c) => {
            var data = a.get_children()[0].item.data, url = "";
            //print (o,item);
            if (data && data.formats) data.formats.forEach (p => {
                if (data.format_id == p.format_id) url = p.url;
            });
            if (url) Utils.spawn_async ([GLib.find_program_in_path ("gst-launch-1.0"),"playbin","uri="+url],null);
        });
    },

    add_items: function (items) {
        items.forEach (p => {
            let item = new ResultViewItem (p);
            this.results.add (item);
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
        this.item = item;

        this.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/newstream.item.svg");
        this.add (this.image);
        let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        //box.get_style_context ().add_class ("sb");
        this.pack_start (box, true, true, 8);

        this.title = new Gtk.Label ({xalign:0});
        if (item.snippet.title) this.title.set_text (item.snippet.title);
        box.pack_start (this.title, true, true, 0);
        
        this.channel = new Gtk.Label ({xalign:0});
        if (item.snippet.channelTitle) this.channel.set_text (item.snippet.channelTitle);
        box.pack_start (this.channel, true, true, 0);
        
        this.published = new Gtk.Label ({xalign:0});
        if (item.snippet.publishedAt) this.published.set_text (item.snippet.publishedAt);
        box.pack_start (this.published, true, true, 0);
        
        if (item.snippet.thumbnails.default.url) Utils.fetch (item.snippet.thumbnails.default.url,null,null, Lang.bind (this, (d,r)=>{
            if (r != 200) return;
            //print (d.get_size(),d.get_data().length);
            this.image.pixbuf = GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null);
        }));
        //print (item.videoId);
        if (item.id.videoId) Utils.fetch_formats (item.id.videoId, Lang.bind (this, (d)=>{
            this.item.data = d;
            print (d.format_id, d.id, d.ext);
            /*if (d.formats) d.formats.forEach ( p => {
                print (p.format);
                print (p.url);
            });*/
        }));
        //this.connect ("notify", (o,a,b,c) => {print (o,a);});
        this.show_all ();
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
