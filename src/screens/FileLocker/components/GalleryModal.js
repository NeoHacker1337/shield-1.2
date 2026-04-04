import React from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const GalleryModal = ({ visible, images, onClose, onOpen }) => {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 50 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>
            Gallery (DCIM)
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {images.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#888', fontSize: 16 }}>No images</Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.path}
            numColumns={3}
            contentContainerStyle={{ padding: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ flex: 1 / 3, aspectRatio: 1, margin: 2 }}
                onPress={() => onOpen(item)}
              >
                <Image
                  source={{ uri: `file://${item.path}` }}
                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

export default GalleryModal;