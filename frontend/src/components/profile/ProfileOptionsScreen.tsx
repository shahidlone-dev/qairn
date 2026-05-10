import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTheme, fonts, fontSizes, spacing } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';

type Props = RootStackScreenProps<'ProfileOptions'>;

export const ProfileOptionsScreen: React.FC<Props> = ({ navigation }) => {
  const T = getTheme(useColorScheme());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: T.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: T.text }]}>Options</Text>
        {/* Empty view to balance the header alignment */}
        <View style={{ width: 22 }} />
      </View>

      {/* Body */}
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={48} color={T.text3} />
        <Text style={[styles.comingSoonText, { color: T.text2 }]}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1 
  },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: spacing.base, 
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: { 
    fontFamily: fonts.semibold, 
    fontSize: fontSizes.lg 
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingBottom: 80, // Offset a bit from true center to look better visually
  },
  comingSoonText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.md,
    marginTop: spacing.md,
  }
});