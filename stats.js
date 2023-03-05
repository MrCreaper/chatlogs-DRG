const fs = require(`fs-extra`);
const os = require(`os`);
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const { table, getBorderCharacters } = require(`table`);
const package = require(`./package.json`);

function msToTime(duration) {
    var milliseconds = Math.floor((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

//////////////////////// Commander

const { Command } = require('commander');
const program = new Command();

program
    .name(package.name)
    .description(package.description)
    .version(package.version);

program
    .option('-d, --debug', 'enable debug')
    .option('-s, --simple', 'write out a simple txt of the chat')
    .option('-j, --json', 'write the csv as json')
    .option(`--csv <path>`, 'path to the chatlogs.csv')
    .option('-g, --dontIgnoreGame', 'dont ignore game messages')
    .option('-w, --watch', 'watch for changes in the csv and rerun')
    .option('-t, --table', 'write some nice tables, files suffixed with "T"')
    .option('-c, --cleanTable', 'REQUIRES -t | writes clean tables without borders')

program.parse(process.argv);
const options = program.opts();

const paths = {
    csv: options.csv,
    table: `./out/chatlogT.txt`,
    json: `./out/chatlog.json`,
    simple: `./out/chatlogs.txt`,
    simpleT: `./out/chatlogsT.txt`,
    topChatters: `./out/topChatters.txt`,
    topChattersT: `./out/topChattersT.txt`,
    wordCount: `./out/wordCount.txt`,
    wordCountT: `./out/wordCountT.txt`,
};

const tableConfig = options.cleanTable ? {
    border: getBorderCharacters('void'),
    columnDefault: {
        paddingLeft: 0,
        paddingRight: 1
    },
    drawHorizontalLine: () => false
} : undefined;

if (options.debug) console.log(options);
if (options.simple) fs.removeSync(paths.simple);

if (!fs.existsSync(`./out`)) fs.mkdirSync(`./out/`);

//////////////////////// get path

if (!paths.csv)
    switch (os.platform().replace(/0-9/g, ``)) {
        case `linux`:
            paths.csv = `/home/${os.userInfo().username}/.local/share/Steam/steamapps/common/Deep Rock Galactic/FSD/Mods/chatlogs.csv.txt`;
            break;
        case `darwin`:
            paths.csv = ``;
            break;
        case `win`:
            paths.csv = ``;
            break;
    }

if (!fs.existsSync(paths.csv)) return console.log(`Couldnt find log\n${paths.csv}`);
if (fs.statSync(paths.csv).size == 0) return console.log(`File is empty`);
if (options.debug) console.log(paths.csv);

//////////////////////// run

if (options.watch)
    fs.watchFile(paths.csv, (curr, prev) => {
        console.log(msToTime(curr.mtime - prev.mtime));
        run();
    });

run();
async function run() {

    //// init stats

    const wordCount = {};
    const topChatters = {};

    function tokenize(text) {
        text = String(text).toLowerCase().replace(/[^\w\s]/g, '');
        const tokens = text.split(/\s+/);
        return tokens;
    }

    function countWords(tokens) {
        //const wordCount = {};
        for (let i = 0; i < tokens.length; i++) {
            const word = tokens[i];
            if (wordCount[word])
                wordCount[word]++;
            else
                wordCount[word] = 1;
        }
        return wordCount;
    }

    //// read

    var logs = [];
    await new Promise(r => {
        fs.createReadStream(paths.csv)
            .pipe(iconv.decodeStream('utf-16le'))
            .pipe(csv())
            .on('data', x => {
                if (!x.name && !options.dontIgnoreGame) return; // ignore game messages
                x.index = parseInt(x.index);
                x.added = new Date(x.added);
                if (options.json || options.simple) logs.push(x); // simple for simple table
                if (options.simple) fs.appendFileSync(paths.simple, `${x.name}: ${x.message}\n`)

                //// stats

                countWords(tokenize(x.message));

                if (!topChatters[x.name])
                    topChatters[x.name] = 1;
                else
                    topChatters[x.name]++;
            })
            .on('end', r);
    });

    if (options.simple) fs.writeFileSync(paths.simpleT, table(logs.map(x => [x.name, x.message]), tableConfig));

    if (options.json)
        fs.writeFileSync(paths.json, JSON.stringify(logs))

    logwordCount()
    function logwordCount() {
        let sortable = [];
        for (var x in wordCount) {
            sortable.push([x, wordCount[x]]);
        }

        sortable = sortable.sort(function (a, b) {
            return a[1] - b[1];
        }).reverse().filter(x => x[0]);

        var total = 0;
        sortable.forEach(x => total += x[1]);

        fs.removeSync(paths.wordCount);
        sortable.forEach(x => {
            x[2] = `${(x[1] / total * 100).toPrecision(2)}%`;
            fs.appendFileSync(paths.wordCount, `${x[0]} : ${x[1]} (${x[2]})\n`)
        });
        if (options.table)
            fs.writeFileSync(paths.wordCountT, table(sortable, tableConfig));
        console.log(`Diffrent words: ${sortable.length}`);
    }

    logTopChatters()
    function logTopChatters() {
        let sortable = [];
        for (var x in topChatters) {
            sortable.push([x, topChatters[x]]);
        }

        sortable.sort(function (a, b) {
            return a[1] - b[1];
        });

        var total = 0;
        sortable.forEach(x => total += x[1]);

        fs.removeSync(paths.topChatters);
        sortable.reverse().forEach(x => {
            x[2] = `${(x[1] / total * 100).toPrecision(2)}%`;
            fs.appendFileSync(paths.topChatters, `${x[0]} : ${x[1]} (${x[2]})\n`)
        });
        if (options.table)
            fs.writeFileSync(paths.topChattersT, table(sortable, tableConfig));
        console.log(`Diffrent chatters: ${sortable.length}`);
    }

    function objectToArray(input) {
        let out = [];
        out.push(Object.keys(input[0]));
        for (var i = 1; i < input.length; i++) {
            let o = [];
            out[0].forEach(x => {
                let v = input[i][x];
                if (v instanceof Date)
                    o.push(v.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
                else
                    o.push(v);
            });
            out.push(o);
        }
        return out;
    }

    if (options.table)
        fs.writeFileSync(paths.table, table(objectToArray(logs), tableConfig));

    if (logs.length)
        console.log(`Message count: ${logs.length} (${logs[logs.length - 1].index})`);
};