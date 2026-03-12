import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Animated } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import MethaliScreen from "../screens/MethaliScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import MakalaScreen from "../screens/MakalaScreen";
import ArticleDetailScreen from "../screens/ArticleDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Makala Stack Navigator
function MakalaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MakalaMain" component={MakalaScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const IconWithAnimation = ({ name, color, size, focused }) => {
    const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
    const opacity = useRef(new Animated.Value(focused ? 1 : 0.85)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: focused ? 1.1 : 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacity, {
          toValue: focused ? 1 : 0.85,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }, [focused, scale, opacity]);

    return (
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Ionicons name={name} color={color} size={size} />
      </Animated.View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#B4EC51",
        tabBarInactiveTintColor: "#C7D3D4",
        tabBarHideOnKeyboard: true,
        tabBarStyle: { 
          backgroundColor: "#285D6C", 
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Nasaha",
          tabBarIcon: ({ color, size, focused }) => (
            <IconWithAnimation name="book" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Methali"
        component={MethaliScreen}
        options={{
          tabBarLabel: "Methali",
          tabBarIcon: ({ color, size, focused }) => (
            <IconWithAnimation name="library" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: "Favoriti",
          tabBarIcon: ({ color, size, focused }) => (
            <IconWithAnimation name="heart" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MakalaStack"
        component={MakalaStack}
        options={{
          tabBarLabel: "Makala",
          tabBarIcon: ({ color, size, focused }) => (
            <IconWithAnimation name="newspaper" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Wasifu",
          tabBarIcon: ({ color, size, focused }) => (
            <IconWithAnimation name="person" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
