import React from 'react';
import { View, Animated } from 'react-native';
import styles from '../../assets/SecurityScreenStyles';

const PasscodeDots = ({ value, shakeAnim }) => {

  return (
    <Animated.View
      style={[
        styles.passcodeDotsContainer,
        { transform: [{ translateX: shakeAnim }] }
      ]}
    >

      {[...Array(6)].map((_, index) => (
        <View
          key={index}
          style={[
            styles.passcodeDot,
            value.length > index && {
              backgroundColor: '#6C63FF',
              borderColor: '#6C63FF'
            }
          ]}
          
        />
        
      ))}

    </Animated.View>
  );
};

export default PasscodeDots;
