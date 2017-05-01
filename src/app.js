'use strict';
import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';

import http from 'http';
import path from 'path';
import log4js from 'log4js';
import socketIo from 'socket.io';

import logger from './libs/logger';
import sockets from './sockets';

let app = express();

app.set('port', process.env.PORT || 3000);
app.set('views',path.join(__dirname, '../views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(methodOverride((req) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    let method = req.body._method;
    delete req.body._method;
    return method;
  }
}));
app.use(log4js.connectLogger(logger, {level:'debug', format:':method :url'}));

// 存储在线用户列表的对象
// 防止相同用户名的用户登入
// 当前简单的放在内存里，实际项目根据具体持久化方案判断
//
global.users = {};

app.get('/', (req, res) => {
  if (req.cookies.user == null) {
    res.redirect('/signin');
  } else {
    res.render('index');
  }
});

app.get('/signin', (req, res) => {
  res.render('signin');
});

app.post('/signin', (req, res) => {
  if (global.users[req.body.name]) {
    //存在，则不允许登陆
    //
    res.redirect('/signin');
  } else {
    //不存在，把用户名存入 cookie 并跳转到主页
    //
    res.cookie('user', req.body.name, {maxAge: 1000*60*60*24*30});
    res.redirect('/');
  }
});

let server = http.createServer(app);

let io = socketIo.listen(server);

io.sockets.on('connection', (socket) => {
  sockets(socket, io);
});

server.listen(app.get('port'), () => {
  logger.info('Express server listening on port ' + app.get('port'));
});
