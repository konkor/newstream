/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gst = imports.gi.Gst;
const GstVideo = imports.gi.GstVideo;
const Lang = imports.lang;

var PlayerEngine = new Lang.Class({
    Name: "PlayerEngine",

    _init: function () {
        Gst.init(null, 0);
        this.playbin = Gst.ElementFactory.make("playbin", null);
        this.audiosink = Gst.ElementFactory.make("pulsesink", "audiosink");
        this.playbin.set_property("audio-sink", this.audiosink);
        this.videosink = Gst.ElementFactory.make("glimagesink", "videosink");
        this.playbin.set_property("video-sink", this.videosink);
        
        this.bus = this.playbin.get_bus();
        this.bus.add_signal_watch();
        this.bus.connect ("message", Lang.bind (this, (bus, msg) => {
            if (msg) this.on_bus_message (msg);
        }));
    },

    open: function (uri) {
        this.playbin.set_state(Gst.State.NULL);
        this.playbin.set_property ("uri", uri);
        this.playbin.set_state(Gst.State.PLAYING);
    },

    play: function () {
        this.playbin.set_state(Gst.State.PLAYING);
    },

    pause: function () {
        this.playbin.set_state(Gst.State.PAUSED);
    },

    stop: function () {
        this.playbin.set_state(Gst.State.NULL);
    },

    set_window: function (xid) {
        if (!xid) return;
        this.handler = xid;
        this.videosink.expose();
        print ("XID: ", xid);
    },

    on_bus_message: function (msg) {
        //TODO Process messages
        //print (msg.type);
        if(GstVideo.is_video_overlay_prepare_window_handle_message (msg)) {
            print ("Seet overlay...", msg.type, this.handler);
			var overlay = msg.src;
			if (!overlay || !this.handler) return false;
			overlay.set_window_handle (this.handler);
		}
		return true;
    }
});
