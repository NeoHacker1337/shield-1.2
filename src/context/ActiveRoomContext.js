// src/context/ActiveRoomContext.js
import React, { createContext, useContext, useState, useRef } from 'react';

// ✅ MUST be exported as named export
const ActiveRoomContext = createContext(null);

export const ActiveRoomProvider = ({ children }) => {
    const [activeRoomId, setActiveRoomId] = useState(null);
    const watchedRoomsRef                 = useRef(new Set());

    const setActiveRoom = (roomId) => {
        if (roomId) {
            setActiveRoomId(String(roomId));
            watchedRoomsRef.current.add(String(roomId));
        }
    };

    const clearActiveRoom = () => {
        setActiveRoomId(null);
    };

    const watchRooms = (roomIds = []) => {
        roomIds.forEach(id => {
            if (id) watchedRoomsRef.current.add(String(id));
        });
    };

    const getWatchedRooms = () => Array.from(watchedRoomsRef.current);

    return (
        <ActiveRoomContext.Provider value={{
            activeRoomId,
            setActiveRoom,
            clearActiveRoom,
            watchRooms,
            getWatchedRooms,
        }}>
            {children}
        </ActiveRoomContext.Provider>
    );
};

// ✅ MUST be exported as named export — this is what ChatScreen uses
export const useActiveRoom = () => {
    const context = useContext(ActiveRoomContext);

    // ✅ Helpful error if used outside provider
    if (!context) {
        throw new Error('useActiveRoom must be used inside <ActiveRoomProvider>');
    }

    return context;
};