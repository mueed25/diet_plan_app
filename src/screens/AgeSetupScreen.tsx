// src/screens/AgeSetupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { supabase } from '../lib/superbase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { RouteProp } from '@react-navigation/native';

type AgeSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgeSetup'>;
  route: RouteProp<RootStackParamList, 'AgeSetup'>;
};

export default function AgeSetupScreen({ navigation, route }: AgeSetupScreenProps) {
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveAge = async () => {
    const ageNumber = parseInt(age);
    
    if (!age || isNaN(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age (1-120)');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No user found');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          age: ageNumber,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Navigation will be handled by the auth state change listener
    } catch (error) {
      console.error('Error saving age:', error);
      Alert.alert('Error', 'Failed to save age. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us your age</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your experience
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholderTextColor="#999"
            maxLength={3}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSaveAge}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    width: 120,
  },
  button: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});