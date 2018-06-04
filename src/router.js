'use strict';
const router = require('express').Router();
const { exec } = require('child_process');
const { WebClient, IncomingWebhook } = require('@slack/client');
const helpers = require('./helpers.js');
const argv = require('minimist')(process.argv.slice(2));
const QUEUE = argv.queue;
const TOKEN = argv.token;
const web = new WebClient(TOKEN);
const queue = require('queue');
const q = queue({
    concurrency: 1,
    autostart: true
});

q.on('error', function(err, job){
    console.error(err);
});

router.post('/:command', function(req, res){
    let slash_command = req.params.command;

    helpers.getSlashCommands()
    .then(commands => {
        let command = commands[slash_command];
        if (!command) return res.json({error: 'command not found'});

        sendAckMsg(res, req.body, command);

        if (QUEUE) q.push(() => execute(req.body, command));
        else execute(req.body, command);
    })
    .catch(err => {
        console.error(err);
        res.json({error: err});
    });
});

let sendAckMsg = function(res, req, command){
    if (!command.ack_msg) return res.end();

    if (command.ack_msg_type == 'string'){
        res.send(command.ack_msg);
    
    } else if (command.ack_msg_type == 'file'){
        helpers.readFile(command.ack_msg)
        .then(msg => res.send(msg))
        .catch(err => {
            console.error(err);
            res.json({error: err});
        });
    
    } else {
        res.json({error: 'Unknown msg type: ' + command.ack_msg_type});
    }
};

let execute = function(req, command){
    return new Promise((acc, rej) => {
        let child = exec(command.script, {maxBuffer: 1024 * 1000}, function(err, stdout, stderr){
            if (err) return rej(err);
            acc();
        });

        child.stdout.on('data', function(data){
            console.log(data.toString()); 
        });
    })
    .then(() => sendCompletedMsg(req, command))
    .catch(err => {
        console.error(err);
        return postMessage(req.channel_id, err);
    })
};

let sendCompletedMsg = function(req, command){
    if (!command.completed_msg) return Promise.resolve();
    
    if (command.completed_msg_type == 'string'){
        return postMessage(req.channel_id, command.completed_msg);
        
    } else if (command.completed_msg_type == 'file'){
        return helpers.readFile(command.completed_msg)
        .catch(err => {
            console.error(err);
            return postMessage(req.channel_id, err);
        })
        .then(msg => postMessage(req.channel_id, msg))
        
    } else {
        return Promise.reject(new Error('Unknown msg type: ' + command.ack_msg_type));
    }
};

let postMessage = function(channel_id, msg){
    if (!channel_id) return Promise.reject(new Error(`invalid channel_id: ${channel_id}`));
    
    return web.chat.postMessage({
        channel: channel_id,
        text: msg
    })
    .catch(console.error);
}

module.exports = router;