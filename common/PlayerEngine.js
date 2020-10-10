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
    'buffering': {
    flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
    param_types: [GObject.TYPE_INT]},
  },

  _init: function () {
    Gst.init(null); //["GST_GL_PLATFORM=\"egl\""]
    this.audio_state = 0;
    this.video_state = 0;
    this.audio_buffer = 0;
    this.video_buffer = 0;
    this.video_stream = false;
    this.audio_stream = false;
    this.play_on_ready = false;

    //Fake outputs
    this.fakeaudio = Gst.ElementFactory.make ("fakesink", "fakeaudio");
    this.fakevideo = Gst.ElementFactory.make ("fakesink", "fakevideo");

    this.videobin = new Gst.Pipeline ({name:"xstream_video"});
    this.audiobin = new Gst.Pipeline ({name:"xstream_audio"});

    //Main Video(audio, subtitles) stream
    //this.playbin = Gst.ElementFactory.make("playbin", "mainbin");
    this.audiosink = Gst.ElementFactory.make ("pulsesink", "audiosink");
    if (!this.audiosink)
      this.audiosink = Gst.ElementFactory.make ("alsasink", "audiosink");

    //Audio stream
    //this.audiobin = Gst.ElementFactory.make ("playbin", "audiobin");
    //this.audiosink2 = Gst.ElementFactory.make ("pulsesink", "audiosink2");
    //this.audiobin = Gst.parse_launch ("uridecodebin name=\"audiouri\" ! audioconvert ! audio/x-raw ! pulsesink");
    this.audiodec = Gst.ElementFactory.make ("playbin", "audiobin");
    this.audiodec.set_property ("flags", 2);
    this.audiodec.set_property ("video-sink", this.fakevideo);
    this.audiodec.set_property ("audio-sink", this.audiosink);
    this.audiobin.add (this.audiodec);

    this.videosink = Gst.ElementFactory.make ("cluttersink", "videosink");
    this.videodec = Gst.ElementFactory.make ("playbin", "videobin");
    this.videodec.set_property ("video-sink", this.videosink);
    this.videodec.set_property ("audio-sink", this.fakeaudio);
    this.videodec.set_property ("flags", 1);
    this.videobin.add (this.videodec);


    ////this.pipeline.add (this.playbin);
    ////this.audiobin.set_property ("video-sink", this.fakevideo);
    //this.audiobin.set_property ("flags", 2);
    //this.audiobin.set_property ("audio-sink", this.audiosink2);

    this.current_volume = 0;
    this.repeat = false;

    this.bus = this.audiobin.get_bus ();
    this.bus.add_signal_watch ();
    this.bus.connect ("message", this.on_bus_message_audio.bind (this));

    this.bus1 = this.videobin.get_bus ();
    this.bus1.add_signal_watch ();
    this.bus1.connect ("message", this.on_bus_message_video.bind (this));

    timer = GLib.timeout_add (0, 1000, this.on_timer.bind (this));
  },

  get state () {
    if (!this.audio_stream) return this.video_state;
    if (!this.video_stream) return this.audio_state;
    if (this.audio_state <= this.video_state) return this.audio_state;
    return this.video_state;
  },

  get position () {
    let pos, pos2, res, pipe = this.video_stream ? this.videobin : this.audiobin;
    [res, pos] = pipe.query_position (Gst.Format.TIME);
    if (!res) pos = -1;
    else {
      if (this.video_stream && this.audio_stream) {
        [res, pos2] = this.audiobin.query_position (Gst.Format.TIME);
        //this.seek (pos, true);
        //print ("audio:", pos2, "video:", pos, "delta:", pos2 - pos);
      }
      pos /= Gst.MSECOND;
    }

    return pos;
  },

  get duration () {
    let dur, res, pipe = this.video_stream ? this.videobin : this.audiobin;
    [res, dur] = pipe.query_duration (Gst.Format.TIME);
    if (!res) dur = -1;
    else dur /= Gst.MSECOND;
    return dur;
  },

  get volume () {
    if (!this.current_volume && this.audiodec) this.current_volume = this.audiodec.get_volume (1);
    return this.current_volume;
  },

  set volume (val) {
    if (!this.audiobin) return;
    val = val || 0;
    if (val > 1) val = 1.0;
    this.audiodec.set_volume (1, val);
    //this.playbin.set_volume (1, val);
    this.current_volume = val;
  },

  open: function (video_format, audio_format) {
    //video_url = "http://192.168.1.2:8088/0/test.mp4";audio_url = "http://192.168.1.2:8088/0/test.mp4";
    this.stop ();
    info ("open video/audio streams:\n" + JSON.stringify(video_format) + "\n\n" + JSON.stringify(audio_format));
    if (!video_format && !audio_format) return;
    if (video_format) this.set_video (video_format.fragment_base_url || video_format.url, true);
    else this.set_video (null, true);
    if (audio_format) this.set_audio (audio_format.fragment_base_url || audio_format.url, true);
    else this.set_audio (null, true);
    //this.play ();
    this.seek (0, false);
  },

  set_audio: function (url, noplay) {
    debug ("set audio streams:\n" + url);
    if (url == this.audio_url) return;
    this.stop ();
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
    //this.audiobin.sync_state_with_parent ();
    //this.play (true);
    this.preload ();
    if (!noplay) this.seek (0, false);
  },

  set_video: function (url, noplay) {
    debug ("set video streams:\n" + url);
    this.stop ();
    if (url) {
      //if (!this.video_stream) this.pipeline.add (this.videobin);
      this.videodec.set_property ("uri", url);
      this.video_stream = true;
    } else {
      //if (this.video_stream) this.pipeline.remove (this.videobin);
      this.video_stream = false;
    }
    //this.videobin.sync_state_with_parent ();
    //this.play (true);
    this.preload ();
    if (!noplay) this.seek (0, false);
  },

  preload: function () {
    if (this.audio_stream) this.audiobin.set_state (Gst.State.READY);
    if (this.video_stream) this.videobin.set_state (Gst.State.READY);
  },

  play: function (on_ready) {
    if (on_ready && this.audio_stream && this.video_stream) {
      this.play_on_ready = true;
      this.pause ();
      return;
    }
    if (this.video_stream) this.videobin.set_state (Gst.State.PLAYING);
    if (this.audio_stream) this.audiobin.set_state (Gst.State.PLAYING);
    this.play_on_ready = false;
  },

  pause: function () {
    if (this.audio_stream) this.audiobin.set_state (Gst.State.PAUSED);
    if (this.video_stream) this.videobin.set_state (Gst.State.PAUSED);
  },

  stop: function () {
    this.seek (0, true);
    if (this.audio_stream) this.audiobin.set_state (Gst.State.NULL);
    if (this.video_stream) this.videobin.set_state (Gst.State.NULL);
  },

  seek: function (pos, accurate) {
    if (!this.audiobin || this.seek_lock) return false;
    this.seek_lock = true;
    let flag = Gst.SeekFlags.FLUSH, res;
    if (accurate) flag |= Gst.SeekFlags.ACCURATE;
    this.pause ();
    if (this.video_stream)  res = this.videobin.seek (1.0,
      Gst.Format.TIME, flag,
      Gst.SeekType.SET, pos * Gst.MSECOND,
      Gst.SeekType.NONE, 0
    );
    if (this.audio_stream) res = this.audiobin.seek (1.0,
      Gst.Format.TIME, flag,
      Gst.SeekType.SET, pos * Gst.MSECOND,
      Gst.SeekType.NONE, 0
    );
    this.play (true);
    if (this.video_stream) this.videodec.sync_state_with_parent ();
    if (this.audio_stream) this.audiodec.sync_state_with_parent ();
    this.seek_lock = false;
    return res;
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

  on_bus_message_video: function (bus, msg) {
    if (GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
      debug ("Seet overlay... " + this.handler);
      var overlay = msg.src;
      if (!overlay || !this.handler) return false;
      overlay.set_window_handle (this.handler);
    } else if (msg.type == Gst.MessageType.EOS) {
      this.emit ('state-changed', this.state, Gst.State.READY, 0);
      if (this.repeat) {
        this.seek (0, false);
      } else this.videobin.set_state (Gst.State.READY);
    } else if (msg.type == Gst.MessageType.STATE_CHANGED) {
      let [oldstate, newstate, pending] = msg.parse_state_changed ();
      if (this.video_state == newstate) return true;
      this.video_state = newstate;
      debug ("video state: " + newstate);
      this.emit ('state-changed', oldstate, newstate, pending);
    } else if (msg.type == Gst.MessageType.BUFFERING) {
      this.video_buffer = msg.parse_buffering ();
      this.emit ("buffering", this.video_buffer);
      if (this.video_buffer % 10 == 0) debug ("BUFFERING VIDEO: " + this.video_buffer);
      if (this.play_on_ready && this.video_buffer == this.audio_buffer && this.video_buffer == 100) {
        this.play ();
      }
    } else if (msg.type == Gst.MessageType.TAG) {
      //TODO: video tags
    } else if (msg.type == Gst.MessageType.ERROR) {
      let [err, d] = msg.parse_error ();
      error ("GST VIDEO ERROR: " + msg.src + "\n" + err.message);
    } else debug ("GST message: " + msg.type);
    return true;
  },

  on_bus_message_audio: function (bus, msg) {
    //TODO Process messages
    if (msg.type == Gst.MessageType.EOS) {
      this.emit ('state-changed', this.state, Gst.State.READY, 0);
      if (this.repeat) {
        this.seek (0, false);
      } else this.audiobin.set_state (Gst.State.READY);
    } else if (msg.type == Gst.MessageType.STATE_CHANGED) {
      let [oldstate, newstate, pending] = msg.parse_state_changed ();
      if (this.audio_state == newstate) return true;
      this.audio_state = newstate;
      debug ("audio state: " + newstate);
      this.emit ('state-changed', oldstate, newstate, pending);
    } else if (msg.type == Gst.MessageType.BUFFERING) {
      this.audio_buffer = msg.parse_buffering ();
      this.emit ("buffering", this.audio_buffer);
      if (this.audio_buffer % 10 == 0) debug ("BUFFERING AUDIO: " + this.audio_buffer);
      if (this.play_on_ready && this.video_buffer == this.audio_buffer && this.video_buffer == 100) {
        this.play ();
      }
    } else if (msg.type == Gst.MessageType.TAG) {
      //TODO: audio tags
    } else if (msg.type == Gst.MessageType.ERROR) {
      let [err, d] = msg.parse_error ();
      error ("GST AUDIO ERROR: " + msg.src + "\n" + err.message);
    } else debug ("GST message: " + msg.type);
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
