/*
 * This is a part of NewStream package
 * Copyright (C) 2018-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const Utils = imports.common.Utils;
const BookmarkView = imports.common.BookmarkView;

const IPP = 20; //items per page

var HistoryView = new Lang.Class({
  Name: "HistoryView",
  Extends: BookmarkView.BookmarkView,

  _init: function (parent) {
    this.parent (parent);

    this.date = "";
    this.date_options = {  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  },

  query: function (page) {
    page = page || 0;
    //this.url = "view_history";
    if (page*IPP >= this.settings.view_history.length) return;
    let history = this.settings.view_history.slice (page*IPP, (page+1)*IPP);
    //print (page*IPP, (page+1)*IPP,history.length,this.settings.view_history);
    if (!history.length) return;
    if (page) this.pager.prev.token = (page - 1).toString ();
    else this.pager.prev.token = "";
    if ((this.settings.view_history.length - (page+1)*IPP) > 0) this.pager.next.token = (page + 1).toString ();
    else this.pager.next.token = "";
    this.pager.toggle ();
    this.clear_all ();
    history.forEach (p => {
      let item = new BookmarkView.BookmarkViewItem (this.settings.get_view_history_item (p));
      item.show_details ();
      var d = new Date (item.details.data.local.last).toLocaleDateString ("lookup", this.date_options);
      if (this.date != d) {
        this.add_date (d);
      }
      this.results.add (item);
    });
    if (this.scroll) this.scroll.vadjustment.value = 0;
  },

  add_date: function (date) {
    this.date = date;
    let label = new Gtk.Label({label:this.date, xalign:0.0, margin:6, sensitive:true});
    label.show_all ();
    this.results.add (label);
  }
});
