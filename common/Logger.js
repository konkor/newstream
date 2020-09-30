/*
 * This is a part of NewStream package
 * Copyright (C) 2018-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */
 
var Format = imports.format;
String.prototype.format = Format.format;

//DOMAIN ERROR:0:RED, INFO:1:BLUE, DEBUG:2:GREEN
const domain_color = ["00;31","00;34","00;32"];
const domain_name = ["EE","II","DD"];
const domain_source = "application";

var LEVEL = { ERROR: 0, INFO: 1, DEBUG: 2 };
var debug_lvl = LEVEL.ERROR;
let mono = false;

function init (level, nocolor) {
  level = level || 0;
  debug_lvl = level;
  if (nocolor) mono = true;
}

function info (source, msg) {
  if (!msg) {
    msg = source;
    source = domain_source;
  }
  if (debug_lvl > 0) print_msg (1, source, msg);
}

function debug (source, msg) {
  if (!msg) {
    msg = source;
    source = domain_source;
  }
  if (debug_lvl > 1) print_msg (2, source, msg);
}

function error (source, msg) {
  if (!msg) {
    msg = source;
    source = domain_source;
  }
  print_msg (0, source, msg);
}

function print_msg (domain, source, output) {
  let d = new Date();
  let ds = d.toString ();
  let i = ds.indexOf (" GMT");
  if (i > 0) ds = ds.substring (0, i);

  if (mono) print ("[%s.%s](%s) [xstream][%s] %s".format (
    ds,(d.getMilliseconds() / 1000).toFixed(3).slice(2, 5),domain_name[domain],source,output));
  else print ("\x1b[%sm[%s.%s](%s) [xstream][%s]\x1b[0m %s".format (
    domain_color[domain],ds,(d.getMilliseconds() / 1000).toFixed(3).slice(2, 5),domain_name[domain],source,output));
  //log ("(%s) [cpufreq][%s] %s".format (domain_name[domain], source, output));
}
