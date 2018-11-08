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
//const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const Lang = imports.lang;
const Signals = imports.signals;

let timer = 0;

var PlayerEngine = new Lang.Class({
  Name: "PlayerEngine",
  Extends: GObject.GObject,
  Signals: {
    'state-changed': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_INT, GObject.TYPE_INT, GObject.TYPE_INT]},
    'progress': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_INT, GObject.TYPE_INT]},
  },

  _init: function () {
    Gst.init(null); //["GST_GL_PLATFORM=\"egl\""]
    this.current_state = 0;

    this.playbin = Gst.ElementFactory.make("playbin", null);
    this.audiosink = Gst.ElementFactory.make("pulsesink", "audiosink");
    this.playbin.set_property("audio-sink", this.audiosink);
    //this.videosink = Gst.ElementFactory.make("glimagesink", "videosink");
    //this.playbin.set_property("video-sink", this.videosink);

    this.bus = this.playbin.get_bus();
    this.bus.add_signal_watch();
    this.bus.connect ("message", Lang.bind (this, this.on_bus_message));

    timer = GLib.timeout_add (0, 500, Lang.bind (this, this.on_timer));
  },

  get state () {
    return this.current_state;
  },

  get position () {
    let pos, res;
    [res, pos] = this.playbin.query_position (Gst.Format.TIME);
    if (!res) pos = -1;
    else pos /= Gst.MSECOND;
    return pos;
  },

  get duration () {
    let dur, res;
    [res, dur] = this.playbin.query_duration (Gst.Format.TIME);
    if (!res) dur = -1;
    else dur /= Gst.MSECOND;
    return dur;
  },

  open: function (uri) {
    this.playbin.set_state (Gst.State.NULL);
    this.playbin.set_property ("uri", uri);
    this.playbin.set_state (Gst.State.PLAYING);
  },

  play: function () {
    this.playbin.set_state (Gst.State.PLAYING);
  },

  pause: function () {
    this.playbin.set_state (Gst.State.PAUSED);
  },

  stop: function () {
    this.playbin.set_state (Gst.State.NULL);
  },

  set_window: function (xid) {
    if (!xid) return;
    this.handler = xid;
    //this.videosink.expose ();
    //print ("XID: ", xid);
  },

  set_videosink: function (sink) {
    this.videosink = sink;
    this.playbin.set_property("video-sink", this.videosink);
  },

  get_videosink: function (name) {
    name = name || "cluttersink";
    if (!this.videosink) {
      this.videosink = Gst.ElementFactory.make (name, "videosink");
      this.playbin.set_property ("video-sink", this.videosink);
    }
    return this.videosink;
  },

  on_bus_message: function (bus,msg,a,b,c) {
    //TODO Process messages
    //print (msg.type);
    if (GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
      //print ("Seet overlay...", msg.type, this.handler);
      var overlay = msg.src;
      if (!overlay || !this.handler) return false;
      overlay.set_window_handle (this.handler);
    } else if (msg.type == Gst.MessageType.EOS) {
      this.playbin.set_state(Gst.State.READY);
    } else if (msg.type == Gst.MessageType.STATE_CHANGED) {
      let [oldstate, newstate, pending] = msg.parse_state_changed ();
      if (this.current_state == newstate) return true;
      this.current_state = newstate;
      this.emit ('state-changed', oldstate, newstate, pending);
    }
  return true;
  },

  on_timer: function () {
    var pos = this.position, dur = this.duration;
    if (pos >= 0) {
      this.emit ("progress", pos, dur);
      //print ("progress", pos, dur);
    }
    return true;
  }
});

Signals.addSignalMethods(PlayerEngine.prototype);
