import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Linking, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TABS = ['media', 'links', 'docs'];

const isMediaMessage = (m) => {
  const url = (m?.file_url || '').toLowerCase();
  const type = (m?.file_type || m?.type || '').toLowerCase();
  return (
    type === 'image' || type === 'video' || type === 'audio' ||
    /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|mp3|wav|aac|m4a)$/.test(url)
  );
};

const isDocMessage = (m) => {
  const url = (m?.file_url || '').toLowerCase();
  const type = (m?.file_type || m?.type || '').toLowerCase();
  return (
    type === 'file' || type === 'document' ||
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/.test(url)
  );
};

const extractLinks = (text = '') => {
  const matches = String(text).match(/https?:\/\/[^\s]+/g);
  return matches || [];
};

const MediaLinksDocsScreen = ({ navigation, route }) => {
  const messages = route.params?.messages || [];
  const title = route.params?.title || 'Media, Links & Docs';
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'media');

  const { mediaItems, linkItems, docItems } = useMemo(() => {
    const media = [];
    const links = [];
    const docs = [];
    messages.forEach((m) => {
      if (isMediaMessage(m)) media.push(m);
      if (isDocMessage(m)) docs.push(m);
      extractLinks(m?.content || m?.message || m?.text || m?.body || '').forEach((url) => {
        links.push({ id: `${m.id}-${url}`, url, message: m });
      });
    });
    return { mediaItems: media, linkItems: links, docItems: docs };
  }, [messages]);

  const data = activeTab === 'media' ? mediaItems : activeTab === 'links' ? linkItems : docItems;

  return (
    <View style={{ flex: 1, backgroundColor: '#ECE5DD' }}>
      <View style={{ backgroundColor: '#075E54', padding: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{title}</Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#fff' }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={{ flex: 1, padding: 12, borderBottomWidth: 2, borderBottomColor: activeTab === t ? '#075E54' : 'transparent' }}>
            <Text style={{ textAlign: 'center', color: activeTab === t ? '#075E54' : '#777', fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, i) => String(item?.id || i)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 28 }}>No {activeTab} found</Text>}
        renderItem={({ item }) => {
          if (activeTab === 'links') {
            return (
              <TouchableOpacity onPress={() => Linking.openURL(item.url)} style={{ backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 10 }}>
                <Text style={{ color: '#0A66C2' }}>{item.url}</Text>
              </TouchableOpacity>
            );
          }
          const fileUrl = item?.file_url || '';
          const fileName = item?.file_name || fileUrl.split('/').pop() || 'File';
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
          return (
            <View style={{ backgroundColor: '#fff', padding: 10, marginBottom: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
              {isImage ? (
                <Image source={{ uri: fileUrl }} style={{ width: 48, height: 48, borderRadius: 6, marginRight: 10 }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 6, marginRight: 10, backgroundColor: '#E7F3F1', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={activeTab === 'media' ? 'perm-media' : 'insert-drive-file'} size={22} color="#075E54" />
                </View>
              )}
              <Text numberOfLines={1} style={{ flex: 1, color: '#222' }}>{fileName}</Text>
            </View>
          );
        }}
      />
    </View>
  );
};

export default MediaLinksDocsScreen;
