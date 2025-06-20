import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface FollowUpOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  apiValue: string;
}

const followUpOptions: FollowUpOption[] = [
  { id: 'calories', label: 'Calories', icon: 'flame-outline', apiValue: 'calories' },
  { id: 'diabetic', label: 'Diabetic Friendly', icon: 'medical-outline', apiValue: 'diabetic_friendly' },
  { id: 'preparation', label: 'Preparation Method', icon: 'restaurant-outline', apiValue: 'preparation_method' },
  { id: 'ingredients', label: 'Ingredients', icon: 'list-outline', apiValue: 'ingredients' },
  { id: 'nutritional', label: 'Nutritional Content', icon: 'nutrition-outline', apiValue: 'nutritional_content' },
  { id: 'allergen', label: 'Allergen Info', icon: 'warning-outline', apiValue: 'allergen_info' },
  { id: 'hypertension', label: 'Hypertension Guidelines', icon: 'heart-outline', apiValue: 'hypertension_friendly' },
  { id: 'kidney', label: 'Kidney Safe', icon: 'water-outline', apiValue: 'kidney_safe' },
];

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface FoodDetectionResponse {
  food_name: string;
  options: string[];
}

interface FoodInfoResponse {
  food_name: string;
  info_type: string;
  response: string;
}

const HomeScreenContent = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);
  const [detectionResponse, setDetectionResponse] = useState<FoodDetectionResponse | null>(null);
  const [followUpInfo, setFollowUpInfo] = useState<FoodInfoResponse | null>(null);
  const [error, setError] = useState<string>('');

  const requestPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'We need gallery permissions to select images. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => console.log('Open settings') }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
      return false;
    }
  };

  const requestCameraPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required', 
          'We need camera permissions to take photos. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => console.log('Open settings') }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission request failed:', error);
      Alert.alert('Error', 'Failed to request camera permissions. Please try again.');
      return false;
    }
  };

  const pickImage = async () => {
    try {
      Alert.alert(
        'Select Image', 
        'Choose how you want to add an image',
        [
          { 
            text: 'Take Photo', 
            onPress: () => openCamera(),
            style: 'default'
          },
          { 
            text: 'Choose from Gallery', 
            onPress: () => openGallery(),
            style: 'default'
          },
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Failed to open camera. Please try again or use gallery instead.');
    }
  };

  const openGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await handleImageSelection(result.assets[0]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Gallery Error', 'Failed to open gallery. Please try again or use camera instead.');
    }
  };

  const handleImageSelection = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setSelectedImage(asset.uri);
      setImageAsset(asset);
      resetState();
    } catch (error) {
      console.error('Image selection handling failed:', error);
      Alert.alert('Image Processing Error', 'Failed to process the selected image. Please try selecting a different image.');
      setSelectedImage(null);
      setImageAsset(null);
    }
  };

  const resetState = () => {
    setLoadingState('idle');
    setDetectionResponse(null);
    setFollowUpInfo(null);
    setError('');
    setFollowUpLoading(null);
  };

  const sendImageToAPI = async () => {
    if (!selectedImage || !imageAsset) {
      Alert.alert('No Image Selected', 'Please select an image first by tapping the upload area.');
      return;
    }

    setLoadingState('loading');
    setError('');
    setFollowUpInfo(null);

    try {
      const formData = new FormData();
      
      let fileName = imageAsset.fileName || 'image.jpg';
      let mimeType = imageAsset.type === 'image' ? 'image/jpeg' : (imageAsset.type || 'image/jpeg');
      
      if (!fileName.includes('.')) {
        fileName = fileName + '.jpg';
      }
      
      formData.append('image', {
        uri: imageAsset.uri,
        type: mimeType,
        name: fileName,
      } as any);
      
      formData.append('lang', 'english');

      const apiResponse = await fetch('https://foodvision-fcsf.onrender.com/detect_food', {
        method: 'POST',
        body: formData,
      });

      const responseText = await apiResponse.text();
      
      if (!apiResponse.ok) {
        let errorMessage = `API Error (${apiResponse.status})`;
        
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.detail) {
            if (Array.isArray(errorJson.detail)) {
              errorMessage = errorJson.detail.map((d: any) => `${d.loc?.join('.')} - ${d.msg}`).join(', ');
            } else {
              errorMessage = errorJson.detail;
            }
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          errorMessage = responseText || 'Unknown API error';
        }
        
        throw new Error(errorMessage);
      }

      let result: FoodDetectionResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid response format from server');
      }
      
      if (!result.food_name) {
        throw new Error('No food detected in the image. Please try a clearer image with visible food items.');
      }

      setDetectionResponse(result);
      setLoadingState('success');

    } catch (err) {
      console.error('Detection failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes('422') || errorMessage.includes('Field required') || errorMessage.includes('missing')) {
        userFriendlyMessage = 'Image data validation failed. Please try:\n• Taking a new photo\n• Selecting a different image\n• Ensuring the image is not corrupted';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Network connection error. Please:\n• Check your internet connection\n• Try again in a few moments\n• Make sure you have a stable connection';
      } else if (errorMessage.includes('No food detected')) {
        userFriendlyMessage = errorMessage + '\n\nTips for better detection:\n• Ensure good lighting\n• Center the food in the frame\n• Use a clear, focused image\n• Make sure food is clearly visible';
      }
      
      setError(userFriendlyMessage);
      setLoadingState('error');
    }
  };

  const handleFollowUp = async (option: FollowUpOption) => {
    if (!detectionResponse?.food_name) {
      Alert.alert('Error', 'No food detected yet. Please detect food first.');
      return;
    }

    setFollowUpLoading(option.id);
    setFollowUpInfo(null);

    try {
      const requestBody = {
        food_name: detectionResponse.food_name,
        info_type: option.apiValue
      };

      const apiResponse = await fetch('https://foodvision-fcsf.onrender.com/food_info', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await apiResponse.text();
      
      if (!apiResponse.ok) {
        throw new Error(`${apiResponse.status}: ${responseText || 'Unknown error'}`);
      }

      const result: FoodInfoResponse = JSON.parse(responseText);
      setFollowUpInfo(result);
      
    } catch (err) {
      console.error('Follow-up failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Information Error', `Failed to get ${option.label.toLowerCase()} information. Please try again.\n\nError: ${errorMessage}`);
    } finally {
      setFollowUpLoading(null);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const renderImageSection = () => (
    <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
      {selectedImage ? (
        <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
      ) : (
        <View style={styles.uploadPlaceholder}>
          <Ionicons name="camera-outline" size={48} color="#667eea" />
          <Text style={styles.uploadText}>Snap / Upload Food Image</Text>
          <Text style={styles.uploadSubtext}>to instantly identify it and get detailed imformation</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSendButton = () => (
    <TouchableOpacity
      style={[
        styles.sendButton,
        (!selectedImage || !imageAsset) && styles.sendButtonDisabled,
        loadingState === 'loading' && styles.sendButtonLoading,
      ]}
      onPress={sendImageToAPI}
      disabled={!selectedImage || !imageAsset || loadingState === 'loading'}
    >
      {loadingState === 'loading' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="white" size="small" />
          <Text style={styles.loadingButtonText}>Detecting...</Text>
        </View>
      ) : (
        <Text style={styles.sendButtonText}>
          🔍 {selectedImage && imageAsset ? 'Detect Food' : 'Select Image First'}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderOutputSection = () => {

    if (selectedImage && !imageAsset) {
      return (
        <View style={styles.outputSection}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Processing image...</Text>
          <Text style={styles.loadingSubtext}>Preparing image data</Text>
        </View>
      );
    }

    if (loadingState === 'loading') {
      return (
        <View style={styles.outputSection}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Analyzing your food image...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      );
    }

    if (loadingState === 'error') {
      return (
        <View style={styles.outputSection}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={sendImageToAPI}>
            <Text style={styles.retryButtonText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loadingState === 'success' && detectionResponse) {
      return (
        <View style={styles.outputSection}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
          <Text style={styles.resultLabel}>Food Detected:</Text>
          <Text style={styles.resultText}>{detectionResponse.food_name}</Text>
        </View>
      );
    }

    return null;
  };

  const renderFollowUpSection = () => {
    if (loadingState !== 'success' || !detectionResponse) return null;

    return (
      <View style={styles.followUpSection}>
        <Text style={styles.followUpTitle}>
          What would you like to know about "{detectionResponse.food_name}"?
        </Text>
        <View style={styles.followUpGrid}>
          {followUpOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.followUpButton,
                followUpLoading === option.id && styles.followUpButtonLoading,
              ]}
              onPress={() => handleFollowUp(option)}
              disabled={!!followUpLoading}
            >
              {followUpLoading === option.id ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Ionicons name={option.icon} size={24} color="#667eea" />
              )}
              <Text style={styles.followUpButtonText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFollowUpInfo = () => {
    if (!followUpInfo) return null;

    return (
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>
          {followUpOptions.find(opt => opt.apiValue === followUpInfo.info_type)?.label || followUpInfo.info_type}
        </Text>
        <Text style={styles.infoText}>{followUpInfo.response}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="white" 
        translucent={false}
      />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>🍽️ Food Vision</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderImageSection()}
        {renderSendButton()}
        {renderOutputSection()}
        {renderFollowUpSection()}
        {renderFollowUpInfo()}
      </ScrollView>
    </View>
  );
};

export default function HomeScreen() {
  return (
    <SafeAreaProvider>
      <HomeScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  imageUploadBox: {
    width: '100%',
    height: height * 0.25,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 12,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  sendButtonLoading: {
    backgroundColor: '#5a6fd8',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outputSection: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  outputPlaceholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  outputSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#667eea',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 20,
    color: '#667eea',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  followUpSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  followUpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  followUpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  followUpButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 85,
    justifyContent: 'center',
  },
  followUpButtonLoading: {
    backgroundColor: '#f0f0f0',
  },
  followUpButtonText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});