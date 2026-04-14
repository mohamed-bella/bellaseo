import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL || '';
    socket = url ? io(url) : io();
  }
  return socket;
};
