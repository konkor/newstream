/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Gettext = imports.gettext.domain ("io.github.konkor.newstream");
const _ = Gettext.gettext;

//const ResultView = imports.common.ResultView;

const video_format = ["vp9","avc","av01"];
const video_quality = [144,240,360,480,720,1080,1440,2160,4320];

var Preferences = new Lang.Class({
  Name: "Preferences",
  Extends: Gtk.ScrolledWindow,

  _init: function (settings) {
    this.parent ();
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.shadow_type = Gtk.ShadowType.NONE;
    this.settings = settings;

    this.build ();
  },

  build: function () {
    let label, hbox, box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:16});
    //box.margin_start = box.margin_end = 48;
    hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin:16});
    this.add (hbox);
    hbox.pack_start (new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL}), true, true, 0);
    hbox.pack_start (box, true, true, 0);
    hbox.pack_start (new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL}), true, true, 0);

    label = new Gtk.Label ({
      label: "<big><b>" + _("General") + "</b></big>",use_markup:true,xalign:0,margin_top:12});
    box.add (label);

    box.add (new Gtk.Label ({label: "YouTube Data API Key v3", use_markup:true, xalign:0, margin_top:24}));
    this.warn = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:16});
    box.add (this.warn);
    this.warn.add (new Gtk.Label ({label: "<b>" + _("Please, Create and use your own development API key!") + "</b>", use_markup:true, xalign:0, margin_top:12}));
    this.warn.add (new Gtk.Label ({
      label: _("It is free with the limitation 10 000 quotas per day. Otherwise you won\'t be able to use a lot of searching on the demo key.") +
      "\n<a href=\"https://developers.google.com/youtube/v3/getting-started\" title=\"Getting Started\">" + _("Find more how to create API key...")+"</a>",
      use_markup:true, wrap:true, xalign:0, margin_top:12
    }));
    this.entry = new Gtk.Entry ();
    this.entry.placeholder_text = "YouTube API Key";
    this.entry.tooltip_text = _("Enter YouTube API Key v3 here.");
    box.pack_start (this.entry, false, false, 12);
    this.entry.connect ("changed", (o) => {
      var s = o.text.trim();
      this.warn.visible = !s;
      this.settings.api_key = s;
    });
    this.entry.connect ("focus-in-event", () => {
      let app = Gio.Application.get_default();
      app.disable_global_actions ();
    });
    this.entry.connect ("focus-out-event", () => {
      let app = Gio.Application.get_default();
      app.enable_global_actions ();
    });

    box.add (new Gtk.Label ({label: "<big><b>" + _("Video Preferences") + "</b></big>", use_markup:true, xalign:0, margin_top:32}));

    hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin_top:24});
    box.add (hbox);
    hbox.add (new Gtk.Label ({label: _("Preferred Video Quality")}));
    this.combo = new Gtk.ComboBoxText ();
    var id = 0, i = 0;
    video_quality.forEach (s => {
      this.combo.append_text (s.toString()+ "p");
      if (s == this.settings.video_quality) id = i;
      i++;
    });
    this.combo.active = id;
    hbox.pack_end (this.combo, false, false, 0);
    this.combo.connect ("changed", (o) => {
      this.settings.video_quality = video_quality[o.active];
    });

    hbox = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL, margin_top:24});
    box.add (hbox);
    hbox.add (new Gtk.Label ({label: _("Preferred Video Format")}));
    this.combo_format = new Gtk.ComboBoxText ();
    id = 0, i = 0;
    video_format.forEach (s => {
      this.combo_format.append_text (s);
      if (s == this.settings.video_format) id = i;
      i++;
    });
    this.combo_format.active = id;
    hbox.pack_end (this.combo_format, false, false, 0);
    this.combo_format.connect ("changed", (o) => {
      this.settings.video_format = video_format[o.active];
    });

  },

  update: function () {
    //TODO: update settings values
    this.entry.text = this.settings.api_key;
  }
 });
