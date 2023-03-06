# [Chat log](https://mod.io/g/drg/m/chat-log/)

Logs your chat what else did you excpect.

## Usage / Help

```txt
Usage: chatlog [options]

Do stuff with collected DRG chat logs.

Options:
  -V, --version         output the version number
  -d, --debug           enable debug
  -s, --simple          write out a simple txt of the chat
  -j, --json            write the csv as json
  --csv <path>          path to the chatlogs.csv
  -g, --dontIgnoreGame  dont ignore game messages
  -w, --watch           watch for changes in the csv and rerun
  -m, --mod             Communicates with the mod
  -t, --table           write some nice tables, files suffixed with "T"
  -c, --cleanTable      REQUIRES -t | writes clean tables without borders
  --blacklist <list>    List ignored people, like yourself. Seperate names by ","
  --whitelist <list>    List included people, like yourself. Seperate names by ","
  -h, --help            output usage information
```

Output is in `./out/`

## Dev

Dont forget the [asset reconstruction pack](https://drive.google.com/file/d/1HL-z5I62FpY6l9Qt2QGnR8ZpHkHyfESQ/view?usp=sharing) (can also be found on this [server](https://discord.gg/gUw32ayWGt) > [message](https://discord.com/channels/676880716142739467/883791204930703360/998263940809232507)).
