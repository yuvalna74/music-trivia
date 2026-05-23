import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string, code: string): Socket {
  if (socket?.connected) socket.disconnect();

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:8080', {
    auth: { token, code },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
