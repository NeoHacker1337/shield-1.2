import { useState } from 'react';
import chatService from '../../../services/chatService';
import { handleApiError } from '../../../utils/errorHandler';

const useSendMessage = ({ chatRoom, currentUser, setMessages, lastMessageIdRef }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  // ── Send text message ──────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || isSending || !chatRoom?.id) return;

    setIsSending(true);

    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}`;

    // Optimistic temp message — shown instantly before API confirms
    const tempMessage = {
      id: tempId,
      content: messageContent,
      type: 'text',
      user_id: currentUser?.id,
      sender: {
        name: currentUser?.name || 'You',
        id: currentUser?.id,
      },
      created_at: new Date().toISOString(),
      sending: true,
    };

    // Clear input immediately for better UX
    setNewMessage('');

    // Append temp message at the END (ASC order — newest at bottom)
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await chatService.sendMessage(chatRoom.id, {
        content: messageContent,
        type: 'text',
        user_id: currentUser?.id,
      });

      const sentMessage = response?.data;

      // Replace temp message with the real confirmed message from API
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempId);

        if (sentMessage) {
          const messageToAdd = {
            ...sentMessage,
            sender:
              sentMessage.sender || {
                name: currentUser?.name || 'You',
                id: currentUser?.id,
              },
          };

          // Update last known message ID for polling reference
          lastMessageIdRef.current = messageToAdd.id;

          return [...filtered, messageToAdd];
        }

        return filtered;
      });
    } catch (error) {
      // On failure: remove temp message and restore input text
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageContent);
      handleApiError(error, 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // ── Send file / image / video / document ───────────────────────
  const handleSendFile = async (payload, type) => {
    if (!chatRoom?.id) return;

    console.log('Payload:', payload);

    const tempId = `temp_${Date.now()}`;

    // Map attachment type to message type
    let mappedType = 'file';
    if (type === 'gallery' || type === 'camera') {
      mappedType = payload.type?.startsWith('video') ? 'video' : 'image';
    } else if (type === 'document') {
      mappedType = 'file';
    }

    // Build file object for FormData
    const file = {
      uri: payload.uri,
      name: payload.name || `file_${Date.now()}`,
      type: payload.type || 'application/octet-stream',
    };

    // Optimistic temp message — shows local URI while uploading
    const tempMessage = {
      id: tempId,
      type: mappedType,
      file_url: payload.uri,
      file_name: file.name,
      created_at: new Date().toISOString(),
      user_id: currentUser?.id,
      sending: true,
    };

    // Append temp message immediately
    setMessages((prev) => [...prev, tempMessage]);

    // Mark file as uploading and init progress at 0
    setUploadingFiles((prev) => ({ ...prev, [tempId]: true }));
    setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', mappedType);
      formData.append('user_id', currentUser?.id);

      const response = await chatService.sendMessage(chatRoom.id, formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;

          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          console.log('Upload Progress:', percent);

          // Update progress percentage for this specific upload
          setUploadProgress((prev) => ({ ...prev, [tempId]: percent }));
        },
      });

      const sentMessage = response?.data;

      // Replace temp message with real server-confirmed message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempId);
        return [...filtered, sentMessage];
      });
    } catch (error) {
      console.log('Upload error:', error);
      // On failure: silently remove the temp message
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      // Always clean up uploading state and progress for this tempId
      setUploadingFiles((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
    }
  };

  return {
    // State
    newMessage,
    setNewMessage,
    isSending,
    uploadProgress,
    uploadingFiles,
    // Actions
    handleSend,
    handleSendFile,
  };
};

export default useSendMessage;