//data
// const fs = require('fs');
const builds = require('../builder_data/build_list.json');
const execSync = require("child_process").execSync;

const ItemStatus = {
    InQueue:    0xE0,
    PreBuild:   0xE1,
    Compile:    0xE2,        
    MakeBuilds: 0xE3,
    PostRun:    0xE4,
    Success:    0xE5,
    Failed:     0xE6,
};

const buildStatus = {
    Nothing:       0xE8, // if item of this history even not run 
    Waiting:       0xE9, // if startbuildItem start to
    MakeInstaller: 0xEB,
    Done:          0xEC,
    Failed:        0xED,
    Skip:          0xEE, // set if compile libs or prebuild sh is failed, it mean that even here to linking it build not reached
};


module.exports = { 
    builds, 
    execSync, 
    ItemStatus, 
    buildStatus
}