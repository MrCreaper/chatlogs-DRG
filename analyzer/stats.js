const fs = require(`fs-extra`);
const os = require(`os`);
const path = require(`path`);
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
    .option('-m, --mod', 'Communicates with the mod')
    .option('-t, --table', 'write some nice tables, files suffixed with "T"')
    .option('-c, --cleanTable', 'REQUIRES -t | writes clean tables without borders')
    .option(`--blacklist <list>`, 'List ignored people, like yourself. Seperate names by ","')
    .option(`--whitelist <list>`, 'List included people, like yourself. Seperate names by ","')

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

if (options.mod) {
    options.cleanTable = true;
    let cmdIN = `${path.dirname(paths.csv)}/chatlogcmd.txt`;
    if (!fs.existsSync(cmdIN)) fs.writeFileSync(cmdIN, ``);
    let cmdOUT = `${path.dirname(paths.csv)}/chatlogcmdout.txt`;
    fs.watchFile(cmdIN, async (curr, prev) => {
        let cmd = fs.readFileSync(cmdIN).toString();
        if (!cmd) return;
        fs.writeFileSync(cmdIN, ``);
        if (options.debug)
            console.log(cmd);
        switch (cmd.split(` `)[0]) {
            default:
            case `help`:
                fs.writeFileSync(cmdOUT, [
                    `general - `,
                    `topchat - top chatters`
                ].join(`\n`));
                break;
            case `general`:
                fs.writeFileSync(cmdOUT, await run(true));
                break;
            case `topchat`:
                run(true);
                fs.writeFileSync(cmdOUT, fs.readFileSync(paths.topChattersT));
                break;
        }
    });
    console.log(`Mod mode enabled.`);
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

if (!options.mod)
    run();
async function run(silent = false) {

    //// init stats

    const wordCount = {};
    const topChatters = {};
    var chatCount = 0;
    var chatGameCount = 0;

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
                if (options.blacklist && options.blacklist.split(`,`).includes(x.name)) return;
                if (options.whitelist && !options.whitelist.split(`,`).includes(x.name)) return;
                chatCount++;
                if (!x.name && !options.dontIgnoreGame) return chatGameCount++; // ignore game messages
                x.index = parseInt(x.index);
                x.added = new Date(x.added);
                if (options.json || options.simple) logs.push(x); // simple for simple table
                if (options.simple) fs.appendFileSync(paths.simple, `${x.name}: ${x.message}\n`);

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

    var sortableWC = [];
    logwordCount();
    function logwordCount() {
        for (var x in wordCount) {
            sortableWC.push([x, wordCount[x]]);
        }

        sortableWC = sortableWC.sort(function (a, b) {
            return a[1] - b[1];
        }).reverse().filter(x => x[0]);

        var total = 0;
        sortableWC.forEach(x => total += x[1]);

        fs.removeSync(paths.wordCount);
        sortableWC.forEach(x => {
            x[2] = `${(x[1] / total * 100).toPrecision(2)}%`;
            fs.appendFileSync(paths.wordCount, `${x[0]} : ${x[1]} (${x[2]})\n`)
        });
        if (options.table)
            fs.writeFileSync(paths.wordCountT, table(sortableWC, tableConfig));
    }

    var sortableTC = [];
    logTopChatters();
    function logTopChatters() {
        for (var x in topChatters) {
            sortableTC.push([x, topChatters[x]]);
        }

        sortableTC.sort(function (a, b) {
            return a[1] - b[1];
        });

        var total = 0;
        sortableTC.forEach(x => total += x[1]);

        fs.removeSync(paths.topChatters);
        sortableTC.reverse().forEach(x => {
            x[2] = `${(x[1] / total * 100).toPrecision(2)}%`;
            fs.appendFileSync(paths.topChatters, `${x[0]} : ${x[1]} (${x[2]})\n`)
        });
        if (options.table)
            fs.writeFileSync(paths.topChattersT, table(sortableTC, tableConfig));
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

    let generalStatsTable = table([
        [`Total Message count`, chatCount],
        [`Game Message count`, chatGameCount],
        [`Message count`, chatCount - chatGameCount],
        [`Diffrent chatters`, sortableTC.length],
        [`Diffrent words`, sortableWC.length],
    ], tableConfig);
    if (!silent)
        console.log(generalStatsTable);
    return generalStatsTable;
};