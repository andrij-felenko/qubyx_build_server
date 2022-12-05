let isCompile;

const fs = require('fs')
process.on('message', function(line) {
    console.log(line)
    let lines = line.split('|');
    isCompile = lines[0] === "compile";
    lines[1] = handlerExec(lines[1], isCompile ? String(line[3]) + '.log' : "");
    console.log('result of:', lines.join('|'))
    process.send(lines.join('|'));
});

const execSync = require("child_process").execSync;
function handlerExec(line, logname = "") {
    console.log('line:', line);
    const stream = new fs.createWriteStream(String(line[3]) + '.log');
    try {
        execSync(line, {stdio: isCompile ? ['ignore', stream] : 'inherit'});
    } catch (e) {
        console.log(e);
        return e.status;
    };
        
    return 0;
};
// const fs = require('fs')
// const childProcess = require('child_process')

// const stream = new fs.createWriteStream('out')
// stream.on('open', function() {
//     childProcess.execSync('ls -la', {stdio:['ignore', stream, stream]})
// })