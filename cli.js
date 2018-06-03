#!/usr/bin/env node
const program = require('commander');
const forever = require('forever');
const http = require('http');
const path = require('path');
const inquirer = require('inquirer');
const _ = require('lodash');
const chalk = require('chalk');
const cTable = require('console.table');
const PACKAGE_JSON = require('./package.json');
const APP_NAME = PACKAGE_JSON.name;
const APP_VERSION = PACKAGE_JSON.version;
const COMMANDS_FILE = path.join(__dirname, 'commands.json');
const helpers = require('./helpers.js');

let startCommand = function(data){
    let port = parseInt(data.parent.port) || parseInt(process.env.SLICKBOT_PORT);
    let token = _.trim(data.parent.token) || _.trim(process.env.SLICKBOT_TOKEN);
    let queue = data.parent.queue || _.trim(process.env.SLICKBOT_QUEUE) == 'true';
    if (isNaN(port)) return helpers.logError(`Invalid port number.\nUsage: "${APP_NAME} start --port <port> --token <token>" or set "SLICKBOT_PORT" as a environment variable.`);
    if (!token) return helpers.logError(`Invalid token.\nUsage: "${APP_NAME} start --port <port> --token <token>" or set "SLICKBOT_TOKEN" as a environment variable.`);

    let server = http.createServer().listen(port);
    
    server.close(function(err){
        if (err) return helpers.logError(err);
        startDaemon(port, token, queue);
    });
};

let startDaemon = function(port, token, queue){
    getChildProcess()
    .then(child => {
        if (child) return console.log(`${APP_NAME} is already listening on port ${child.args[1]}.`);

        let server = path.join(__dirname, 'server.js');
        let daemon = forever.startDaemon(server, {
            uid: APP_NAME,
            max: 3,
            args: ['--port', port, '--token', token, '--queue', queue],
            watch: true,
            watchDirectory: __dirname
        })
    
        forever.startServer(daemon);
        console.log(chalk.bold(`${APP_NAME} is now listening on port ${port}.`));
    })
    .catch(helpers.logError);
}

let stopCommand = function(){
    return getChildProcessIndex()
    .then(stopDaemon)
    .catch(helpers.logError);
};

let getChildProcessIndex = function(){
    return new Promise((res, rej) => {
        forever.list(false, (err, monitors) => {
            if (err) return rej(err);
    
            let index = _.findIndex(monitors, monitor => {
                return monitor.uid == APP_NAME;
            });

            res(index);
        });
    });
};

let stopDaemon = function(index){
    if (index == -1){
        console.log(chalk.bold(`${APP_NAME} has not been started.`));
        return Promise.resolve(null);
    }

    return new Promise((res, rej) => {
        let child = forever.stop(index);
        child.on('stop', () => {
            console.log(chalk.bold(`${APP_NAME} has been stopped.`));
            res(child);
        });
    })
}

let statusCommand = function(){
    getChildProcess()
    .then(child => {
        if (!child) return console.log(chalk.bold(`${APP_NAME} has not been started.`));
        console.log(chalk.bold(`${APP_NAME} is listening on port ${child.args[1]}.`));
        console.log(chalk.bold(`slick logs at: ${child.logFile}`));
    })
    .catch(helpers.logError);
};

let getChildProcess = function(){
    return new Promise((res, rej) => {
        forever.list(false, (err, monitors) => {
            if (err) return rej(err);

            let child = _.find(monitors, monitor => {
                return monitor.uid == APP_NAME;
            });

            res(child);
        });
    })
};

