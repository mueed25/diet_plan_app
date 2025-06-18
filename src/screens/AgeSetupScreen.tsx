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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    
    if (!age || isNaN(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age (13-120)');
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
        console.error('Supabase error:', error);
        throw error;
      }

      Alert.alert('Success', 'Profile setup complete!', [
        {
          text: 'Continue',
          onPress: () => {
            // Navigation will be handled by auth state listener
          }
        }
      ]);

    } catch (error) {
      console.error('Error saving age:', error);
      Alert.alert('Error', 'Failed to save age. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={48} color="#2D5016" />
            </View>
            <Text style={styles.title}>Tell us your age</Text>
            <Text style={styles.subtitle}>
              This helps us personalize your nutritional recommendations
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Your Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholderTextColor="#999999"
                maxLength={3}
              />
              <Text style={styles.inputHint}>Age must be between 13-120 years</Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, (!age || loading) && styles.primaryButtonDisabled]}
              onPress={handleSaveAge}
              disabled={loading || !age}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Saving...' : 'Continue'}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
              )}
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step 1 of 1</Text>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  title: {
    fontSize: 28,
    color: '#1a1a1a',
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
    fontWeight: '400',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    fontSize: 24,
    color: '#1a1a1a',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F5E8',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontWeight: '400',
  },
  buttonContainer: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2D5016',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  progressContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D5016',
    borderRadius: 2,
  },
});