'use strict';

export default function (socket, io) {
  //有人上线
  //
  socket.on('online', (data) => {
    //将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
    //
    socket.name = data.user;
    //global.users 对象中不存在该用户名则插入该用户名
    //
    if (!global.users[data.user]) { global.users[data.user] = data.user; }
    //向所有用户广播该用户上线信息
    //
    io.sockets.emit('online', {users: global.users, user: data.user});
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
    //若 global.users 对象中保存了该用户名
    //
    if (global.users[socket.name]) {
      //从 global.users 对象中删除该用户名
      //
      delete global.users[socket.name];
      //向其他所有用户广播该用户下线信息
      //
      socket.broadcast.emit('offline', {users: global.users, user: socket.name});
    }
  });
}
