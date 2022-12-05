const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
require('dotenv').config();
let child_process = require('child_process');
let script_runner = child_process.fork('./script_runner');

const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/', {
    dbName: 'history_db',
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => err ? console.log(err) : console.log('Connected to history database'));
  
// Schema for users of app
const ItemSchema = new mongoose.Schema({
    branch: {
        type: String,
        required: true,
    },
    builds: {
        type: Array,
        required: true,
    },
    systemx64: {
        type: Boolean,
        required: true
    },
    systemx86: {
        type: Boolean,
        required: true
    },
    qtVersionx64: {
        type: Object,
        required: true
    },
    qtVersionx86: {
        type: Object,
        required: true
    },
    skipFailed: {
        type: Boolean,
        required: true
    },
    highPriority: {
        type: Boolean,
        required: true
    },
    status: {
        type: Number
    },
    date: {
        type: String,
        required: true
    },
    error: {
        type: String,
        required: true
    }
});

const Item = mongoose.model('items', ItemSchema);
Item.createIndexes();
  
// For backend and express
const cors = require("cors");
app.use(express.json());
app.use(cors());

let ini = require("ini");
const fs = require('fs');
let versionFile = './builder_data/version.ini';
const getVersionByBranch = (branch) => {
    let versions = ini.parse(fs.readFileSync(versionFile, 'utf-8'))
    
    if (versions[branch]){
        return Number(versions[branch]) + 1;
    }
    return '1';
}
  
const getPreVersion = (branch) => {
    let versions = ini.parse(fs.readFileSync(versionFile, 'utf-8'))
    return ret = versions.minor + '.' + branch + '_';
}

const getFullVersion = (branch) => {
    let versions = ini.parse(fs.readFileSync(versionFile, 'utf-8'))
    return ret = String(versions.major) + getPreVersion(branch) + getVersionByBranch(branch);
}

const updateVersionByBranch = (key, value, success) => {
    let versions = ini.parse(fs.readFileSync(versionFile, 'utf-8'))
    if (key === 'master' && success){
        let major = versions['major'];
        let minor = versions['minor'];
        versions = [];
        versions['major'] = major;
        versions['minor'] = Number(minor) + 1;
    }
    else {
        versions[key] = value;
    }
    
    fs.writeFileSync(versionFile, ini.stringify(versions))
}  

//data
const execSync = require("child_process").execSync;

const ItemStatus = {
    InQueue:       224,
    PreBuild:      225,
    Compilex86:    226, 
    Compilex64:    227,       
    MakeBuildsx86: 228,
    MakeBuildsx64: 229,
    PostRun:       230,
    Success:       231,
    Failed:        232,
};

const buildStatus = {
    Nothing:       232, // if item of this history even not run 
    Waiting:       233, // if startbuildItem start to
    MakeInstaller: 234,
    Done:          235,
    Failed:        236,
    Skip:          237, // set if compile libs or prebuild sh is failed, it mean that even here to linking it build not reached
};

let mutex = false;
let currentItemInProcess;
function prepareBuilds(builds) {
    let buildsStr = " --builds \"";
    for (let b of builds){
        if (b !== builds[0])
            buildsStr += " ";
        buildsStr += b.name;
    };

    return buildsStr + '\"';
};

function prepareCompileExec(arch) {
    let curDir = process.cwd().split("\\").join('/');
    let hItem = currentItemInProcess;
    let version = getPreVersion(currentItemInProcess.branch) 
                + getVersionByBranch(currentItemInProcess.branch);
    return `\"${process.env.GITBASH_PATH}\" builder_data/compile.sh` +
    ' --arch \"' + arch + '\"'+
    ` --qt \"${arch === "x64" ? hItem.qtVersionx64.version : hItem.qtVersionx86.version}\"` +
    ` --compiler \"${arch === "x64" ? hItem.qtVersionx64.compiler : hItem.qtVersionx86.compiler}\"` +  
    ` --qtfolder \"${process.env.QT_PATH}\"` +
    ` --plpath \"${process.env.PERFECTLUM_PATH}\"` +
    ` --qt_settings \"${curDir}/qt_settings/\"` +
    ` --profile \"${arch === "x64" ? hItem.qtVersionx64.profile : hItem.qtVersionx86.profile}\"` +
    ` --config \"${arch === "x64" ? hItem.qtVersionx64.config : hItem.qtVersionx86.config}\"` +
    ` --version \"${version}\"` +
    prepareBuilds(hItem.builds);
};