let addCommand = function(){
    inquirer.prompt([
        {
            type: 'input',
            name: 'slash_command',
            message: 'Slash command:',
            validate: validateSlashCommand,
            filter: function(answer){
                return _.trim(answer);
            }
        },{
            type: 'input',
            name: 'script',
            message: 'Script/Command to run:',
            validate: function(answer){
                return _.trim(answer) != '';
            },
            filter: function(answer){
                return _.trim(answer);
            }
        },{
            type: 'list',
            name: 'ack_msg_type',
            message: 'Acknowledge Message Type:',
            choices: [
                {name: 'string', checked: true},
                {name: 'file'}
            ]
        },{
            type: 'input',
            name: 'ack_msg',
            message: 'Acknowledge Message:',
            filter: function(answer){
                return _.trim(answer);
            },
            when: function(answer){
                return answer.ack_msg_type == 'string';
            }
        },{
            type: 'input',
            name: 'ack_msg',
            message: 'Full path to acknowledge message file:',
            suffix: '(/path/to/file.txt)',
            filter: function(answer){
                return _.trim(answer);
            },
            when: function(answer){
                return answer.ack_msg_type == 'file';
            }
        },{
            type: 'list',
            name: 'completed_msg_type',
            message: 'Completed Message Type:',
            choices: [
                {name: 'string', checked: true},
                {name: 'file'}
            ]
        },{
            type: 'input',
            name: 'completed_msg',
            message: 'Completed Message:',
            filter: function(answer){
                return _.trim(answer);
            },
            when: function(answer){
                return answer.completed_msg_type == 'string';
            }
        },{
            type: 'input',
            name: 'completed_msg',
            message: 'Full path to acknowledge message file:',
            suffix: '(/path/to/file.txt)',
            filter: function(answer){
                return _.trim(answer);
            },
            when: function(answer){
                return answer.completed_msg_type == 'file';
            }
        },
    ])
    .then(saveSlashCommand);
};

let removeCommand = function(slash_command){
    helpers.getSlashCommands()
    .then(commands => {
        delete commands[slash_command];
        return helpers.writeJsonFile(COMMANDS_FILE, commands);
    })
};

let validateSlashCommand = function(answer){
    let isValid = new RegExp(/^[a-z0-9-_]+$/).test(answer);
    if (!isValid){
        helpers.logError('\nslash commands must be all lowercase with no spaces. - and _ are allowed.')
        return false;
    }

    return helpers.getSlashCommands()
    .then(commands => {
        if (commands[answer]){
            helpers.logError(`\n"${answer}" has already been taken.`)
            return false;
        }
        return true;
    })
    .catch(err => {
        helpers.logError(err);
        return false;
    })
};

let saveSlashCommand = function(answer){
    return helpers.getSlashCommands()
    .then(commands => {
        let slash_command = _.trim(answer.slash_command);
        if (commands[slash_command]) return helpers.logError(`"${slash_command}" has already been set.`);
        
        commands[slash_command] = answer;
        return helpers.writeJsonFile(COMMANDS_FILE, commands);
    })
};

let listCommand = function(answer){
    return helpers.getSlashCommands()
    .then(commands => {
        if (_.isEmpty(commands)) return console.log('no slash commands found.\n');
        
        let table = _.values(commands).map(command => {
            return _.omit(command, ['ack_msg_type', 'completed_msg_type'])
        })
        console.table(table);
    })
}

let tailCommand = function(){
    return getChildProcess()
    .then(child => {
        forever.tail(child.file, {stream: true}, function(err, log){
            if (err) return console.error(err);
            console.log(log.line);
        })
    })
};
 
program.version(APP_VERSION)
.option('-p, --port <number>', 'port number or the environment variable SLICKBOT_PORT.')
.option('-t, --token <string>', 'slack token or the environment variable SLICKBOT_TOKEN.')
.option('-q, --queue', 'if jobs should be put on a queue or set SLICKBOT_QUEUE=true.')

program.command('start')
.description(`starts ${APP_NAME}.`)
.option('-p, --port <number>')
.option('-t, --token <string>')
.option('-q, --queue')
.action(startCommand);

program.command('stop')
.description(`stops ${APP_NAME}.`)
.action(stopCommand);

program.command('add')
.description(`adds a slash command.`)
.action(addCommand);

program.command('remove <string>')
.description(`removes the specified slash command.`)
.action(removeCommand);

program.command('status')
.description(`displays if ${APP_NAME} is running.`)
.action(statusCommand);

program.command('list')
.description(`displays the list of saved slash commands.`)
.action(listCommand);

program.command('tail')
.description(`tails the log.`)
.action(tailCommand);

program.on('command:*', function(){
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
});

program.parse(process.argv);
if (program.args.length == 0) program.help();