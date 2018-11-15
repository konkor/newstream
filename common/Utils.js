/*
 * This is a part of NewStream package
 * Copyright (C) 2018 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;
const Lang = imports.lang;

const USER_AGENT = 'GNOME Shell - YouTubeSearchProvider - extension';

function fetch (url, agent, headers, callback) {
  agent = agent || USER_AGENT;
  if (!callback) return;

  let session = new Soup.SessionAsync({ user_agent: agent });
  Soup.Session.prototype.add_feature.call (session, new Soup.ProxyResolverDefault());
  let request = Soup.Message.new ("GET", url);
  if (headers) headers.forEach (h=>{
    request.request_headers.append (h[0], h[1]);
  });
  session.queue_message (request, (source, message) => {
    if (callback) {
      //callback (message.response_body.data.toString()?message.response_body.data:"", message.status_code);
      callback (message.response_body_data.get_data (), message.status_code);
    }
  });
}

function spawn_async (args, callback) {
  callback = callback || null;
  let r, pid;
  try {
    [r, pid] = GLib.spawn_async (null, args, null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
  } catch (e) {
    error (e.message);
    return;
  }
  GLib.child_watch_add (GLib.PRIORITY_DEFAULT, pid, (p, s, o) => {
    if (callback) callback (p, s, o);
  });
}

let ydl = "";

function fetch_formats (id, callback) {
  if (!callback) return;
  let data = {};

  if (!ydl) ydl = GLib.find_program_in_path ("youtube-dl");
  if (!ydl) return;
  let pipe = new SpawnPipe ([ydl, "--all-formats", "--dump-single-json", "https://www.youtube.com/watch?v=" + id], "/",
    (info, error) => {
    if (!error) data = JSON.parse (info);
    else print ("FORMATS ERROR:", error);
    callback (data);
  });
}

var SpawnPipe = new Lang.Class({
  Name: 'SpawnPipe',

  _init: function (args, dir, callback) {
    dir = dir || "/";
    let exit, pid, stdin_fd, stdout_fd, stderr_fd;
    this.error = "";
    this.stdout = [];
    this.dest = "";

    try {
      [exit, pid, stdin_fd, stdout_fd, stderr_fd] =
        GLib.spawn_async_with_pipes (dir,args,null,GLib.SpawnFlags.DO_NOT_REAP_CHILD,null);
      GLib.close (stdin_fd);
      let outchannel = GLib.IOChannel.unix_new (stdout_fd);
      GLib.io_add_watch (outchannel,100,GLib.IOCondition.IN | GLib.IOCondition.HUP, (channel, condition) => {
        return this.process_line (channel, condition, "stdout");
      });
      let errchannel = GLib.IOChannel.unix_new (stderr_fd);
      GLib.io_add_watch (errchannel,100,GLib.IOCondition.IN | GLib.IOCondition.HUP, (channel, condition) => {
        return this.process_line (channel, condition, "stderr");
      });
      let watch = GLib.child_watch_add (100, pid, Lang.bind (this, (pid, status, o) => {
        //print ("watch handler " + pid + ":" + status + ":" + o);
        GLib.source_remove (watch);
        GLib.spawn_close_pid (pid);
        if (callback) callback (this.stdout, this.error);
      }));
    } catch (e) {
      error (e);
    }
  },

  process_line: function (channel, condition, stream_name) {
    if (condition == GLib.IOCondition.HUP) {
      //debug (stream_name, ": has been closed");
      return false;
    }
    try {
      var [,line,] = channel.read_line (), i = -1;
      if (line) {
        //print (stream_name, line);
        if (stream_name == "stderr") {
          this.error = line;
        } else {
          this.stdout.push (line);
        }
      }
    } catch (e) {
      return false;
    }
    return true;
  }
});

function launch_uri (uri) {
  let app = Gio.AppInfo.get_default_for_uri_scheme ("https");
  if (!app || !uri) return;
  try {
    if (app) app.launch_uris ([uri], null);
  } catch (e) {
    print (e);
  }
}

function age (date) {
  let s = "just now";
  if (!date) return "";
  var d = new Date (Date.now () - date);
  //print (d);
  var y = d.getUTCFullYear() - 1970, m = d.getUTCMonth(),days = d.getUTCDate()-1;
  var h = d.getUTCHours(), min = d.getUTCMinutes(), sec = d.getUTCSeconds();
  if (y > 1) s = y + " years ago";
  else if (y > 0) s = "1 year ago";
  else if (m > 1) s = m + " months ago";
  else if (m > 0) s = "1 month ago";
  else if (days > 1) s = days + " days ago";
  else if (days > 0) s = "1 day ago";
  else if (h > 1) s = h + " hours ago";
  else if (h > 0) s = "1 hour ago";
  else if (min > 1) s = min + " minutes ago";
  else if (min > 0) s = "1 minute ago";

  return s;
}

function format_size (number) {
  let s = "0";
  if (!number) return s;

  if (number >= 1000000000) s = get_round (number, 1000000000) + "B";
  else if (number >= 1000000) s = get_round (number, 1000000) + "M";
  else if (number >= 1000) s = get_round (number, 1000) + "K";
  else s = number.toString();

  return s;
}

function format_size_long (number) {
  let s = "", n;
  if (!number) return "0";
  n = number.toString ().trim (); s = "";
  if (!n) return "0";

  for (let i = n.length - 1; i > -1; i -= 3) {
    var start = i - 2;
    if (start < 0) start = 0;
    s = n.substring (start, i + 1) + " " + s;
  }

  return s.trim ();
}
function get_round (number, base) {
  if (!base) return "0";
  var s = Math.round (number/base, 1).toString();
  if (s.length > 3)
    s = Math.round (number/base, 0).toString();
  return s;
}

function time_stamp (time) {
  time = time || 0;
  let h = 0, m = 0, s = 0;
  let t = parseInt (Math.round (time));
  if (!Number.isInteger (t)) t = 0;
  s = t % 60;
  t = parseInt (t / 60);
  m = t % 60;
  t = parseInt (t / 60);
  h = t % 60;

  if (h) return "%d:%02d:%02d".format (h,m,s);
  else return "%d:%02d".format (m,s);
}

let current_version = "";
let latest_version = "";
function check_install_ydl () {
  let path = GLib.build_filenamev ([get_app_data_dir (),"bin"]);
  if (!GLib.file_test (path, GLib.FileTest.EXISTS))
    GLib.mkdir_with_parents (path, 484);
  path = GLib.build_filenamev ([path,"youtube-dl"]);
  let file = Gio.File.new_for_path (path);
  if (!file.query_exists (null))
    return false;
  let info = file.query_info ("*", 0, null);
  if (!info.get_attribute_boolean (Gio.FILE_ATTRIBUTE_ACCESS_CAN_EXECUTE)) {
    info.set_attribute_boolean (Gio.FILE_ATTRIBUTE_ACCESS_CAN_EXECUTE, true);
    let cmd = GLib.find_program_in_path ("chmod");
    if (!cmd) return false;
    GLib.spawn_command_line_sync (cmd + " a+rx " + path);
    if (!info.get_attribute_boolean (Gio.FILE_ATTRIBUTE_ACCESS_CAN_EXECUTE))
      return false;
  }
  ydl = path;
  latest_version = current_version = get_info_string (ydl + " --version");

  return true;
}

function install_ydl (callback) {
  fetch ("https://yt-dl.org/downloads/latest/youtube-dl",
    "New Stream (GNU/Linux)", null, Lang.bind (this, (data, s) => {
      if ((s == 200) && data) {
        let file = Gio.File.new_for_path (get_app_data_dir () + "/bin/youtube-dl");
        file.replace_contents_bytes_async (
          data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null, (o, res) => {
            file.replace_contents_finish (res);
            check_install_ydl ();
            if (callback) callback ();
          }
        );
      }
      return false;
  }));
  return true;
}

function check_update_ydl (callback) {
  fetch ("https://rg3.github.io/youtube-dl/update/LATEST_VERSION",
    null, null, Lang.bind (this, (text, s) => {
      if ((s == 200) && text) {
        latest_version = text.toString().split("\n")[0];
      }
      if (latest_version != current_version) {
        install_ydl ();
        if (callback) callback ();
      }
      return false;
  }));
}


function get_app_data_dir () {
  let path = GLib.build_filenamev ([GLib.get_user_data_dir(),"newstream"]);
  if (!GLib.file_test (path, GLib.FileTest.EXISTS))
    GLib.mkdir_with_parents (path, 484);
  return path;
}

let cmd_out, info_out;
function get_info_string (cmd) {
    cmd_out = GLib.spawn_command_line_sync (cmd);
    if (cmd_out[0]) info_out = cmd_out[1].toString().split("\n")[0];
    if (info_out) return info_out;
    return "";
}
