<p align="center">
  <a href="https://github.com/konkor/newstream"><img src="https://img.shields.io/github/license/konkor/newstream.svg" alt="GPLv3 License"></a>
  <a href="https://github.com/konkor/newstream"><img src="https://img.shields.io/github/stars/konkor/newstream.svg?style=social&label=Star&style=flat-square" alt="Stars"></a><br>
</p>

### [New Stream](https://github.com/konkor/newstream) Linux Youtube Video Player.
-----
**Q**: Why, it's already available in a browser?

**A**: I think native dedicated application is always better. It's why Android users have dedicating players and not using just a browser to it.

`It's very first initial versions and all could be changed any time.`

![screencast](https://i.imgur.com/FS7gWU6.png)

<p align="center">
<a href="https://github.com/konkor/newstream/releases/download/v0.1.1/newstream_0.1.1-1_all.deb"><img src="https://i.imgur.com/Oe4O8bm.png" alt="Latest deb package" title="Ubuntu/Debian/Mint/Elementary..."></a></br>
<a href="https://github.com/konkor/newstream/releases/">other releases</a>
</p>



## Planned Features
* Modern styled GTK UI with user-friendly mobile-like behavior
* Desktop integration
* Advanced searching
* Local subscriptions to channels
* Local subscriptions to searching queries
* Light Embedded Video Player based on gstreamer
* more

## If you like the idea, please consider to become a baker and/or contributor
  I like completely open-source projects. It's why I picked GPLv3 license for my open projects. I think only such license could protect Desktop Users from Business Users. Maybe I'm a dreamer and want to believe in the pure projects but the reality is most projects and FOS organizations are sponsored by big business and founded by them.
  But real life is a hard thing and very complicated by many circumstances. I'm not young and all we have it's our life (time) and where we'll be tomorrow. Life is hard. I'd like it to work on my projects productively which want a lot of time and affords. Now I want get your support to have ability to support and develop projects.

- [Become a backer or sponsor on Patreon](https://www.patreon.com/konkor).
- One-time donation via [PayPal EURO](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=WVAS5RXRMYVC4), [PayPal USD](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=HGAFMMMQ9MQJ2) or Patron where you can choose a custom pledge.

* Contact to the author [here](https://konkor.github.io/index.html#contact).

_Behind the development for the Linux Desktop are ordinary people who spend a lot of time and their own resources to make the Linux Desktop better. Thank you for your contributions!_


## Dependencies
* gjs (core dependency)
* GTK3 libraries:
 * gir1.2-atk-1.0
 * gir1.2-glib-2.0
 * gir1.2-gtk-3.0
 * gir1.2-soup-2.4
* gir1.2-gstreamer-1.0
 * gir1.2-gstreamer-1.0
 * gstreamer1.0-libav
 * gstreamer1.0-plugins-bad
 * gstreamer1.0-plugins-ugly
* [youtube-dl](https://github.com/rg3/youtube-dl)

```
sudo wget https://yt-dl.org/downloads/latest/youtube-dl -O /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
```

## Testing

```sh
git clone https://github.com/konkor/newstream
cd newstream
./new-stream
```

## License

[GPLv3](https://www.gnu.org/licenses/gpl.html)
