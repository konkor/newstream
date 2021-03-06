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
const System = imports.system;

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkX11 = imports.gi.GdkX11;
const GdkPixbuf = imports.gi.GdkPixbuf;
const GtkClutter = imports.gi.GtkClutter;
const Clutter = imports.gi.Clutter;
//const Cogl = imports.gi.Cogl;
const ClutterGst = imports.gi.ClutterGst;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Logger = imports.common.Logger;
const PlayerEngine = imports.common.PlayerEngine;
const Utils = imports.common.Utils;

var CG_VERSION = 3;
if (!ClutterGst.Content) CG_VERSION = 2;

const OVERLAY_OPACITY = 220;

let APPDIR = "";
let window_handler = 0;

var Player = new Lang.Class({
  Name: "Player",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.w = sender;
    APPDIR = this.w.application.current_dir;

    GtkClutter.init (null);
    ClutterGst.init(null);

    this.engine = new PlayerEngine.PlayerEngine ();
    this.video = new VideoFrame (this);
    this.pack_start (this.video, true, true, 0);

    this.connect ('unrealize', (o) => {
      this.engine.stop ();
    });
    this.engine.connect ('state-changed', (s,o,n,p) => {
      //print ("state-changed:", o,n,p);
      if (this.w.stack.visible_child_name != "item") {
        this.w.phones.visible = n == 4;
      } else {
        if (this.item.title != this.w.section.label)
          this.w.section.label = this.item.title;
          this.video.contents.header.label = this.item.title;
      }
      if (n != 4) this.get_toplevel ().application.lookup_action ("uninhibit").activate (null);
      else if (this.video.fullscreen) this.get_toplevel ().application.lookup_action ("inhibit").activate (null);
    });
    this.engine.connect ('buffering', (o, p) => {
      if (p == 100) this.w.spinner.stop ();
      else this.w.spinner.start ();
    });
  },

  load: function (item) {
    if (!item || !item.id) return;
    this.seek_unshedule ();
    if (!this.item || (this.item.id != item.id)) {
      this.item = item;
      this.get_cover ();
      this.engine.open ();
      /*
      {"asr":null,"tbr":99.735,"container":"webm","format":"278 - 256x144 (144p)",
      "url":"https://r2---sn-3tp8nu5g-3c2y.googlevideo.com/...","vcodec":"vp9",
      "format_note":"144p","player_url":null,"downloader_options":{
        "http_chunk_size":10485760
      },"width":256,"ext":"webm","filesize":35396973,"fps":30,"protocol":"https",
      "format_id":"278","height":144,"http_headers":{
        "Accept-Charset":"ISO-8859-1,utf-8;q=0.7,*;q=0.7",
        "Accept-Language":"en-us,en;q=0.5",
        "Accept-Encoding":"gzip, deflate",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9;q=0.8",
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.136 Safari/537.36"
      },"acodec":"none"}*/

      if (this.item.id) Utils.fetch_formats (this.item.id, (d) => {
        this.formats = d;
        this.fps = 30;
        let audio = null, video = null;
        if (d && d.format) debug ("%s %s %s".format (d.format, d.vcodec, d.acodec));
        if (d && d.formats) d.formats.forEach (p => {
          //debug (JSON.stringify (p));
          if (p.protocol == "http_dash_segments") return;
          if ((p.vcodec != "none") && (p.height <= this.w.settings.video_quality)) {
            if (!video) video = p;
            else {
              if (video.height < p.height) video = p;
              else if (p.vcodec.indexOf (this.w.settings.video_format) == 0) video = p;
            }
          } else {
            if (!audio) audio = p;
            else {
              if (p.abr > audio.abr) audio = p;
            }
          }
        });
        if (video && video.fps) this.fps = video.fps;
        if (audio || video) {
          if (!audio && video.acodec != "none") audio = video;
          this.w.settings.add_view_history (this.item);
          this.engine.open (video, audio);
          this.show_all ();
        }
        this.w.player_menu.load_formats (d.formats, d.format_id);
        //print (d.format_id, d.id, d.ext);
        //if (d.formats) d.formats.forEach ( p => {
        //print (p.format);
        //print (p.url);
      });
      this.w.application.lookup_action ("player-enabled").activate (null);
      //this.engine.volume = 0.5;
    } else {
      if (this.engine.state != 4) {
        this.w.settings.add_view_history (this.item);
      }
      this.engine.play ();
    }
    System.gc ();
  },

  set_audio: function (url) {
    if (this.engine) {
      let pos = this.video.contents.controls.current_position;
      debug ("position: " + pos);
      this.engine.stop ();
      this.engine.set_audio (url);
      this.engine.pause ();
      GLib.timeout_add (0, 500, () => {this.seek (pos, true)});
      //TODO this.seek_on_ready = pos;
    }
  },

  set_video: function (url) {
    if (this.engine) {
      //let pos = this.engine.position;
      this.engine.stop ();
      this.engine.set_video (url);
      //if (pos > 0) this.seek (pos);
      //this.engine.play ();
    }
  },

  open: function (url) {
    if (this.engine && url) this.engine.open (url);
  },

  play: function () {
    if (this.engine) this.engine.play ();
  },

  stop: function () {
    if (this.engine) this.engine.stop ();
  },

  pause: function () {
    if (this.engine) this.engine.pause ();
  },

  toggle_play: function () {
    if (this.engine.state == 4) this.engine.pause ();
    else this.engine.play ();
  },

  seek: function (pos, accurate) {
    accurate = accurate || false;
    if (this.engine) this.engine.seek (pos, accurate);
  },

  seek_delta: function (offset, accurate) {
    if (!this.item) return;
    let pos = this.video.contents.controls.current_position + offset * 1000;
    let dur = this.video.contents.controls.duration;
    if (pos > dur) pos = dur;
    if (pos < 0) pos = 0;
    this.seek_unshedule ();
    this.seek_id = GLib.timeout_add (100, 250, ()=>{
      this.seek_id = 0;
      this.seek (pos, accurate);
      return false;
    });
    //this.seek (pos, accurate);
  },

  seek_frame: function (offset) {
    if (!this.item) return;
    let fps = this.fps || 30;
    this.pause ();
    this.seek_delta (offset / fps, true);
  },

  seek_unshedule: function () {
    if (this.seek_id) {
      GLib.source_remove (this.seek_id);
      this.seek_id = 0;
    }
  },

  set_volume: function (volume) {
    if (!this.engine) return;
    this.engine.volume = volume;
    this.video.contents.controls.volume.value = this.engine.volume;
  },

  set_volume_delta: function (offset) {
    let vol = this.engine.volume + offset;
    if (vol > 1) vol = 1;
    if (vol < 0) vol = 0;
    this.set_volume (vol);
  },

  get_cover: function () {
    this.video.contents.set_cover (null);
    if (!this.item.id) return;

    if (this.item.cover_url) Utils.fetch (this.item.cover_url, null, null, (d,r) => {
      if (r == 200) try {
        this.video.contents.set_cover (GdkPixbuf.Pixbuf.new_from_stream (Gio.MemoryInputStream.new_from_bytes (d), null));
      } catch (e) {debug (e.message);};
    });
  },

  set_preset: function (preset_type) {
    debug ("Set quality preset: " + preset_type);
  },

  set_audio_format: function (format) {
    debug ("set_audio_format: " + format);
  },

  set_video_format: function (format) {
    debug ("set_video_format: " + format);
  }
});

