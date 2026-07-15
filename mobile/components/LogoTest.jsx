// Test file to verify NasahaLogo component
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

export default function LogoTest() {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={{ width: 160, height: 160 }} resizeMode="contain" />
      <Image source={require('../assets/logo.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
      <Image source={require('../assets/logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#285D6C',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
});