function prebuild() {
    updateHItemStatus(ItemStatus.PreBuild);
    script_runner.send('prebuild|' +
                       `\"${process.env.GITBASH_PATH}\" builder_data/prebuild.sh` +
                       ` --plpath \"${process.env.PERFECTLUM_PATH}\"` + 
                       ` --branch \"${currentItemInProcess.branch}\"`);
};

function compile(system) {
    updateHItemStatus(system);
    let systemStr = system === ItemStatus.Compilex64 ? "x64" : "x86";
    console.log("compile!!!!!!!!", system, systemStr)
    script_runner.send('compile|' + prepareCompileExec(systemStr) + '|' + systemStr + '|' + currentItemInProcess.date);
};

function makeInstaller(lastBuild, system) {
    if (!lastBuild)
        updateHItemStatus(ItemStatus.MakeInstaller);
    
    // find needed installer
    let foundlast = lastBuild === "";
    let newBuild = "";
    for (let b of currentItemInProcess.builds){
        if ((b.x64 && system === ItemStatus.systemx64) ||
            (b.x86 && system === ItemStatus.systemx86)){
            if (foundlast){
                updateBuildStatus(b, buildStatus.MakeInstaller);
                script_runner.send('installer|' +
                    `\"${process.env.GITBASH_PATH}\" builder_data/make_installer_build.sh` +
                    ` --plpath \"${process.env.PERFECTLUM_PATH}\"` + 
                    ` --branch \"${currentItemInProcess.branch}\"` +
                    ` --arch \"${system === ItemStatus.Compilex64 ? "x64" : "x86"}\"` +
                    ` --build \"${b.name}\"` +
                    ` --qtfolder \"${process.env.QT_PATH}\"` +
                    ` --version \"${version}\"` +
                    ` --baseversion \"${getFullVersion(currentItemInProcess.branch)}\"` +
                    ` --plmainv \"${b.pl_v}\"` +
                    `|\"${b.name}\"|\"${system}\"`);
                return;
            } else if (lastBuild == b.name){
                foundlast = true;
                continue;
            }
        }
    }

    if (system === "x86" || currentItemInProcess.systemx64){
        compile(ItemStatus.Compilex64);
        return;
    }

    // TODO run post script
    // check allstatus to make sure all was fine
    let status = true;
    let allFailed = true; // set it result of status
    for (let build of currentItemInProcess.builds) {
        if (build.buildStatus == buildStatus.Failed) {
            atLeastOneFailed = true;
            if (!currentItemInProcess.skipFailed){
                status  = false;
                break;
            }
        } else {
            allFailed = false;
        }
    };

    if (currentItemInProcess.skipFailed && allFailed) {
        resultHandler(false);
        return;
    }
     
    after(true);
};

function after(result) {
    updateHItemStatus(ItemStatus.PostRun);
    script_runner.send('post|' +
                       `"${process.env.GITBASH_PATH}" builder_data/after.sh` +
                       `|${result}`);
};

function endBuildItem(result){
    for (let b of currentItemInProcess.builds){
        if (b.buildStatus !== buildStatus.Done && b.buildStatus !== buildStatus.Failed){
            updateBuildStatus(b, buildStatus.Skip);
        }
    }
    updateHItemStatus(Boolean(result) ? ItemStatus.Success : ItemStatus.Failed);
    
    mutex = false;
}

script_runner.on('message', function(message) {
    let lines = message.split('|');
    let hItem = currentItemInProcess;
    let result = Number(lines[1]);
    switch (lines[0]){
        case 'prebuild': {
            if (!resultHandler(result)) break;
            compile(hItem.systemx86 === true 
                ? ItemStatus.Compilex86 : ItemStatus.Compilex64);
            break;
        }
        case 'compile': {
            if (!resultHandler(result)) break;
            makeInstaller("", lines[2]);
            break;
        }
        case 'installer': {
            if (result !== 0 && !hItem.skipFailed){ resultHandler(result); return; }
            makeInstaller(lines[2], lines[3])
            break;
        }
        case 'post': { endBuildItem(lines[2]); } break;
        default:;
    }
})

function updateHItemStatus(newStatus) {
    currentItemInProcess.status = newStatus;
    Item.updateOne(
        {date: currentItemInProcess.date}, 
        {$set: {status: newStatus}}, 
        function (error, data) {
            if (error) {
                console.log(error);
            } else {
                io.emit("receive-data");
            }
        }
    );
};

