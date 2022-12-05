const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;
require('dotenv').config();
const Data = require('./united_data.js')
let request = require('request');

// For backend and express
const cors = require("cors");
app.use(express.json());
app.use(cors());

function updateHItemStatus(str){
    request.post(
        'localhost:3001/update_status',
        { json: { key: 'value' } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        }
    ); 
}

function handlerExec(line) {
    console.log('line:', line);
    try {
        execSync(line, {stdio: 'inherit'});
    } catch (e) {
        console.log(e);
        return e.status;
    };    
    return 0;
}

function prepareBuilds(builds) {
    let buildsStr = " --builds \"";
    for (let b of builds){
        if (b !== builds[0])
            buildsStr += " ";
        buildsStr += b.name;
    }
    return buildsStr + '\"';
}

//
function prepareKeys(hItem, shName, arch) {
    return `\"${process.env.GITBASH_PATH}\" builder_data/${shName}.sh` +
    ' --arch \"' + arch + '\"'+
    ` --qt \"${arch === "x64" ? hItem.qtVersionx64.version : hItem.qtVersionx86.version}\"` +
    ` --compiler \"${arch === "x64" ? hItem.qtVersionx64.compiler : hItem.qtVersionx86.compiler}\"` +  
    ` --qtfolder \"${process.env.QT_PATH}\"` +
    ` --plpath \"${process.env.PERFECTLUM_PATH}\"`;
}

function prebuild(hItem) {
    updateHItemStatus(hItem, ItemStatus.PreBuild);
    let error = -1;
    console.log('hItem', hItem, hItem.systemx64, hItem.systemx86)
    if (hItem.systemx64) {
        error = handlerExec(prepareKeys(hItem, "prebuild", "x64") + ` --branch \"${hItem.branch}\"`);
    } else if (hItem.systemx86 && error <= 0){
        error = handlerExec(prepareKeys(hItem, "prebuild", "x86") + ` --branch \"${hItem.branch}\"`);
    }
    return error;
};

function compile(hItem) {
    
    updateHItemStatus(hItem, ItemStatus.Compile);
    let error = -1;
    console.log(23)
    if (hItem.systemx64){
        console.log(24)
        error = handlerExec(prepareKeys(hItem, "compile", "x64") + prepareBuilds(hItem.builds));
        console.log(25)
    } else if (hItem.systemx86 && error <= 0){
        console.log(26)
        error = handlerExec(prepareKeys(hItem, "compile", "x86") + prepareBuilds(hItem.builds));
        console.log(27)
    }
    console.log(28)
    return error;
};

//
function makeInstaller(hItem, build) {
    updateBuildStatus(hItem, build, buildStatus.MakeInstaller);
    let error = -1;
    if (hItem.systemx64){
        error = handlerExec(prepareKeys(hItem, "make_installer_build", "x64") + prepareBuilds(hItem.builds));
    } else if (hItem.systemx86 && error === 0){
        error = handlerExec(prepareKeys(hItem, "make_installer_build", "x86") + prepareBuilds(hItem.builds));
    }
    return error;
};

function after () {
    try {
        return execSync(`"${process.env.GITBASH_PATH}" builder_data/after.sh`);
    } catch (e) {
        return e.status;
    };
};

function startBuildItem(hItem) {
    // set all build to status waiting
    mutex = true;
    for (let build of hItem.builds) {
        build.status = buildStatus.Waiting;
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
    
    let prebuildResult = prebuild(hItem);
    console.log('prebuildResult', prebuildResult);
    if (prebuildResult !== 0) {
        resultHandler(hItem, false, prebuildResult);
        mutex = false;
        return;
    };

    let compileResult = compile(hItem);
    console.log('compileResult', compileResult);
    if (compileResult !== 0) {
        resultHandler(hItem, false, compileResult);
        mutex = false;
        return;
    };

    updateHItemStatus(hItem, ItemStatus.MakeBuilds);
    
    for (let build of hItem.builds) {
        if (! makeInstaller(hItem, build)) {
            //error
            updateBuildStatus(hItem, build, buildStatus.Failed);
            if (!hItem.skipFailed) {
                break;
            };        
            continue;
        };
        updateBuildStatus(hItem, build, buildStatus.Done);
    };

    // check allstatus to make sure all was fine
    let status = true;
    let allFailed = true; // set it result of status
    for (let build of hItem.builds) {
        if (build.status == buildStatus.Failed) {
            atLeastOneFailed = true;
            if (!hItem.skipFailed){
                status  = false;
                break;
            }
        } else {
            allFailed = false;
        }
    };

    if (hItem.skipFailed && allFailed) {
        status = false;
    }

    resultHandler(hItem, status); // add error link if failed
    mutex = false;
    checkingItems();
    app.post()
}

app.post('/run_build', async (req, resp) => {
    try {
        const item = new Item(req.body);
        let result = await item.save();
        result = result.toObject();
        if (result) {
            resp.send(req.body);
            setTimeout(() => {
                checkingItems();
            }, 3000)
        } else {
            console.log("Error!");
        };
    } catch (e) {
        resp.send("Something Went Wrong");
    };
});

app.get('/build_item', (req, res) => {
    res.json({})
});

app.listen(PORT, () => {
    console.log('Server script is open on port: ', PORT);
});