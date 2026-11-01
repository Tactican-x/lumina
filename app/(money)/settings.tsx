import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing } from '@/constants/theme';
import { useCurrencyStore, CURRENCIES, type CurrencyCode } from '@/stores/currencyStore';
import { exportTransactions, getExportStats, exportMoneyPdf } from '@/lib/money/exportData';

export default function MoneySettings() {
  const { currencyCode, setCurrency, getCurrency } = useCurrencyStore();
  const currentCurrency = getCurrency();

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [exportStats, setExportStats] = useState<{
    totalTransactions: number;
    totalCategories: number;
    dateRange: { start: string; end: string } | null;
  } | null>(null);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const handleCurrencySelect = (code: CurrencyCode) => {
    setCurrency(code);
    setShowCurrencyPicker(false);
  };

  const handleOpenExportModal = async () => {
    try {
      setShowExportModal(true);
      const stats = await getExportStats();
      setExportStats(stats);
    } catch (e) {
      console.error(e);
      setExportStats(null);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'summary') => {
    setExporting(true);
    try {
      const result = await exportTransactions(format);

      setExporting(false);
      setShowExportModal(false);

      if (result.success) {
        Alert.alert('Success', 'Your data has been exported successfully!');
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      console.error(e);
      setExporting(false);
      setShowExportModal(false);
      Alert.alert('Export Failed', e?.message ?? 'Export failed.');
    }
  };

  const handleExportPdf = async (mode: 'summary' | 'transactions') => {
    setExporting(true);
    try {
      const result = await exportMoneyPdf(mode);

      setExporting(false);
      setShowExportModal(false);

      if (result.success) {
        Alert.alert('Success', 'PDF exported successfully!');
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      console.error(e);
      setExporting(false);
      setShowExportModal(false);
      Alert.alert('Export Failed', e?.message ?? 'PDF export failed.');
    }
  };

  const ComingSoonChip = ({ label = 'Coming soon' }: { label?: string }) => (
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonText}>{label}</Text>
    </View>
  );

  const DisabledRow = ({
    iconBg,
    iconName,
    iconColor,
    title,
    subtitle,
    right,
  }: {
    iconBg: string;
    iconName: any;
    iconColor: string;
    title: string;
    subtitle: string;
    right?: React.ReactNode;
  }) => {
    return (
      <View style={[styles.menuItem, { opacity: 0.6 }]}>
        <View style={styles.menuItemLeft}>
          <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>
          <View>
            <Text style={styles.menuItemTitle}>{title}</Text>
            <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {right ?? <ComingSoonChip />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Money Tracker preferences</Text>
            </View>
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="wallet" size={28} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileTitle}>Money Tracker</Text>
            <Text style={styles.profileSubtitle}>Manual tracking • Private by default</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>MVP</Text>
          </View>
        </View>

        {/* ── Manage ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={18} color={colors.text.tertiary} />
          <Text style={styles.sectionTitle}>Manage</Text>
        </View>

        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(money)/categories')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#6366F120' }]}>
                <Ionicons name="grid-outline" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Categories</Text>
                <Text style={styles.menuItemSubtitle}>Create, rename, or delete categories</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(money)/budgets')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="wallet-outline" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Monthly Budget</Text>
                <Text style={styles.menuItemSubtitle}>Set and track your spending goal</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="options-outline" size={18} color={colors.text.tertiary} />
          <Text style={styles.sectionTitle}>Preferences</Text>
        </View>

        <View style={styles.menuList}>
          {/* Currency */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowCurrencyPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="cash-outline" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Currency</Text>
                <Text style={styles.menuItemSubtitle}>Choose KES or USD</Text>
              </View>
            </View>
            <View style={styles.currencyChip}>
              <Text style={styles.currencyFlag}>{currentCurrency.flag}</Text>
              <Text style={styles.currencyChipText}>{currentCurrency.symbol}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Appearance (disabled) */}
          <DisabledRow
            iconBg="#EC489920"
            iconName="color-palette-outline"
            iconColor="#EC4899"
            title="Appearance"
            subtitle="Theme & colors"
          />

          <View style={styles.menuDivider} />

          {/* Reminders (disabled) */}
          <DisabledRow
            iconBg="#EF444420"
            iconName="notifications-outline"
            iconColor="#EF4444"
            title="Reminders"
            subtitle="Daily tracking alerts"
            right={<ComingSoonChip />}
          />
        </View>

        {/* ── Data ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="server-outline" size={18} color={colors.text.tertiary} />
          <Text style={styles.sectionTitle}>Data</Text>
        </View>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={handleOpenExportModal}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="download-outline" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Export Data</Text>
                <Text style={styles.menuItemSubtitle}>CSV • JSON • PDF</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Backup (disabled) */}
          <DisabledRow
            iconBg="#8B5CF620"
            iconName="cloud-upload-outline"
            iconColor="#8B5CF6"
            title="Backup"
            subtitle="Cloud sync"
            right={<ComingSoonChip />}
          />
        </View>

        {/* ── About (real content) ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
          <Text style={styles.sectionTitle}>About</Text>
        </View>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowPrivacy(true)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#64748B20' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Privacy</Text>
                <Text style={styles.menuItemSubtitle}>How your data is handled</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowSupport(true)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#64748B20' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#64748B" />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Help & Support</Text>
                <Text style={styles.menuItemSubtitle}>Tips, issues, and contact</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Money Tracker • MVP</Text>
          <Text style={styles.builtByText}>Built with ❤️ by Eric</Text>
          <Text style={styles.copyrightText}>
            Your data stays on your device unless you export it.
          </Text>
        </View>

        <TouchableOpacity style={styles.backToMenuButton} onPress={() => router.replace('/')} activeOpacity={0.8}>
          <Ionicons name="home-outline" size={20} color={colors.text.primary} />
          <Text style={styles.backToMenuText}>Back to Main Menu</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Currency Picker Modal ── */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.currencyList}>
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                const currency = CURRENCIES[code];
                const isSelected = currencyCode === code;

                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.currencyOption, isSelected && styles.currencyOptionSelected]}
                    onPress={() => handleCurrencySelect(code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.currencyOptionLeft}>
                      <Text style={styles.currencyOptionFlag}>{currency.flag}</Text>
                      <View>
                        <Text style={styles.currencyOptionName}>{currency.name}</Text>
                        <Text style={styles.currencyOptionCode}>
                          {currency.code} • {currency.symbol}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.currencyCheck}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalNote}>This updates how amounts are displayed across the app.</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Export Modal ── */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !exporting && setShowExportModal(false)}>
          <View style={styles.exportModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Data</Text>
              {!exporting && (
                <TouchableOpacity onPress={() => setShowExportModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              )}
            </View>

            {exportStats && (
              <View style={styles.exportStats}>
                <View style={styles.exportStatItem}>
                  <Ionicons name="receipt-outline" size={20} color="#6366F1" />
                  <Text style={styles.exportStatValue}>{exportStats.totalTransactions}</Text>
                  <Text style={styles.exportStatLabel}>Transactions</Text>
                </View>
                <View style={styles.exportStatDivider} />
                <View style={styles.exportStatItem}>
                  <Ionicons name="grid-outline" size={20} color="#10B981" />
                  <Text style={styles.exportStatValue}>{exportStats.totalCategories}</Text>
                  <Text style={styles.exportStatLabel}>Categories</Text>
                </View>
              </View>
            )}

            {exportStats?.dateRange && (
              <View style={styles.dateRangeInfo}>
                <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.dateRangeText}>
                  {exportStats.dateRange.start} — {exportStats.dateRange.end}
                </Text>
              </View>
            )}

            {exporting ? (
              <View style={styles.exportingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.exportingText}>Preparing your export...</Text>
              </View>
            ) : (
              <View style={styles.exportOptions}>
                <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv')} activeOpacity={0.7}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="document-text-outline" size={24} color="#10B981" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Transactions CSV</Text>
                    <Text style={styles.exportOptionDesc}>Spreadsheet format</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('summary')} activeOpacity={0.7}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="analytics-outline" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Summary CSV</Text>
                    <Text style={styles.exportOptionDesc}>Monthly & category breakdown</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')} activeOpacity={0.7}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: '#6366F120' }]}>
                    <Ionicons name="code-outline" size={24} color="#6366F1" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Full Backup (JSON)</Text>
                    <Text style={styles.exportOptionDesc}>Complete snapshot</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleExportPdf('summary')} activeOpacity={0.7}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: '#EF444420' }]}>
                    <Ionicons name="document-outline" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Summary PDF</Text>
                    <Text style={styles.exportOptionDesc}>Printable overview</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.exportOption} onPress={() => handleExportPdf('transactions')} activeOpacity={0.7}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: '#A855F720' }]}>
                    <Ionicons name="reader-outline" size={24} color="#A855F7" />
                  </View>
                  <View style={styles.exportOptionContent}>
                    <Text style={styles.exportOptionTitle}>Transactions PDF</Text>
                    <Text style={styles.exportOptionDesc}>Printable list</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.exportNote}>Files will be shared using your device share options.</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Privacy Modal (real content) ── */}
      <Modal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPrivacy(false)}>
          <View style={styles.aboutModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy</Text>
              <TouchableOpacity onPress={() => setShowPrivacy(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.aboutText}>
              Money Tracker stores your transactions locally on your device. We do not connect to your bank and we do not
              upload your data automatically.
            </Text>

            <Text style={styles.aboutText}>
              Export features (CSV/JSON/PDF) allow you to share or save your data using apps on your device (e.g. Files,
              Drive, Email). What happens after you export depends on the app you choose.
            </Text>

            <Text style={styles.aboutTextMuted}>
              Tip: Use exports as backups if you plan to switch phones or reinstall.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Support Modal (real content) ── */}
      <Modal visible={showSupport} transparent animationType="fade" onRequestClose={() => setShowSupport(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSupport(false)}>
          <View style={styles.aboutModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowSupport(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.aboutText}>
              If totals look wrong, check:
              {'\n'}• Transaction type (income vs expense)
              {'\n'}• Correct date/month
              {'\n'}• Correct category
            </Text>

            <Text style={styles.aboutText}>
              If you experience a bug, export a JSON backup and share it with support (it helps reproduce issues).
            </Text>

            <Text style={styles.aboutTextMuted}>Support contact: add your email/URL here when ready.</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text.primary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.text.tertiary, fontSize: 13, marginTop: 1 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', borderRadius: 20, padding: spacing.md, gap: 14 },
  profileAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  profileSubtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 },
  profileBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  profileBadgeText: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, paddingHorizontal: 4 },
  sectionTitle: { color: colors.text.tertiary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  menuList: { backgroundColor: colors.background.secondary, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  menuItemSubtitle: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: colors.border.dark, marginLeft: 70 },

  currencyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background.tertiary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  currencyFlag: { fontSize: 16 },
  currencyChipText: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },

  comingSoonBadge: { backgroundColor: '#6366F120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  comingSoonText: { color: '#6366F1', fontSize: 11, fontWeight: '700' },

  valueChip: { backgroundColor: colors.background.tertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  valueChipText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },

  toggleTrack: { width: 44, height: 26, backgroundColor: '#10B981', borderRadius: 13, padding: 2, justifyContent: 'center', alignItems: 'flex-end' },
  toggleThumb: { width: 22, height: 22, backgroundColor: '#fff', borderRadius: 11 },

  footer: { alignItems: 'center', paddingVertical: spacing.lg, gap: 6 },
  versionText: { color: colors.text.tertiary, fontSize: 13, fontWeight: '600' },
  builtByText: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  copyrightText: { color: colors.text.tertiary, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  backToMenuButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, backgroundColor: colors.background.secondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border.dark },
  backToMenuText: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: colors.background.secondary, borderRadius: 24, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { color: colors.text.primary, fontSize: 20, fontWeight: '700' },
  modalNote: { color: colors.text.tertiary, fontSize: 12, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },

  currencyList: { gap: 10 },
  currencyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.background.tertiary, borderWidth: 2, borderColor: 'transparent' },
  currencyOptionSelected: { borderColor: '#6366F1', backgroundColor: '#6366F115' },
  currencyOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currencyOptionFlag: { fontSize: 28 },
  currencyOptionName: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  currencyOptionCode: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  currencyCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },

  exportModalContent: { width: '100%', maxWidth: 380, backgroundColor: colors.background.secondary, borderRadius: 24, padding: spacing.lg },
  exportStats: { flexDirection: 'row', backgroundColor: colors.background.tertiary, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  exportStatItem: { flex: 1, alignItems: 'center', gap: 6 },
  exportStatValue: { color: colors.text.primary, fontSize: 24, fontWeight: '800' },
  exportStatLabel: { color: colors.text.tertiary, fontSize: 12, fontWeight: '500' },
  exportStatDivider: { width: 1, backgroundColor: colors.border.dark, marginHorizontal: spacing.md },
  dateRangeInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  dateRangeText: { color: colors.text.tertiary, fontSize: 13, fontWeight: '500' },
  exportingContainer: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  exportingText: { color: colors.text.secondary, fontSize: 15, fontWeight: '500' },
  exportOptions: { gap: 10 },
  exportOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.tertiary, borderRadius: 14, padding: 14, gap: 14 },
  exportOptionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exportOptionContent: { flex: 1 },
  exportOptionTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '600' },
  exportOptionDesc: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  exportNote: { color: colors.text.tertiary, fontSize: 12, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },

  aboutModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: spacing.lg,
  },
  aboutText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  aboutTextMuted: {
    color: colors.text.tertiary,
    fontSize: 13,
    lineHeight: 18,
  },
});