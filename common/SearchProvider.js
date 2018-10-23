/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Gio = imports.gi.Gio;
const Lang = imports.lang;

var Format = imports.format;
String.prototype.format = Format.format;

const APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift(APPDIR);
const fetch = imports.common.Utils.fetch;

//https://gdata.youtube.com/feeds/api/videos?q=%s&orderby=%s&start-index=%s&max-results=%s&alt=json&v=2
//www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&q=atareao&type=video&videoDefinition=high&key=AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

const ORDER = { //order
    0: "date", // Entries are ordered by their relevance to a search query. This is the default setting for video search results feeds.
    1: "rating", // Entries are returned in reverse chronological order. This is the default value for video feeds other than search results feeds.
    2: "title", // Entries are ordered from most views to least views.
    3: "videoCount", // Entries are ordered from highest rating to lowest rating.
    4: "viewCount", // Entries are ordered from highest rating to lowest rating.
}
const TIME = {
    0: "last_24_hours", // 1 day
    1: "last_7_days", // 7 days
    2: "last_30_days", // 1 month
    3: "last_1_year", // 1 month
    4: "all_time"
}
const SAFESEARCH = { //safeSearch
    0: "moderate",
    1: "none",
    2: "strict"
}
const VIDEOCAPTION = { //videoCaption
    0: "any",
    1: "closedCaption",
    2: "none"
}
const VIDEODEFINITION = { //videoDefinition
    0: "any",
    1: "high",
    2: "standard"
}
const VIDEODIMENSION = { //videoDimension
    0: "2d",
    1: "3d",
    2: "any"
}
const VIDEODURATION = { //videoDuration
    0: "any", // Only include videos that are less than four minutes long.
    1: "long", // Only include videos that are between four and 20 minutes long (inclusive).
    2: "medium", // Only include videos longer than 20 minutes.
    3: "short"
}
const VIDEOLICENSE = { //videoLicense
    0: "any",
    1: "creativeCommon",
    2: "youtube"
}
const VIDEOTYPE = { //videoType
    0: "any",
    1: "episode",
    2: "movie"
}

var SearchProvider = new Lang.Class({
    Name: "SearchProvider",

    _init: function () {
        this._base_url = BASE_URL;
        this._order = ORDER[0];
        this._time = TIME[4];
        this._safesearch = SAFESEARCH[0];
        this._videocaption = VIDEOCAPTION[0];
        this._videodefinition = VIDEODEFINITION[0];
        this._videodimension = VIDEODIMENSION[0]
        this._videoduration = VIDEODURATION[0];
        this._videolicense = VIDEOLICENSE[0];
        this._videotype = VIDEOTYPE[0];
        this._max_results = 10;
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
        let url = '%s?part=snippet&q=%s&order=%s&maxResults=%s&type=video&safeSearch=%s&videoCaption=%s&videoDefinition=%s&videoDimension=%s&videoDuration=%s&videoLicense=%s&videoType=%s%s&key=AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o'.format (
            this._base_url,
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
            this.calculate_time (this._time)
        );
        return url;
    },

    get: function (query, callback) {
        let url = this._build_query_url (query);
        fetch (url, null, null, callback);
    },

    get_hot: function (callback) {
        let url = '%s?part=snippet&order=viewCount&maxResults=%s&type=video%s&key=AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o'.format (
            this._base_url,
            this._max_results,
            this.calculate_time ("last_7_days")
        );
        fetch (url, null, null, callback);
    },

    get_day: function (callback) {
        let url = '%s?part=snippet&order=date&maxResults=%s&type=video%s&key=AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o'.format (
            this._base_url,
            this._max_results,
            this.calculate_time ("last_24_hours")
        );
        fetch (url, null, null, callback);
    },

    get_hit: function (callback) {
        let url = '%s?part=snippet&order=viewCount&maxResults=%s&type=video&key=AIzaSyASv1z2gERCOR7OmJnWUtXImlQO0hI9m7o'.format (
            this._base_url,
            this._max_results
        );
        fetch (url, null, null, callback);
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
