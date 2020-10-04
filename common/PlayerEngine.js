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
const Signals = imports.signals;

const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
//const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;

const Logger = imports.common.Logger;

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
    this.video_stream = false;
    this.audio_stream = false;

    //this.pipeline = new Gst.Pipeline ({name:"xstream"});

    //Main Video(audio, subtitles) stream
    //this.playbin = Gst.ElementFactory.make("playbin", "mainbin");
    this.audiosink = Gst.ElementFactory.make ("pulsesink", "audiosink");
    if (!this.audiosink)
      this.audiosink = Gst.ElementFactory.make ("alsasink", "audiosink");

    /*//Audio stream
    //this.audiobin = Gst.ElementFactory.make ("playbin", "audiobin");
    //this.audiosink2 = Gst.ElementFactory.make ("pulsesink", "audiosink2");
    //this.audiobin = Gst.parse_launch ("uridecodebin name=\"audiouri\" ! audioconvert ! audio/x-raw ! pulsesink");
    this.audiobin = Gst.parse_launch ("uridecodebin name=\"audiouri\" ! audioconvert ! pulsesink");
    print ("audiobin.name", this.audiobin.name);
    this.audiodec = this.audiobin.get_by_name ("audiouri");
    //this.audiobin.add (this.audiosink);

    //this.videosink = Gst.ElementFactory.make ("cluttersink", "videosink");
    this.videobin = Gst.parse_launch ("uridecodebin name=\"videouri\" ! autovideoconvert ! cluttersink  name=\"videosink\"");
    print ("videobin.name", this.videobin.name);
    this.videodec = this.videobin.get_by_name ("videouri");
    this.videosink = this.videobin.get_by_name ("videosink");
    //this.videobin.add (this.videosink);
    */

    this.pipeline = Gst.parse_launch ("uridecodebin name=\"videouri\" ! autovideoconvert ! cluttersink  name=\"videosink\" uridecodebin name=\"audiouri\" ! audioconvert ! pulsesink");
    this.audiodec = this.pipeline.get_by_name ("audiouri");
    this.videodec = this.pipeline.get_by_name ("videouri");
    this.videosink = this.pipeline.get_by_name ("videosink");

    //Fake outputs
    this.fakeaudio = Gst.ElementFactory.make ("fakesink", "fakeaudio");
    this.fakevideo = Gst.ElementFactory.make ("fakesink", "fakevideo");

    ////this.pipeline.add (this.playbin);
    ////this.audiobin.set_property ("video-sink", this.fakevideo);
    //this.audiobin.set_property ("flags", 2);
    //this.audiobin.set_property ("audio-sink", this.audiosink2);

    this.current_volume = 0;
    this.repeat = false;

    this.bus = this.pipeline.get_bus ();
    this.bus.add_signal_watch ();
    this.bus.connect ("message", this.on_bus_message.bind (this));

    timer = GLib.timeout_add (0, 1000, this.on_timer.bind (this));
  },

  get state () {
    return this.current_state;
  },

  get position () {
    let pos, res, pipe = this.video_stream ? this.videobin : this.audiobin;
    [res, pos] = this.pipeline.query_position (Gst.Format.TIME);
    if (!res) pos = -1;
    else pos /= Gst.MSECOND;
    return pos;
  },

  get duration () {
    let dur, res;
    [res, dur] = this.pipeline.query_duration (Gst.Format.TIME);
    if (!res) dur = -1;
    else dur /= Gst.MSECOND;
    return dur;
  },

  get volume () {
    //if (!this.current_volume && this.pipeline) this.current_volume = this.audiobin.get_volume (1);
    return this.current_volume;
  },

  set volume (val) {
    if (!this.pipeline) return;
    val = val || 0;
    if (val > 1) val = 1.0;
    this.audiobin.set_volume (1, val);
    //this.playbin.set_volume (1, val);
    this.current_volume = val;
  },

  open: function (video_url, audio_url) {
    //video_url = "http://192.168.1.2:8088/0/test.mp4";audio_url = "http://192.168.1.2:8088/0/test.mp4";
    this.pipeline.set_state (Gst.State.NULL);
    print ("open video/audio streams:\n" + video_url + "\n\n" + audio_url);
    this.set_audio (audio_url || video_url);
    this.set_video (video_url);
    this.pipeline.set_state (Gst.State.PLAYING);
  },

  set_audio: function (url) {
    print ("set audio streams:\n" + url);
    if (url == this.audio_url) return;
    this.audio_url = url || null;
    if (url) {
      this.audiodec.set_property ("uri", url);
      //if (!this.audio_stream) this.pipeline.add (this.audiobin);
      //this.playbin.set_property ("audio-sink", this.fakeaudio);
      this.audio_stream = true;
    } else {
      //if (this.audio_stream) this.pipeline.remove (this.audiobin);
      //this.playbin.set_property ("audio-sink", this.audiosink);
      this.audio_stream = false;
    }
    this.pipeline.sync_state_with_parent ();
  },

  set_video: function (url) {
    print ("set video streams:\n" + url);
    if (url) {
      //if (!this.video_stream) this.pipeline.add (this.videobin);
      this.videodec.set_property ("uri", url);
      this.video_stream = true;
    } else {
      //if (this.video_stream) this.pipeline.remove (this.videobin);
      this.video_stream = false;
    }
    this.pipeline.sync_state_with_parent ();
  },

  preload: function () {
    this.pipeline.set_state (Gst.State.READY);
  },

  play: function () {
    this.pipeline.set_state (Gst.State.PLAYING);
  },

  pause: function () {
    this.pipeline.set_state (Gst.State.PAUSED);
  },

  stop: function () {
    this.pipeline.set_state (Gst.State.NULL);
  },

  seek: function (pos, accurate) {
    return false;
    /*if (!this.pipeline || this.seek_lock) return false;
    this.seek_lock = true;
    let flag = Gst.SeekFlags.FLUSH, res;
    if (accurate) flag |= Gst.SeekFlags.ACCURATE;
    this.pipeline.set_state (Gst.State.PAUSED);
    if (this.video_stream)  res = this.playbin.seek (1.0,
      Gst.Format.TIME, flag,
      Gst.SeekType.SET, pos * Gst.MSECOND,
      Gst.SeekType.NONE, 0
    );
    if (this.audio_stream) res = this.audiobin.seek (1.0,
      Gst.Format.TIME, flag,
      Gst.SeekType.SET, pos * Gst.MSECOND,
      Gst.SeekType.NONE, 0
    );
    this.pipeline.set_state (Gst.State.PLAYING);
    if (this.video_stream) this.playbin.sync_state_with_parent ();
    if (this.audio_stream) this.audiobin.sync_state_with_parent ();
    this.seek_lock = false;
    return res;*/
  },

  set_window: function (xid) {
    if (!xid) return;
    this.handler = xid;
    //this.videosink.expose ();
    //print ("XID: ", xid);
  },

  set_videosink: function (sink) {
    //this.videosink = sink;
    //this.playbin.set_property("video-sink", this.videosink);
    if (this.videosink) this.videobin.remove (this.videosink);
    this.videosink = sink;
    this.videobin.add (this.videosink);
  },

  get_videosink: function (name) {
    name = name || "cluttersink";
    if (!this.videosink) {
      this.videosink = Gst.ElementFactory.make (name, "videosink");
      this.videobin.add (this.videosink);
    }
    return this.videosink;
  },

  on_audio_pad: function (src, new_pad) {
    //let sink_pad = this.audiobin.get_static_pad ("sink");
    //print ("Received new pad \'%s\' from \'%s\'".format (new_pad.name, src.name));
    print ("Received new pad");

    /*if (sink_pad.is_linked ()) {
      debug (" Already linked audiobin. Ignoring.");
      return;
    }
    var new_pad_caps = new_pad.query_caps (null);
    var new_pad_struct = new_pad_caps.get_structure (0);
    var new_pad_type = new_pad_struct.get_name ();
    if (new_pad_type.indexOf ("audio/x-raw") == -1) {
      debug (new_pad_struct.get_name () + " It's not raw audio. Ignoring.");
      return;
    }
    ret = new_pad.link (sink_pad);
    if (ret != Gst.PadLinkReturn.OK) {
      error ("Type is '%s' but link failed.".format (new_pad_type));
    } else {
      debug ("Link succeeded (type \'%s\').".format (new_pad_type));
    }*/
  },

  on_bus_message: function (bus,msg,a,b,c) {
    //TODO Process messages
    if (GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
      print ("Seet overlay...", msg.type, this.handler);
      var overlay = msg.src;
      if (!overlay || !this.handler) return false;
      overlay.set_window_handle (this.handler);
    } else if (msg.type == Gst.MessageType.EOS) {
      this.emit ('state-changed', this.current_state, Gst.State.READY, 0);
      if (this.repeat) {
        this.seek (0, false);
      } else this.pipeline.set_state (Gst.State.READY);
    } else if (msg.type == Gst.MessageType.STATE_CHANGED) {
      let [oldstate, newstate, pending] = msg.parse_state_changed ();
      if (this.current_state == newstate) return true;
      this.current_state = newstate;
      this.emit ('state-changed', oldstate, newstate, pending);
    } else if (msg.type == Gst.MessageType.BUFFERING) {
      print ("BUFFERING", msg.parse_buffering ());
    } else if (msg.type == Gst.MessageType.ERROR) {
      let [err, d] = msg.parse_error ();
      print ("GST ERROR:", msg.src, err.message);
    } else print (msg.type);
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

const DOMAIN = "PlayerEngine";
function error (msg) {Logger.error (DOMAIN, msg)}
function debug (msg) {Logger.debug (DOMAIN, msg)}
function info (msg) {Logger.info (DOMAIN, msg)}
