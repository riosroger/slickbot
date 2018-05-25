'use strict';
const router = require('express').Router();
const fs = require('fs');
const { exec } = require('child_process');
const { WebClient, IncomingWebhook } = require('@slack/client');
const helpers = require('./helpers.js');
const argv = require('minimist')(process.argv.slice(2));
const token = argv.t || argv.token;
const web = new WebClient(token);
let isBuilding = false;

router.post('/:command', function(req, res){
    let slash_command = req.params.command;

    helpers.getSlashCommands()
    .then(commands => {
        let command = commands[slash_command];
        if (!command) return res.json({error: 'command not found'});

        sendAckMsg(res, req.body, command);
        execute(req.body, command);
    })
    .catch(err => {
        console.error(err);
        res.json({error: err});
    });
});

let sendAckMsg = function(res, req, command){
    if (command.ack_msg){
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

    } else {
        res.end();
    }
};

let execute = function(req, command){
    let child = exec(command.script, function(err, stdout, stderr){
        if (err){
            console.error(err);
            postMessage(req.channel_id, err);

        } else {
            sendCompletedMsg(req, command);
        }
    });

    child.stdout.on('data', function(data){
        console.log(data.toString()); 
    });
};

let sendCompletedMsg = function(req, command){
    if (!command.completed_msg) return;
    
    if (command.completed_msg_type == 'string'){
        postMessage(req.channel_id, command.completed_msg);
        
    } else if (command.completed_msg_type == 'file'){
        helpers.readFile(command.completed_msg)
        .catch(err => {
            console.error(err);
            return postMessage(req.channel_id, err);
        })
        .then(msg => postMessage(req.channel_id, msg))
        
    } else {
        console.error('Unknown msg type: ' + command.ack_msg_type);
    }
};

let postMessage = function(channel_id, msg){
    if (!channel_id) return console.error(`invalid channel_id: ${channel_id}`);
    
    return web.chat.postMessage({
        channel: channel_id,
        text: msg
    })
    .catch(console.error);
}

module.exports = router;