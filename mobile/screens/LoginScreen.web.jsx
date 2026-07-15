import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Typography } from '../theme/typography';

// Required for web browser flow
WebBrowser.maybeCompleteAuthSession();

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen({ navigation }) {
  const { login, user } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigation.replace("MainTabs");
    }
  }, [user, navigation]);
  
  // NOTE: The user will need to replace this with their actual OAuth Client ID from Google Cloud Console.
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['openid', 'profile', 'email'],
      redirectUri: makeRedirectUri({
        scheme: 'nasaha-app'
      }),
    },
    googleDiscovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      setIsSigningIn(true);
      // Fetch user profile info from Google
      fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication.accessToken}` },
      })
        .then((res) => res.json())
        .then((userInfo) => {
          login(userInfo);
        })
        .catch((error) => console.error("Error fetching user info:", error))
        .finally(() => setIsSigningIn(false));
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    promptAsync();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#102E38', '#285D6C']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        {/* App Logo / Icon Placeholder */}
        <View style={styles.logoContainer}>
          <Ionicons name="book" size={70} color="#FDBA74" />
        </View>

        <Text style={[styles.title, Typography.h1]}>Nasaha</Text>
        <Text style={[styles.subtitle, Typography.body1]}>
          Welcome back! Sign in to continue exploring endless wisdom.
        </Text>

        <TouchableOpacity 
          style={[styles.googleButton, isSigningIn ? styles.buttonDisabled : null]}
          disabled={isSigningIn}
          onPress={handleGoogleSignIn}
        >
          {isSigningIn ? (
            <ActivityIndicator size="small" color="#285D6C" style={styles.googleIcon} />
          ) : (
            <Ionicons name="logo-google" size={24} color="#285D6C" style={styles.googleIcon} />
          )}
          <Text style={styles.buttonText}>
            {isSigningIn ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {/* Temporary mock login button if Google isn't setup yet */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.devButton}
            onPress={() => login({ name: 'Demo User', email: 'demo@nasaha.app', picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' })}
          >
            <Text style={styles.devButtonText}>Bypass Login (Dev Only)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 116, 0.3)', // Gold accent border
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(253, 186, 116, 0.5)',
  },
  title: {
    color: '#FDBA74', // Gold accent
    fontSize: 38,
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontFamily: 'Nunito_400Regular',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    justifyContent: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    
    
    
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#285D6C',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
  devButton: {
    marginTop: 24,
    padding: 12,
  },
  devButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
    fontFamily: 'Nunito_400Regular',
  }
});
