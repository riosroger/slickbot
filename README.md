# slickbot

This command line tool creates an http server that listens for Slack Slash Commands (https://api.slack.com/slash-commands) and executes the configured shell command.

Slickbot allows you to listen to as many commands as you want. It allows you to specify an "acknowledgement" message when a command is received and a "completed" message for after the command is finished.

All configuration can be done on the command line tool.


### Installing

`npm install slickbot -g`

## Usage

`slickbot [options] [command]`

Options:

    -V, --version         output the version number
    -p, --port <number>   port number or the environment variable SLICKBOT_PORT.
    -t, --token <string>  slack token or the environment variable SLICKBOT_TOKEN.
    -q, --queue           if jobs should be put on a queue or set SLICKBOT_QUEUE=true.
    -h, --help            output usage information

  Commands:

    start [options]       starts slickbot.
    stop                  stops slickbot.
    add                   adds a slash command.
    remove <string>       removes the specified slash command.
    status                displays if slickbot is running.
    list                  displays the list of saved slash commands.
    tail                  tails the log.
