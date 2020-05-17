import * as io from 'socket.io-client';
export const socket = io('wss://le-18262636.bitzonte.com', {
    path: '/stocks'
  });