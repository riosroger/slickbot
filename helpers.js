'use strict';
const path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
const chalk = require('chalk');
const _ = require('lodash');
const COMMANDS_FILE = path.join(__dirname, 'commands.json');

let getSlashCommands = function(){
    return readJsonFile(COMMANDS_FILE)
    .catch(createCommandsFile)
    .then(commands => {
        if (!_.isObject(commands)) return createCommandsFile();
        return commands;
    })
};

let readJsonFile = function(file){
    return new Promise((res, rej) => {
        jsonfile.readFile(file, function(err, obj) {
            if (err) return rej(err);
            res(obj);
        });
    });
};

let writeJsonFile = function(file, body){
    return new Promise((res, rej) => {
        jsonfile.writeFile(file, body, function(err){
            if (err) return rej(err);
            res(body);
        })
    })
};

let createCommandsFile = function(){
    return writeJsonFile(COMMANDS_FILE, {});
};

let logError = function(err){
    console.log(chalk.red(err));
};

let hasWriteAccess = function(file){
    return new Promise((res, rej) => {
        fs.access(file, fs.constants.W_OK, (err) => {
            if (err) return rej(err);
            res(true);
        });
    });
};

let hasReadAccess = function(file){
    return new Promise((res, rej) => {
        fs.access(file, fs.constants.R_OK, (err) => {
            if (err) return rej(err);
            res(true);
        });
    });
};

let readFile = function(file){
    return new Promise((res, rej) => {
        fs.readFile(file, 'utf-8', function(err, data){
            if (err) return rej(err);
            res(data);
        });
    });
};

module.exports = {
    getSlashCommands, readJsonFile, writeJsonFile, logError,
    hasWriteAccess, hasReadAccess, readFile
}