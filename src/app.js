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

//存储在线用户列表的对象
//
let users = {};

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
  if (users[req.body.name]) {
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
  //有人上线
  //
  socket.on('online', (data) => {
    //将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
    //
    socket.name = data.user;
    //users 对象中不存在该用户名则插入该用户名
    //
    if (!users[data.user]) { users[data.user] = data.user; }
    //向所有用户广播该用户上线信息
    //
    io.sockets.emit('online', {users: users, user: data.user});
  });

  //有人发话
  //
  socket.on('say', (data) => {
    if (data.to == 'all') {
      //向其他所有用户广播该用户发话信息
      //
      socket.broadcast.emit('say', data);
    } else {
      //向特定用户发送该用户发话信息
      //clients 为存储所有连接对象的数组
      //
      // let clients = io.sockets.clients();
      let clients = io.sockets.sockets;
      //遍历找到该用户
      //
      for(let key in clients ) {
        //触发该用户客户端的 say 事件
        //
        if (clients[key].name == data.to) { clients[key].emit('say', data); }
      }
    }
  });

  //有人下线
  //
  socket.on('disconnect', () => {
    //若 users 对象中保存了该用户名
    //
    if (users[socket.name]) {
      //从 users 对象中删除该用户名
      //
      delete users[socket.name];
      //向其他所有用户广播该用户下线信息
      //
      socket.broadcast.emit('offline', {users: users, user: socket.name});
    }
  });
});

server.listen(app.get('port'), () => {
  logger.info('Express server listening on port ' + app.get('port'));
});
