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
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const GdkX11 = imports.gi.GdkX11;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const PlayerEngine = imports.common.PlayerEngine;
const Utils = imports.common.Utils;

let window_handler = 0;

var Player = new Lang.Class({
    Name: "Player",
    Extends: Gtk.Box,

    _init: function (sender) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL});
        this.w = sender;
        this.engine = new PlayerEngine.PlayerEngine ();
        this.video = new VideoFrame (sender);
        this.pack_start (this.video, true, true, 0);

        this.video.contents.video_display.connect ('realize', Lang.bind (this, (o)=>{
        //this.connect ('realize', Lang.bind (this, ()=>{
            //let xid = this.video.contents.video_display.window.get_xid ();
            let xid = o.window.get_xid ();
            print ("video_window xid:", xid);
            if (this.engine) this.engine.set_window (xid);
        }));
        this.connect ('unrealize', Lang.bind (this, (o)=>{
            this.engine.stop ();
        }));
        this.engine.connect ('state-changed', Lang.bind (this, (s,o,n,p)=>{
            //print ("state-changed:", o,n,p);
            if (this.w.stack.visible_child_name != "item") {
              this.w.phones.visible = n == 4;
            }
        }));
    },

    load: function (item) {
        //print (item, "\n\n\n");
        let data = JSON.parse (item).items[0];
        if (!data || !data.id) return;
        if (!this.item || (this.item.id != data.id)) {
          this.item = data;
          //return;
          if (this.item.id) Utils.fetch_formats (this.item.id, Lang.bind (this, (d)=>{
            this.formats = d;
            print (d);
            var url = "";
            //print (o,item);
            if (d && d.formats) d.formats.forEach (p => {
                if (d.format_id == p.format_id) url = p.url;
            });
            if (url) {
                print (url);
                //url = Gio.File.new_for_path ("/home/kapa/projects/gjs-templates/video-player/test.webm").get_uri();
                //url = "https://download.blender.org/durian/trailer/sintel_trailer-480p.ogv";
                //if (window_handler) this.engine.set_window (window_handler);
                this.engine.open (url);
                //GLib.animate_event = GLib.timeout_add (100, 2000, Lang.bind (this, ()=>{this.engine.play ();}));
                this.show_all ();
            }
            //print (d.format_id, d.id, d.ext);
            //if (d.formats) d.formats.forEach ( p => {
                //print (p.format);
                //print (p.url);
        }));
      } else {
        this.engine.play ();
      }
    }
});

var VideoFrame = new Lang.Class({
    Name: "VideoFrame",
    Extends: Gtk.Box,

    _init: function (sender) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL});

        this.contents = new VideoContents ();
        this.video_window = new FullscreenWindow (sender);
        this.video_window.realize ();
        this.video_window.add (this.contents);

        this.frame = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        this.frame.override_background_color (Gtk.StateFlags.NORMAL, new Gdk.RGBA({alpha:1}));
        this.frame.set_size_request (100,240);
        this.frame.show ();
        this.pack_start (this.frame, true, true, 0);
        this.contents.connect ('button-press-event', Lang.bind (this, (o, e)=>{
            //print ('button-press-event', e.get_event_type());
            if (e.get_event_type() == Gdk.EventType.DOUBLE_BUTTON_PRESS) this.toggle_fullscreen ();
        }));
        this.connect ('realize', Lang.bind (this, ()=>{
            this.move_internal ();
        }));
    },

    toggle_fullscreen: function () {
        if (this.fullscreen) {
            this.video_window.unfullscreen ();
            this.video_window.hide ();
            this.move_internal ();

        } else {
            this.move_fullscreen ();
            this.video_window.show ();
            this.video_window.fullscreen ();
        }
    },

    move_fullscreen: function () {
        if (this.contents.parent != this.video_window) {
            this.contents.reparent (this.video_window);
            this.contents.show_all ();
            this.fullscreen = true;
        }
    },

    move_internal: function () {
        if (this.contents.parent != this.frame) {
            this.contents.reparent (this.frame);
            this.contents.show_all ();
            this.fullscreen = false;
        }
    }
});

var FullscreenWindow = new Lang.Class({
    Name: "FullscreenWindow",
    Extends: Gtk.Window,

    _init: function (sender) {
        this.parent ({type: Gtk.WindowType.TOPLEVEL});
        this.mainwindow = sender;
        this.can_focus = true;
        this.decorated = false;
        this.deletable = false;
        this.transient_for = null;

        this.control = null;

        this.connect ('window_state_event', Lang.bind (this, (o, e)=>{
            var state = this.window.get_state();
            if (state == Gdk.WindowState.FULLSCREEN) this.set_bounds ();
        }));
    },

    set_bounds: function () {
        var monitor = 0;
        if (this.mainwindow.window) monitor = this.screen.get_monitor_at_window (this.mainwindow.window);
        var bounds = this.screen.get_monitor_geometry (0);
        this.move (bounds.x, bounds.y);
        this.resize (bounds.width, bounds.height);
    }
});

var VideoContents = new Lang.Class({
    Name: "VideoContents",
    Extends: Gtk.Box,

    _init: function (parent) {
        this.parent ();
        this.video_display = new VideoArea ();

        this.ebox = new Gtk.EventBox ();
        this.ebox.hexpand = true;
        this.ebox.vexpand = true;
        //this.ebox.visible_window = false;
        this.ebox.can_focus = true;
        this.ebox.above_child = true;
        this.ebox.add (this.video_display);
        this.ebox.events |= Gdk.EventMask.POINTER_MOTION_MASK |
				Gdk.EventMask.BUTTON_PRESS_MASK |
				Gdk.EventMask.BUTTON_MOTION_MASK |
				Gdk.EventMask.KEY_PRESS_MASK |
				Gdk.EventMask.KEY_RELEASE_MASK;
        this.pack_start (this.ebox, true, true, 0);
    }
});

var VideoArea = new Lang.Class({
    Name: "VideoArea",
    Extends: Gtk.DrawingArea,

    _init: function (parent) {
        this.parent ();
        //this.double_buffered = false;
        var [,color] = Gdk.Color.parse ("#000");
        this.modify_bg (Gtk.StateType.NORMAL, color);
        //this.realize ();
        //this.set_size_request (100,240);
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
