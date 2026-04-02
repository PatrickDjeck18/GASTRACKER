import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize } from '../constants/theme';

export default function PrivacyPolicyScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const navigation = useNavigation();

  const sections = [
    {
      title: 'Information We Collect',
      icon: 'database-outline',
      content: 'We only collect essential data to provide fuel price information. This includes your device model, operating system version, and general usage statistics which are anonymized.',
    },
    {
      title: 'Location Services',
      icon: 'map-marker-radius-outline',
      content: 'To find nearby fuel stations, we request access to your location. This data is processed on your device or sent securely to our mapping providers (TomTom/Apple Maps). We do not store your exact location history on our servers.',
    },
    {
      title: 'Third-Party Services',
      icon: 'cloud-outline',
      content: 'We use TomTom APIs to provide station data and mapping. We also use Google AdMob for advertising, which may collect device identifiers and usage data to serve relevant ads.',
    },
    {
      title: 'Data Security',
      icon: 'shield-lock-outline',
      content: 'We take data protection seriously and implement industry-standard security measures to protect any information collected through the app.',
    },
    {
      title: 'Updates to Policy',
      icon: 'update',
      content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: thm.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: thm.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: isDark ? Colors.dark.surface : '#FFF' }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={thm.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: thm.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introContainer}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primaryGlow }]}>
            <MaterialCommunityIcons name="shield-check" size={40} color={Colors.primary} />
          </View>
          <Text style={[styles.title, { color: thm.text }]}>Your Privacy Matters</Text>
          <Text style={[styles.subtitle, { color: thm.textSecondary }]}>
            Last Updated: March 30, 2026
          </Text>
          <Text style={[styles.introText, { color: thm.textSecondary }]}>
            Thank you for using Fuel Price New. We are committed to protecting your personal information and your right to privacy.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View 
            key={index} 
            style={[
              styles.sectionCard, 
              { 
                backgroundColor: thm.surface, 
                borderColor: thm.border,
                shadowColor: isDark ? '#000' : '#E2E8F0'
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.primaryMuted }]}>
                <MaterialCommunityIcons name={section.icon} size={22} color={Colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: thm.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: thm.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: thm.textMuted }]}>
            If you have any questions, please contact us at support@fuelprice.global
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },
  introContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },
  introText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  sectionContent: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
