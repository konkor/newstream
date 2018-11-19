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
const Lang = imports.lang;

var Format = imports.format;
String.prototype.format = Format.format;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const fetch = imports.common.Utils.fetch;

const ORDER = {
  0: "date",
  1: "rating",
  2: "title",
  3: "videoCount",
  4: "viewCount",
}
const TIME = {
  0: "last_24_hours",
  1: "last_7_days",
  2: "last_30_days",
  3: "last_1_year",
  4: "all_time"
}
const SAFESEARCH = {
  0: "moderate",
  1: "none",
  2: "strict"
}
const VIDEOCAPTION = {
  0: "any",
  1: "closedCaption",
  2: "none"
}
const VIDEODEFINITION = {
  0: "any",
  1: "high",
  2: "standard"
}
const VIDEODIMENSION = {
  0: "2d",
  1: "3d",
  2: "any"
}
const VIDEODURATION = {
  0: "any",
  1: "long",
  2: "medium",
  3: "short"
}
const VIDEOLICENSE = {
  0: "any",
  1: "creativeCommon",
  2: "youtube"
}
const VIDEOTYPE = {
  0: "any",
  1: "episode",
  2: "movie"
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3/';
const KEY = 'AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o';

var SearchProvider = new Lang.Class({
  Name: "SearchProvider",

  _init: function () {
    this._order = ORDER[0];
    this._time = TIME[4];
    this._safesearch = SAFESEARCH[0];
    this._videocaption = VIDEOCAPTION[0];
    this._videodefinition = VIDEODEFINITION[0];
    this._videodimension = VIDEODIMENSION[0]
    this._videoduration = VIDEODURATION[0];
    this._videolicense = VIDEOLICENSE[0];
    this._videotype = VIDEOTYPE[0];
    this._max_results = 24;
  },

  calculate_time: function (thetime) {
    let search_time_string = "";
    let publishedAfter = new Date();
    let publishedBefore = new Date();
    switch(thetime){
      case 'last_24_hours':
        publishedAfter.setDate(publishedBefore.getDate()-1);
        search_time_string = '&publishedAfter=%s&publishedBefore=%s'.format(
          publishedAfter.toISOString(),
          publishedBefore.toISOString()
        );
        break;
      case 'last_7_days':
        publishedAfter.setDate(publishedBefore.getDate()-7);
        search_time_string = '&publishedAfter=%s&publishedBefore=%s'.format(
          publishedAfter.toISOString(),
          publishedBefore.toISOString()
        );
        break;
      case 'last_30_days':
        publishedAfter.setDate(publishedBefore.getDate()-30);
        search_time_string = '&publishedAfter=%s&publishedBefore=%s'.format(
          publishedAfter.toISOString(),
          publishedBefore.toISOString()
        );
        break;
      case 'last_1_year':
        publishedAfter.setDate(publishedBefore.getDate()-365);
        search_time_string = '&publishedAfter=%s&publishedBefore=%s'.format(
          publishedAfter.toISOString(),
          publishedBefore.toISOString()
        );
        break;
    }
    return search_time_string;
  },

  _build_query_url: function (query) {
    let url = '%ssearch?part=snippet&q=%s&order=%s&maxResults=%s&type=video&safeSearch=%s&videoCaption=%s&videoDefinition=%s&videoDimension=%s&videoDuration=%s&videoLicense=%s&videoType=%s%s&key=%s'.format (
      BASE_URL,
      encodeURIComponent (query),
      this._order,
      this._max_results,
      this._safesearch,
      this._videocaption,
      this._videodefinition,
      this._videodimension,
      this._videoduration,
      this._videolicense,
      this._videotype,
      this.calculate_time (this._time), KEY
    );
    return url;
  },

  get: function (query, callback) {
    let url = this._build_query_url (query);
    fetch (url, null, null, callback);
    return url;
  },

  get_page: function (query, token, etag, callback) {
    let url = query;
    if (token) url += "&pageToken=" + token;
    //if (etag) url += "&etag=" + etag;
    fetch (url, null, null, callback);
  },

  get_info: function (id, callback) {
    if (!id) return;
    let url = '%svideos?part=snippet,contentDetails,statistics&id=%s&key=%s'.format (
      BASE_URL, id, KEY
    );
    //print (url);
    fetch (url, null, null, callback);
  },

  get_channel: function (id, callback) {
    if (!id) return "";
    let url = '%ssearch?part=snippet&order=date&maxResults=%s&type=video&channelId=%s&key=%s'.format (
      BASE_URL, this._max_results, id, KEY
    );
    fetch (url, null, null, callback);
    return url;
  },

  get_channel_info: function (id, callback) {
    if (!id) return;
    let url = '%schannels?part=snippet,statistics&id=%s&key=%s'.format (
      BASE_URL, id, KEY
    );
    fetch (url, null, null, callback);
  },

  get_hot: function (callback) {
    let url = '%ssearch?part=snippet&order=viewCount&maxResults=%s&type=video%s&key=%s'.format (
      BASE_URL, this._max_results, this.calculate_time ("last_7_days"), KEY
    );
    fetch (url, null, null, callback);
    return url;
  },

  get_day: function (callback) {
    let url = '%ssearch?part=snippet&order=date&maxResults=%s&type=video%s&key=%s'.format (
      BASE_URL, this._max_results, this.calculate_time ("last_24_hours"), KEY
    );
    fetch (url, null, null, callback);
    return url;
  },

  get_hit: function (callback) {
    let url = '%ssearch?part=snippet&order=viewCount&maxResults=%s&type=video&key=%s'.format (
      BASE_URL, this._max_results, KEY
    );
    fetch (url, null, null, callback);
    return url;
  },

  get_relaited: function (id, callback) {
    let url = '%ssearch?part=snippet&order=viewCount&maxResults=%s&type=video&relatedToVideoId=%s&key=%s'.format (
      BASE_URL, 12, id, KEY
    );
    fetch (url, null, null, callback);
    return url;
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
