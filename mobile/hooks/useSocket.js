// hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../config";

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("Socket conectado:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("Socket desconectado");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return { socket: socketRef.current, connected, emit, on, off };
}
