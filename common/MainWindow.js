/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);

const Provider = imports.common.SearchProvider;
const ResultView = imports.common.ResultView;
const ItemView = imports.common.ItemView;

let theme_gui = APPDIR + "/data/themes/default/gtk.css";
let cssp = null;

var MainWindow = new Lang.Class ({
    Name: "MainWindow",
    Extends: Gtk.Window,

    _init: function (args) {
        this.parent();
        this.set_icon_name ("io.github.konkor.newstream");
        if (!this.icon) try {
            this.icon = Gtk.Image.new_from_file (APPDIR + "/data/icons/io.github.konkor.newstream.svg").pixbuf;
        } catch (e) {
            error (e.message);
        }
        this.provider = new Provider.SearchProvider ();
        this.build ();
    },

    build: function() {
        this.set_default_size (512, 480);
        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
        cssp = get_css_provider ();
        if (cssp) {
            Gtk.StyleContext.add_provider_for_screen (
                this.get_screen(), cssp, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }
        this.hb = new Gtk.HeaderBar ();
        this.hb.set_show_close_button (true);
        this.hb.get_style_context ().add_class ("hb");
        this.set_titlebar (this.hb);

        this.home = new Gtk.Button ({always_show_image: true, tooltip_text:"Home"});
        this.home.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/io.github.konkor.newstream.svg");
        this.home.get_style_context ().add_class ("hb-button");
        this.home.margin = 6;
        this.hb.add (this.home);
        this.section = new Gtk.Label ({label:"New Stream"});
        this.hb.add (this.section);

        let mmenu = new Gtk.Menu ();
		let mii = new Gtk.MenuItem ({label:"About"});
		mmenu.add (mii);
		mmenu.show_all ();

        this.menu_button = new Gtk.MenuButton ({tooltip_text:"Application Menu"});
        this.menu_button.image = Gtk.Image.new_from_icon_name ("open-menu-symbolic",Gtk.IconSize.LARGE_TOOLBAR);
        this.menu_button.get_style_context ().add_class ("hb-button");
        //this.menu_button.menu_model = mmenu;
		this.menu_button.set_popup (mmenu);
        this.menu_button.margin = 6;
        this.hb.pack_end (this.menu_button);

        let box = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL});
        this.add (box);

        this.searchbar = new Searchbar ();
        box.add (this.searchbar);

        this.topbar = new Topbar ();
        box.add (this.topbar);
        
        this.stack = new Gtk.Stack ();
        this.stack.transition_type = Gtk.StackTransitionType.SLIDE_UP_DOWN;
        box.pack_start (this.stack, true, true, 0);
        
        this.hotview = new ResultView.ResultView (this);
        this.stack.add_named (this.hotview, "0");

        this.newview = new ResultView.ResultView (this);
        this.stack.add_named (this.newview, "1");

        this.hitview = new ResultView.ResultView (this);
        this.stack.add_named (this.hitview, "2");

        this.searchview = new ResultView.ResultView (this);
        this.stack.add_named (this.searchview, "search");

        this.itemview = new ItemView.ItemView (this);
        this.stack.add_named (this.itemview, "item");

        this.searchbar.search_button.connect ('clicked', Lang.bind (this, ()=>{
            if (!this.searchbar.entry.text) return;
            this.searchview.query (this.searchbar.entry.text);
        }));
        this.searchbar.entry.connect ('activate', Lang.bind (this, ()=>{
            if (!this.searchbar.entry.text) return;
            this.searchview.query (this.searchbar.entry.text);
        }));
        this.hotview.get_hot ();
        this.topbar.connect ('stack_update', Lang.bind (this, this.on_stack_update));
        this.searchview.connect ('ready', Lang.bind (this, ()=>{this.stack.visible_child_name = "search";}));
    },

    on_stack_update: function (o, index) {
        this.stack.visible_child_name = index.toString ();
        if (index == 0)
            this.hotview.get_hot ();
        else if (index == 1)
            this.newview.get_day ();
        else
            this.hitview.get_hit ();
    }
    
});

var Searchbar = new Lang.Class({
    Name: "Searchbar",
    Extends: Gtk.Box,

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
        this.get_style_context ().add_class ("search-bar");

        let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
        box.margin_bottom = 8;
        this.pack_start (box, true, true, 0);

        let space = new Gtk.Box ();
        box.pack_start (space, true, false, 0);

        this.search_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Search"});
        this.search_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/folder-saved-search-symbolic.svg");
        this.search_button.get_style_context ().add_class ("hb-button");
        box.pack_start (this.search_button, false, false, 0);
        
        this.entry = new Gtk.Entry ();
        this.entry.get_style_context ().add_class ("search-entry");
        this.entry.input_hints = Gtk.InputHints.SPELLCHECK | Gtk.InputHints.WORD_COMPLETION;
        this.entry.placeholder_text = "Search";
        box.pack_start (this.entry, true, true, 0);

        this.clear_button = new Gtk.Button ({always_show_image: true, tooltip_text:"Clear"});
        this.clear_button.image = Gtk.Image.new_from_file (APPDIR + "/data/icons/window-close-symbolic.svg");
        this.clear_button.get_style_context ().add_class ("hb-button");
        box.pack_start (this.clear_button, false, false, 0);

        space = new Gtk.Box ();
        box.pack_start (space, true, false, 0);
        
        this.clear_button.connect ('clicked', Lang.bind (this, ()=>{
            this.entry.text = "";
        }));
        this.entry.connect ('key_press_event', Lang.bind (this, (o, e)=>{
            var [,key] = e.get_keyval ();
            if (key == Gdk.KEY_Escape) this.entry.text = "";
        }));
    }
});

var Topbar = new Lang.Class({
    Name: "Topbar",
    Extends: Gtk.Box,
    Signals: {
        'stack_update': {
        flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED,
        param_types: [GObject.TYPE_INT]},
    },

    _init: function () {
        this.parent ({orientation:Gtk.Orientation.HORIZONTAL});
        this.get_style_context ().add_class ("sb");
        this.buttons = [];

        this.add_button ("Hot", "Trending Videos");
        this.add_button ("24h", "Latest Videos");
        this.add_button ("Hit", "Hit Videos");

        this.current = 0;
    },

    add_button: function (label, tooltip) {
        let btn = new Gtk.ToggleButton ({label:label, tooltip_text:tooltip});
        btn.get_style_context ().add_class ("sb-button");
        btn.index = this.buttons.length;
        if (btn.index == 0) btn.active = true;
        this.pack_start (btn, true, true, 0);
        this.buttons.push (btn);
        btn.connect ('toggled', Lang.bind (this, this.on_toggle));
    },

    on_toggle: function (o) {
        if (this.toggle_lock) return;
        if (o.index == this.current) {
            if (!o.active) o.active = true;
            return;
        }
        this.toggle_lock = true;
        this.buttons[this.current].active = false;
        this.current = o.index;
        this.emit ('stack_update', o.index);
        this.toggle_lock = false;
    }
});

function get_css_provider () {
    let cssp = new Gtk.CssProvider ();
    let css_file = Gio.File.new_for_path (theme_gui);
    try {
        cssp.load_from_file (css_file);
    } catch (e) {
        print (e);
        cssp = null;
    }
    return cssp;
}

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
