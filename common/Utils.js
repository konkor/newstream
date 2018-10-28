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
        else print (error);
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
