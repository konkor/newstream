/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkX11 = imports.gi.GdkX11;
const GtkClutter = imports.gi.GtkClutter;
const Clutter = imports.gi.Clutter;
const ClutterGst = imports.gi.ClutterGst;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const PlayerEngine = imports.common.PlayerEngine;
const Utils = imports.common.Utils;

var CG_VERSION = 3;
if (!ClutterGst.Content) CG_VERSION = 2;

const OVERLAY_OPACITY = 220;

let window_handler = 0;

var Player = new Lang.Class({
  Name: "Player",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.w = sender;

    GtkClutter.init (null);
    ClutterGst.init(null);

    this.engine = new PlayerEngine.PlayerEngine ();
    this.video = new VideoFrame (this);
    this.pack_start (this.video, true, true, 0);

    this.connect ('unrealize', Lang.bind (this, (o)=>{
      this.engine.stop ();
    }));
    this.engine.connect ('state-changed', Lang.bind (this, (s,o,n,p)=>{
      //print ("state-changed:", o,n,p);
      if (this.w.stack.visible_child_name != "item") {
        this.w.phones.visible = n == 4;
      } else {
        if (this.item.snippet.title != this.w.section.label)
          this.w.section.label = this.item.snippet.title;
          this.video.contents.header.label = this.item.snippet.title;
      }
    }));
  },

  load: function (item) {
    //print (item, "\n\n\n");
    let data = item;
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

    this.contents = new VideoWidget (sender);
    this.video_window = new FullscreenWindow (sender);
    this.video_window.realize ();
    this.video_window.add (this.contents);

    this.frame = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.frame.override_background_color (Gtk.StateFlags.NORMAL, new Gdk.RGBA({alpha:1}));
    this.frame.set_size_request (100,480);
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
    this.contents.set_controls_visibility (false, false);
    this.get_toplevel ().present ();

    if (this.fullscreen) {
      this.move_internal ();
    } else {
      this.move_fullscreen ();
    }
  },

  move_fullscreen: function () {
    if (this.contents.parent != this.video_window) {
      this.contents.reparent (this.video_window);
      this.contents.show_all ();
      this.fullscreen = true;
      this.get_toplevel ().hide ();
      this.video_window.show ();
      this.video_window.fullscreen ();
    }
  },

  move_internal: function () {
    this.video_window.unfullscreen ();
    this.video_window.hide ();
    if (this.contents.parent != this.frame) {
      this.get_toplevel ().present ();
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
    this.mainwindow = sender.w;
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

var VideoWidget = new Lang.Class ({
  Name: "VideoWidget",
  Extends: GtkClutter.Embed,

  _init: function (sender) {
    if (!sender || !sender.engine) throw "No player engine!";
    this.player = sender;
    this.control_visible = false;
    this.control_timeout_id = 0;
    this.parent ();
    this.build ();

    this.connect ("motion_notify_event", Lang.bind (this, this.on_motion_notify));

    this.set_controls_visibility (true);
  },

  build: function () {
    this.stage = this.get_stage ();
    this.stage.set_layout_manager (new Clutter.BinLayout ({
      x_align: Clutter.BinAlignment.FILL,
      y_align: Clutter.BinAlignment.FILL,
    }));
    this.stage.set_background_color (new Clutter.Color ());

    if (CG_VERSION < 3) {
      //this.videosink = Gst.ElementFactory.make ("cluttersink", "videosink");
      this.texture = new Clutter.Texture ({"disable-slicing":true, "reactive":true});
      this.player.engine.get_videosink().set_property ("texture", this.texture);
      this.frame = new AspectFrame ();
      this.frame.add_child (this.texture);
    } else {
      let videosink = new ClutterGst.VideoSink ();
      this.frame = new Clutter.Actor ({
        "content": new ClutterGst.Aspectratio ({"sink": videosink}),
        "name": "texture",
        "reactive": true
      });
      this.player.engine.set_videosink (videosink);
    }
    this.stage.add_child (this.frame);

    /* Fullscreen header controls */
    this.header_controls = new GtkClutter.Actor ();
    this.header_controls.set_opacity (OVERLAY_OPACITY);
    this.header_controls.add_constraint (new Clutter.BindConstraint (this.stage, Clutter.BindCoordinate.WIDTH, 0));
    let layout = new Clutter.Actor ({
      "layout-manager": new Clutter.BinLayout ({
        x_align: Clutter.BinAlignment.CENTER,
        y_align: Clutter.BinAlignment.START,
      })
    });
    layout.add_child (this.header_controls);
    this.stage.add_child (layout);
    this.header = new Gtk.Label ({label:"New Stream", wrap: true, lines: 1, ellipsize: 3, xalign:0});
    this.header_controls.get_widget().add (this.header);
    this.header.show_all ();
    this.stage.set_child_above_sibling (layout, this.frame);

    /* Video controls */
    this.controls = new VideoControl (this.player);
    this.controls.set_opacity (OVERLAY_OPACITY);
    this.controls.add_constraint (new Clutter.BindConstraint (this.stage, Clutter.BindCoordinate.WIDTH, 0));
    layout = new Clutter.Actor ({
      "layout-manager": new Clutter.BinLayout ({
        x_align: Clutter.BinAlignment.FILL,
        y_align: Clutter.BinAlignment.END,
      })
    });
    layout.add_child (this.controls);
    this.stage.add_child (layout);
    this.stage.set_child_above_sibling (layout, this.frame);
  },

  on_motion_notify: function (o, event) {
    //print (o, event);
    if (!this.control_visible)
      this.set_controls_visibility (true);
    let [,x,y] = event.get_coords ();
    if (this.ignore_motion (x, y)) {
      this.unschedule_hiding_popup ();
    } else {
      this.schedule_hiding_popup ();
    }
  },

  ignore_motion: function (x, y) {
    let actor = this.stage.get_actor_at_pos (Clutter.PickMode.REACTIVE, x, y);
    if (actor == this.controls) return true;
    return false;
  },

  set_controls_visibility: function (visible, animate) {
    animate = animate || true;
    let transition = animate ? 250 : 0;
    if (this.player.video && this.player.video.fullscreen || !visible) {
      let [,header_controls_height] = this.header_controls.get_preferred_height (this.header_controls);
      let header_controls_y = visible ? 0 : -header_controls_height;
      //print (header_controls_y);
      this.header_controls.set_easing_duration (transition);
      this.header_controls.set_y (header_controls_y);
    }
    let opacity = visible ? OVERLAY_OPACITY : 0;
    this.controls.set_easing_duration (transition);
    this.controls.set_opacity (opacity);

    this.set_show_cursor (visible);
    //if (visible) this.schedule_hiding_popup ();
    this.control_visible = visible;
  },

  schedule_hiding_popup: function () {
    this.unschedule_hiding_popup ();
    this.control_timeout_id = GLib.timeout_add (0, 5000, () => {
      this.unschedule_hiding_popup ();
      this.set_controls_visibility (false);
      return false;
    });
  },

  unschedule_hiding_popup: function () {
    if (this.control_timeout_id > 0)
      GLib.source_remove (this.control_timeout_id);
    this.control_timeout_id = 0;
  },

  set_show_cursor: function (show) {
    let window = this.get_window ();
    if (!window) return;

    if (show) window.cursor = null;
    else {
      let cursor = Gdk.Cursor.new (Gdk.CursorType.BLANK_CURSOR);
      window.cursor = cursor;
    }
  }

});

var VideoControl = new Lang.Class ({
  Name: "VideoControl",
  Extends: GtkClutter.Actor,

  _init: function (player) {
    this.parent ();
    this.player = player;
    this.build ();
    this.show_all ();
  },

  build: function () {
    this.box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, spacing:8});
    this.box.get_style_context ().add_class ("osd");
    this.box.get_style_context ().add_class ("bottom");
    //this.box.override_background_color (0, new Gdk.RGBA ());
    this.box.hexpand = true;
    this.get_widget ().add (this.box);

    this.play = new Gtk.ToggleButton ({label:"Play", margin:12});
    this.box.add (this.play);

    this.time = new Gtk.Label ({label: "0:00"});
    this.box.add (this.time);

    this.seek_scale = new Gtk.Scale ({
      orientation:Gtk.Orientation.HORIZONTAL,
      draw_value:false,
      restrict_to_fill_level:false
    });
    this.seek_scale.adjustment.upper = 10000;
    this.seek_scale.adjustment.page_increment = 10;
    this.seek_scale.adjustment.step_increment = 0.1;
    this.seek_scale.expand = true;
    this.box.pack_start (this.seek_scale, true, true, 0);
    //this.box.add (this.seek_scale);

    this.duration = new Gtk.Label ({label: "0:00",margin_right:24});
    this.box.add (this.duration);

    this.box.show_all ();
  }

});

var AspectFrame = new Lang.Class ({
  Name: "AspectFrame",
  Extends: Clutter.Actor,

  _init: function () {
    this.parent ({name: "frame"});
    this.set_pivot_point ( 0.5, 0.5);
  },

  vfunc_allocate: function (box, flags) {
    this.parent (box, flags);
    let child = this.get_child_at_index (0);
    if (!child) return;
    var box_width = box.x2 - box.x1;
    var box_height = box.y2 - box.y1;
    let [,,width, height] = child.get_preferred_size ();
    if (width <= 0 || height <= 0) return;

    var aspect = box_width / box_height;
    var child_aspect = width / height;

    if (aspect < child_aspect) {
      width = box_width;
      height = box_width / child_aspect;
    } else {
      height = box_height;
      width = box_height * child_aspect;
    }
    let child_box = new Clutter.ActorBox({
      x1: (box_width - width) / 2,
      y1: (box_height - height) / 2,
      x2: (box_width - width) / 2 + width,
      y2: (box_height - height) / 2 + height
    });
    child.allocate (child_box, flags);
    child.queue_redraw ();
  },

  on_pick: function (color) {
    //print (actor);
    let child = this.get_child_at_index (0);
    if (!child) return;
    child.paint ();
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
