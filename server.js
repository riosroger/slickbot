
const argv = require('minimist')(process.argv.slice(2));
const port = parseInt(argv.p || argv.port || process.env.SLICKBOT_PORT);
const token = argv.t || argv.token || process.env.SLICKBOT_TOKEN;
if (isNaN(port)) throw new Error('invalid --port');
if (!token) throw new Error('invalid --token');

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();
const server = http.createServer(app);

//configure express
app.use(helmet());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', require('./router.js'));

//start express
server.listen(port, function(){
  console.log('Server is listening on port '+ port);
});