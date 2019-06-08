/*
 * This is a part of NewStream package
 * Copyright (C) 2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

var SideMenu = new Lang.Class({
  Name: "SideMenu",
  Extends: Gtk.ScrolledWindow,

  _init: function () {
    this.parent ();
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.shadow_type = Gtk.ShadowType.NONE;

    this.submenus = [];

    this.content = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
    this.content.get_style_context ().add_class ("side-menu");
    this.add (this.content);
    this.propagate_natural_height = true;
  },

  add_item: function (item) {
    this.content.add (item);
  },

  add_submenu: function (item) {
    this.content.add (item);
    item.id = this.submenus.length;
    this.submenus.push (item);
    item.connect ('activate', this.on_submenu_activate.bind (this));
  },

  on_submenu_activate: function (item) {
    if (item && item.button.active) this.submenus.forEach ( p => {
      if (p.id != item.id) p.expanded = false;
    });
    let h = this.content.get_preferred_height ()[0];
    let max = Gio.Application.get_default ().window.window.get_height () - 96;
    if (h > max) h = max;
    //this.set_size_request (128, h);
    this.height_request = h;
  }
});

var SideSubmenu = new Lang.Class({
  Name: "SideSubmenu",
  Extends: Gtk.Box,
  Signals: {
    'activate': {},
  },

  _init: function (text, info, tooltip) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:0, spacing:0});
    this.id = 0;

    this.info = new InfoLabel ({no_show_all:false});
    this.info.label.set_text (text);
    this.info.info.set_text (info);
    this.info.info.xalign = 1;
    this.button = new Gtk.ToggleButton ({tooltip_text:tooltip, xalign:0});
    this.button.get_style_context ().add_class ("sidesubmenu");
    this.button.set_relief (Gtk.ReliefStyle.NONE);
    this.info.info.get_style_context ().add_class ("infolabel");
    this.button.add (this.info);
    this.add (this.button);

    this.section = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:0, spacing:0});
    this.section.margin_top = this.section.margin_bottom = 6;
    this.section.no_show_all = true;
    this.section.get_style_context ().add_class ("sidesection");
    this.add (this.section);

    this.button.connect ('toggled', this.on_toggle.bind (this));
  },

  on_toggle: function (o) {
    this.section.visible = o.active;
    this.emit ('activate');
  },

  get expanded () { return this.button.active; },
  set expanded (val) { this.button.active = val; },

  get label () { return this.info.label.label; },
  set label (val) {
    val = val || "";
    this.info.label.set_text (val); //"\u26A1 " + text;
  },

  add_item: function (item) {
    this.section.add (item);
    item.connect ("clicked", () => {this.expanded = false;});
  },

  remove_all: function () {
    this.section.get_children().forEach (p => {p.destroy ()});
  }
});

var SideItem = new Lang.Class({
  Name: "SideItem",
  Extends: Gtk.Button,

  _init: function (text, tooltip, info) {
    tooltip = tooltip || "";
    info = info || "";
    this.parent ({tooltip_text:tooltip, xalign:0});
    this.info = new InfoLabel ({no_show_all:false});
    this.info.label.set_text (text);
    this.info.info.set_text (info);
    this.info.info.xalign = 1;
    this.info.info.get_style_context ().add_class ("infolabel");
    this.add (this.info);
    this.get_style_context ().add_class ("sideitem");
    this.set_relief (Gtk.ReliefStyle.NONE);
    this.show_all ();
  }
});

var InfoLabel = new Lang.Class({
  Name: "InfoLabel",
  Extends: Gtk.Box,

  _init: function (props={}) {
    props.orientation = props.orientation || Gtk.Orientation.HORIZONTAL;
    this.parent (props);

    this.label = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.add (this.label);

    this.info = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.pack_start (this.info, true, true, 8);
    this.label.connect ("notify::label", this.on_label.bind (this));
    this.info.connect ("notify::label", this.on_label.bind (this));
  },

  on_label: function (o) {
    this.visible = o.visible = !!o.label;
  },

  update: function (info) {
    info = info || "";
    if (this.info.label != info) this.info.set_text (info);
  }
});