function updateBuildStatus(build, newStatus) {
    build.buildStatus = newStatus;
    console.log('build', build);
    console.log(currentItemInProcess.builds);

    Item.updateOne(
        {date: currentItemInProcess.date}, 
        {$set: { builds: currentItemInProcess.builds }}, 
        function (error, data) {
            if (error) {
                console.log(error);
            } else {
                io.emit("receive-data");
            }
        }
    );
};

function startBuildItem(hItem) {
    // set all build to status waiting
    console.log('start build item')
    mutex = true;
    currentItemInProcess = hItem;
    for (let build of hItem.builds) {
        build.buildStatus = buildStatus.Waiting;
    };

    // update all status in builds by current hItem
    Item.updateOne(
        {date: hItem.date}, 
        {$set: {builds: hItem.builds}}, 
        function (error, data) {
            if (error) {
                console.log(error)
            }
        }
    );
    io.emit("receive-data");
    
    prebuild();
}

function resultHandler(status, error = "") {
    if (status === 0){
        return true;
    }

    Item.updateOne(
        {date: currentItemInProcess.date}, 
        {$set: {error: error === "" ? String(status) : error}}, 
        function (error, data) {
            if (error) {
                console.log(error)
            }
        }
    );
    io.emit("receive-data");

    after(false);
    return false;
};

function checkingItems () {
    if (mutex) {
        return;
    }

    Item.find({}, async function(err, items) {
        if (err) {
            console.log(err);
            return;
        };

        if (items.length === 0) {
            return;
        };

        let neededItem = items[0];
        for (let x of items) {
            // console.log('date', x.date)
            if (x.status === ItemStatus.InQueue) {
                if (neededItem.status !== ItemStatus.InQueue){
                    neededItem = x;
                    continue;
                }

                if (x.highPriority === true && neededItem.highPriority === false) {
                    neededItem = x;
                    continue;
                } 
                if (x.highPriority === neededItem.highPriority) {
                    if (x.date >= neededItem.date) {
                        neededItem = x;
                    };
                }
            };
        };

        if (neededItem === null || neededItem.status !== ItemStatus.InQueue){
            return;
        };
    
        startBuildItem(neededItem);
    });
};

let buildsList;

function timeCall() {
    buildsList = require(`../builder_data/build_list.json`);
    checkingItems();
    setTimeout(() => {
        timeCall()
    }, 1000);
};

// execSync("git --git-dir=const { exec } = require('child_process').git fetch --all");
execSync(`git --git-dir=${process.env.PERFECTLUM_PATH}/.git pull  --all`);
execSync(`git --git-dir=${process.env.PERFECTLUM_PATH}/.git fetch origin --prune`);

let branchList = execSync(`git --git-dir=${process.env.PERFECTLUM_PATH}/.git branch -r`)
    .toString()
    .replace(/\t|\n|->| /g, '')
    .split('origin/')
    .filter(item => item);  

branchList = branchList.filter(item => !item.includes('HEAD') && !item.includes('dev'));


//Post request
// app.post('/items', async (req, resp) => {
//     try {
//         const item = new Item(req.body);
//         let result = await item.save();
//         console.log('body', req.body)
//         result = result.toObject();
//         if (result) {
//             resp.send(req.body);
//         } else {
//             console.log("Error!");
//         };
//     } catch (e) {
//         resp.send("Something Went Wrong");
//     };
// });

//Delete request
// app.delete('/items/:id', (req, res) => {
    // Item.deleteOne({_id: req.params.id})
    //   .then(() => {
    //       res.status(200).json({
    //         message: 'Deleted!'
    //       });
    //    })
    //   .catch(
    //     (error) => {
    //       res.status(400).json({
    //         error: error
    //     });
    // }); 
// });

app.get('/items', (req, res) => {
    Item.find({}, function(err, items) {
        if (err) {
            console.log(err);
        } else {
            res.json(items);
        };
    });
});

app.get('/data', (req, res) => {
    res.json({
        buildData: buildsList,
        branchData: branchList,
    });
});

app.listen(PORT, () => {
    console.log('Server is open on port: ', PORT);
});

timeCall();

const io = require("socket.io")(3002, {
    cors: {
        origin: ["http://192.168.0.92:3000"],
    }
});

io.on("connection", socket => {
    socket.on("sending-data", async data => {
        const item = new Item(data.item);
        await item.save();
        io.emit("receive-data");
    });

    socket.on("remove-data", async data => {
        Item.deleteOne({_id: data}).then(() => {
            io.emit("receive-data");
        })
    });
});
