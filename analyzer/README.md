# Chat log analyzer

Analyzes chat logs

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
  --noNonAscii          replace non ascii characters from names with ?
  -h, --help            output usage information
```

Output is in `./out/`
