import React from 'react';
import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './screens/SplashScreen';
import AppNavigator from './navigation/AppNavigator';
import { FavoritesProvider } from './context/FavoritesContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <FavoritesProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="MainTabs" component={AppNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </FavoritesProvider>
  );
}
