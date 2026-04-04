import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from '../../assets/SecurityScreenStyles';

const NumericKeypad = ({ currentValue, onInput }) => {

  const handleKeyPress = (key) => {
    if (key === 'backspace') {
      onInput(currentValue.slice(0, -1));
      return;
    }

    if (currentValue.length < 6) {
      onInput(currentValue + key);
    }
  };

  return (
    <View style={styles.keypadContainer}>

      {/* Row 1 */}
      <View style={styles.keypadRow}>
        {['1', '2', '3'].map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.keypadButton}
            onPress={() => handleKeyPress(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.keypadButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 2 */}
      <View style={styles.keypadRow}>
        {['4', '5', '6'].map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.keypadButton}
            onPress={() => handleKeyPress(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.keypadButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 3 */}
      <View style={styles.keypadRow}>
        {['7', '8', '9'].map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.keypadButton}
            onPress={() => handleKeyPress(key)}
            activeOpacity={0.8}
          >
            <Text style={styles.keypadButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 4 */}
      <View style={styles.keypadRow}>

        <TouchableOpacity
          style={[styles.keypadButton, { opacity: 0 }]}
          disabled
        />

        <TouchableOpacity
          style={styles.keypadButton}
          onPress={() => handleKeyPress('0')}
          activeOpacity={0.8}
        >
          <Text style={styles.keypadButtonText}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keypadButton}
          onPress={() => handleKeyPress('backspace')}
          activeOpacity={0.8}
        >
          <Icon name="backspace" size={22} color="#fff" />
        </TouchableOpacity>

      </View>

    </View>
  );
};

export default NumericKeypad;
