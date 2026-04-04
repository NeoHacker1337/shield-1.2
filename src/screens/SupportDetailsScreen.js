import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL } from '../utils/config';

const { width } = Dimensions.get('window');

const SupportDetailsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [support, setSupport] = useState(null);

  useEffect(() => {
    fetchSupportDetails();
  }, []);

  const fetchSupportDetails = async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/support-details`);
      const json = await response.json();

      if (json?.status) {
        setSupport(json.data);
      }
    } catch (error) {
      console.error('Support API error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading support details...</Text>
        </View>
      </View>
    );
  }

  if (!support) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <View style={styles.center}>
          <View style={styles.errorIconContainer}>
            <Icon name="error-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>Unable to load support details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSupportDetails}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="headset-mic" size={32} color="#ffffff" />
          </View>
          <Text style={styles.title}>{support.title || 'Support Center'}</Text>
          {support.description && (
            <Text style={styles.description}>{support.description}</Text>
          )}
        </View>

        {/* Contact Cards */}
        <View style={styles.cardsContainer}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <SupportCard
            icon="phone"
            label="Helpline Number"
            value={support.phone}
            color="#10b981"
            onPress={() => Linking.openURL(`tel:${support.phone}`)}
            actionLabel="Call Now"
          />

          <SupportCard
            icon="email"
            label="Email Support"
            value={support.email}
            color="#f59e0b"
            onPress={() => Linking.openURL(`mailto:${support.email}`)}
            actionLabel="Send Email"
          />

          <SupportCard
            icon="chat"
            label="WhatsApp"
            value={support.whatsapp}
            color="#22c55e"
            onPress={() => {
              const cleanNumber = support.whatsapp?.replace(/\D/g, '');
              Linking.openURL(`https://wa.me/${cleanNumber}`);
            }}
            actionLabel="Chat Now"
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Visit Us</Text>
          
          <InfoRow
            icon="location-on"
            label="Office Address"
            value={support.address}
          />

          <InfoRow
            icon="schedule"
            label="Working Hours"
            value={support.working_hours}
            highlight
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>We're here to help you 24/7</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// Interactive Contact Card Component
const SupportCard = ({ icon, label, value, color, onPress, actionLabel }) => (
  <TouchableOpacity 
    style={[styles.card, { borderLeftColor: color }]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.cardContent}>
      <View style={[styles.cardIcon, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
    </View>
    <View style={[styles.actionBadge, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.actionText, { color }]}>{actionLabel}</Text>
      <Icon name="arrow-forward-ios" size={12} color={color} />
    </View>
  </TouchableOpacity>
);

// Static Info Row Component
const InfoRow = ({ icon, label, value, highlight }) => (
  <View style={[styles.infoCard, highlight && styles.highlightCard]}>
    <View style={styles.infoIconContainer}>
      <Icon name={icon} size={22} color={highlight ? '#6366f1' : '#94a3b8'} />
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.highlightText]}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Loading Styles
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Error Styles
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Header Styles
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 24,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Section Styles
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoContainer: {
    paddingHorizontal: 20,
  },

  // Card Styles
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Info Row Styles
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  highlightCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 22,
    fontWeight: '500',
  },
  highlightText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Footer
  footer: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
});

export default SupportDetailsScreen;