var VideoFrame = new Lang.Class({
  Name: "VideoFrame",
  Extends: Gtk.Box,

  _init: function (sender) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.mainwindow = sender.w;

    this.frame = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.frame.override_background_color (Gtk.StateFlags.NORMAL, new Gdk.RGBA({alpha:1}));
    this.frame.set_size_request (100,480);
    this.frame.show ();
    this.pack_start (this.frame, true, true, 0);

    this.contents = new VideoWidget (sender);
    this.frame.add (this.contents);

    this.contents.connect ('button-press-event', (o, e) => {
      //print ('button-press-event', e.get_event_type());
      if (this.toggle_play_id) {
        GLib.source_remove (this.toggle_play_id);
        this.toggle_play_id = 0;
      }
      if (e.get_event_type() == Gdk.EventType.DOUBLE_BUTTON_PRESS) this.toggle_fullscreen ();
      else if (e.get_event_type() == Gdk.EventType.BUTTON_PRESS) {
        this.toggle_play_id = GLib.timeout_add (0, 750, () => {
          this.toggle_play_id = 0;
          this.contents.player.toggle_play ();
        });
      }
    });
    this.connect ('realize', () => {
      this.get_toplevel ().save_geometry ();
      this.move_internal ();
    });
  },

  toggle_fullscreen: function () {
    this.contents.set_controls_visibility (false, false);
    this.mainwindow.present ();

    if (this.fullscreen) {
      this.move_internal ();
    } else {
      this.move_fullscreen ();
    }
  },

  move_fullscreen: function () {
    this.mainwindow.save_geometry ();
    if (!this.fullscreen) {
      this.mainwindow.fullscreen ();
      this.mainwindow.itemview.details.visible = false;
      this.mainwindow.itemview.results.visible = false;
      let [w, h] = this.mainwindow.get_size ();
      this.frame.set_size_request (w, h);
      this.fullscreen = true;
    }
    this.mainwindow.application.lookup_action ("inhibit").activate (null);
  },

  move_internal: function () {
    this.mainwindow.restore_position ();
    if (this.fullscreen) {
      this.mainwindow.unfullscreen ();
      this.mainwindow.itemview.details.visible = true;
      this.mainwindow.itemview.results.visible = true;
      this.frame.set_size_request (100,480);
      this.fullscreen = false;
    }
    this.mainwindow.application.lookup_action ("uninhibit").activate (null);
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

    this.connect ("motion_notify_event", this.on_motion_notify.bind (this));
    this.player.engine.connect ('state-changed', this.on_player_state.bind (this));

    this.set_controls_visibility (false);
  },

  build: function () {
    this.stage = this.get_stage ();
    this.stage.set_layout_manager (new Clutter.BinLayout ({
      x_align: Clutter.BinAlignment.FILL,
      y_align: Clutter.BinAlignment.FILL,
    }));
    this.stage.set_background_color (new Clutter.Color ());

    this.cover_frame = new GtkClutter.Actor ();
    this.cover = Clutter.Image.new ();
    this.cover_frame.set_content (this.cover);
    this.cover_frame.set_content_gravity (Clutter.ContentGravity.RESIZE_ASPECT);
    this.stage.add_child (this.cover_frame);
    //this.cover_frame.hide ();

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
    this.stage.set_child_above_sibling (this.cover_frame, this.frame);

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
    this.header.margin = 8;
    this.header_controls.get_widget().add (this.header);
    this.header.show_all ();
    this.stage.set_child_above_sibling (layout, this.frame);

    /* Video controls */
    this.controls = new VideoControl (this);
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
    this.stage.set_child_above_sibling (layout, this.cover_frame);

    //var theme = Gtk.IconTheme.get_for_screen (this.player.get_screen ());
    //this.logo_pixbuf = theme.load_icon ("applications-multimedia", 256, 0);
    this.logo_pixbuf = GdkPixbuf.Pixbuf.new_from_file (APPDIR + "/data/icons/newstream.cover.svg");
    this.set_cover ();
    this.connect ("unmap", () => {
      this.set_controls_visibility (false, false);
    });
  },

  get_cover_pixbuf: function () {
    if (this.cover_pixbuf) return this.cover_pixbuf;
    else return this.logo_pixbuf;
  },

  set_cover: function (cover) {
    this.cover_pixbuf = cover || null;
    var pb = this.get_cover_pixbuf ();
    if (!pb) return;
    this.cover.set_data (
      pb.get_pixels(), pb.get_has_alpha() ? 19 : 2,
      pb.get_width (), pb.get_height (), pb.get_rowstride ()
    );
  },

  set_cover_visiblity: function (val) {
    if (val) {
      /*if (this.cover_id) {
        GLib.source_remove (this.cover_id);
        this.cover_id = 0;
      }*/
      this.cover_frame.show ();
      //this.cover_frame.set_opacity (255);
      this.frame.hide ();
    } else {
      this.frame.show ();
      this.cover_frame.hide ();
      /*this.cover_frame.set_easing_duration (500);
      this.cover_frame.set_opacity (0);
      this.cover_id = GLib.timeout_add (0, 500, () => {
        this.cover_id = 0;
        this.cover_frame.hide ();
        return false;
      });*/
    }
  },

  on_player_state: function (engine, o,n,p) {
    //print (o,n,p,!((n == 4) || (n == 3)));
    /*if (this.player.seek_on_ready && (n == 3)) {
      debug ("seek_on_ready");
      engine.seek (this.player.seek_on_ready, true);
      this.player.seek_on_ready = 0;
    }*/
    this.set_cover_visiblity (!((n == 4) || (n == 3)) || !engine.video_stream);
  },

  set_controls_busy: function (val) {
    if (val) {
      this.unschedule_hiding_popup ();
      this.set_controls_visibility (true, false);
    } else this.schedule_hiding_popup ();
  },

  on_motion_notify: function (o, event) {
    //print (o, event);
    if (!this.control_visible)
      this.set_controls_visibility (true);
    let [,x,y] = event.get_coords ();
    //let src = event.get_window().get_user_data (); Always NULL
    //TODO: we could use other methods like handle focus-in event
    [,x,y] = this.controls.box.translate_coordinates (o, x, y);
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
    animate = (typeof animate !== 'undefined') ?  animate : true;
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
    this.control_visible = visible;
    //BUG: New Gtk? doesn't redraw controls after unmap
    if (visible) GLib.timeout_add (0, animate+50, () =>  {
      this.controls.visible = false;
      this.controls.visible = true;
    });
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

  _init: function (sender) {
    this.parent ();
    this.sender = sender;
    this.player = sender.player;
    this.seekable = false;
    this.seek_lock = false;
    this.current_position = 0;
    this.duration = 0;
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

    this.play = new PlayButton ();
    this.play.connect ("play", this.on_play.bind (this));
    this.box.add (this.play);

    this.time = new Gtk.Label ({label: "0:00"});
    this.time.get_style_context ().add_class ("small");
    this.box.add (this.time);

    this.seek_scale = new Gtk.Scale ({
      orientation:Gtk.Orientation.HORIZONTAL,
      draw_value:false,
      restrict_to_fill_level:false
    });
    this.seek_scale.adjustment.upper = 0.0;
    this.seek_scale.adjustment.page_increment = 10;
    this.seek_scale.adjustment.step_increment = 0.1;
    this.seek_scale.expand = true;
    this.box.pack_start (this.seek_scale, true, true, 0);
    //this.box.add (this.seek_scale);

    this.time_duration = new Gtk.Label ({label: "-", margin_right:6});
    this.time_duration.get_style_context ().add_class ("small");
    this.box.add (this.time_duration);

    this.repeat = new Gtk.ToggleButton ();
    this.repeat.image = Gtk.Image.new_from_icon_name ("media-playlist-repeat-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.repeat.set_relief (Gtk.ReliefStyle.NONE);
    this.repeat.tooltip_text = "Repeat";
    this.repeat.active = this.player.engine.repeat;
    this.box.add (this.repeat);
    this.repeat.connect ("toggled", (o) => {this.player.engine.repeat = o.active;});

    this.volume = new Gtk.VolumeButton ({use_underline:true, use_symbolic:true, margin_right:2});
    this.volume.value = this.player.engine.volume;
    this.box.add (this.volume);

    this.box.show_all ();

    this.player.engine.connect ('state-changed', (s,o,n,p) => {
      debug ("state-changed (old,new,pending): " + o + n + p);
      this.play.toggle (n == 4);
    });
    this.player.engine.connect ('progress', this.on_progress.bind (this));

    this.seek_scale.connect ('button-press-event', () => {
      this.sender.set_controls_busy (true);
      this.seek_lock = true;
    });
    this.seek_scale.connect ('button-release-event', () => {
      this.seek_lock = false;
      this.sender.set_controls_busy (false);
    });
    this.seek_scale.connect ('value-changed', this.on_seek.bind (this));
    this.volume.connect ('value-changed', this.on_volume.bind (this));
  },

  on_play: function (o, state) {
    if (state) this.player.play ();
    else this.player.pause ();
  },

  on_progress: function (o, pos, dur) {
    //print ("progress", pos, dur);
    this.update_slider_visibility (dur);

    if (dur) this.seekable = true;
    else this.seekable = false;

    if (this.duration != dur) {
      this.duration = dur;
      this.set_time (this.time_duration, dur);
      this.seek_scale.sensitive = this.seekable;
    }
    if (dur <= 0) dur = 1;
    this.current_position = pos;

    if (!this.seek_lock) {
      this.seek_scale.set_value (this.current_position / dur * 65535);
      this.set_time (this.time, pos);
    }
  },

  on_seek: function (o) {
    if (!this.seek_lock) return;
    let pos = o.get_value () / 65535 * this.duration;
    this.set_time (this.time, pos);
    this.player.seek (pos);
  },

  on_volume: function (o) {
    this.player.engine.volume = o.value;
  },

  update_slider_visibility: function (dur) {
    if (this.duration == dur) return;
    if (this.duration > 0 && dur > 0) return;
    if (dur > 0) this.seek_scale.set_range (0.0, 65535.0);
    else this.seek_scale.set_range (0.0, 0.0);
  },

  set_time: function (label, time) {
    if (time < 0) {
      label.set_text ("-");
      return;
    }
    label.set_text (Utils.time_stamp (time/1000));
  }
});

var PlayButton = new Lang.Class({
  Name: "PlayButton",
  Extends: Gtk.Button,
  Signals: {
    'play': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_BOOLEAN]},
  },

  _init: function () {
    this.parent ({always_show_image: true, tooltip_text:"Play/Pause (Space)"});
    this.get_style_context ().add_class ("play-button");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.play_image = Gtk.Image.new_from_icon_name ("media-playback-start-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.pause_image = Gtk.Image.new_from_icon_name ("media-playback-pause-symbolic", Gtk.IconSize.SMALL_TOOLBAR);
    this.image = this.play_image;
    // States false - paused, true - playing
    this.state = false;
    this.connect ("clicked", () => {
      this.emit ("play", !this.state);
    });
  },

  toggle: function (state) {
    state = (typeof state !== 'undefined') ?  state : !this.state;
    if (state == this.state) return;
    this.state = state;
    if (this.state) this.image = this.pause_image;
    else this.image = this.play_image;
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
    let child = this.get_child_at_index (0);
    if (!child) return;
    child.paint ();
  }
});

const DOMAIN = "Player";
function error (msg) {Logger.error (DOMAIN, msg)}
function debug (msg) {Logger.debug (DOMAIN, msg)}
function info (msg) {Logger.info (DOMAIN, msg)}
