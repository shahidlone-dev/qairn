// src/screens/search/SearchScreen.tsx
//
// Username-only people search.
//
// Why no posts/notes/market filters here:
//   The product decision is that search in Campus is a "find a person"
//   surface — discovery of content lives elsewhere (feed, market screen,
//   etc.). Mixing entity types in one search makes the result list noisy
//   and the empty-state confusing.
//
// Implementation notes:
//   - Input is normalised to lowercase + restricted to handle-safe chars
//     (alphanumeric, `_`, `.`) so the request matches what the DB stores.
//   - Debounced 250ms — short enough to feel live, long enough to avoid
//     hammering the API on every keystroke.
//   - A request token guards against stale responses arriving out-of-order
//     (typing fast: t1 fires for "ah", t2 fires for "ahmed", t1 resolves
//     last; without the token we'd render "ah" results).
//   - "Recent searches" persists the last few usernames the user opened
//     so they can jump back without retyping. Stored in AsyncStorage.

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTheme, fonts, fontSizes, spacing, radii } from '../../types/theme';
import { RootStackScreenProps } from '../../types/navigation';
import { Avatar } from '../../components/ui';
import UsersApi, { type SearchUser } from '../../api/users.api';

type Props = RootStackScreenProps<'Search'>;

// ── Tunables ────────────────────────────────────────────────────────────────
const DEBOUNCE_MS    = 250;
const MIN_CHARS      = 2;
const RECENT_KEY     = 'qaaf:search:recent';
const RECENT_LIMIT   = 8;

// Allow only username-safe characters. Strips spaces and unicode emoji that
// would never match a stored username and saves wasted requests.
const USERNAME_RE = /[^a-z0-9_.]/g;
function sanitize(input: string): string {
  return input.toLowerCase().replace(USERNAME_RE, '');
}

// ── Recent searches storage ─────────────────────────────────────────────────
async function loadRecent(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}
async function saveRecent(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
  } catch { /* noop */ }
}

// ───────────────────────────────────────────────────────────────────────────

export const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const T        = getTheme(useColorScheme());
  const inputRef = useRef<TextInput>(null);

  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchUser[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [recent,     setRecent]     = useState<string[]>([]);

  // Stale-response guard: each request bumps the token; only the response
  // matching the latest token is allowed to update state.
  const requestToken = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load recent searches on mount ─────────────────────────────────────────
  useEffect(() => {
    loadRecent().then(setRecent);
  }, []);

  // ── Debounced search effect ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const term = query.trim();
    if (term.length < MIN_CHARS) {
      // Cancel any pending request and clear results — we're back to the
      // recent / empty state.
      requestToken.current += 1;
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceTimer.current = setTimeout(async () => {
      const myToken = ++requestToken.current;
      try {
        const res = await UsersApi.search(term);
        if (myToken !== requestToken.current) return; // stale
        setResults(res.data ?? []);
        setIsLoading(false);
      } catch (err: any) {
        if (myToken !== requestToken.current) return;
        setError(err?.message ?? 'Search failed.');
        setResults([]);
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // ── Tap result → push profile + remember the query ────────────────────────
  const openProfile = useCallback((username: string) => {
    Keyboard.dismiss();
    // Save to recent (dedupe + move to top)
    setRecent(prev => {
      const next = [username, ...prev.filter(u => u !== username)].slice(0, RECENT_LIMIT);
      saveRecent(next);
      return next;
    });
    navigation.navigate('Profile', { username });
  }, [navigation]);

  // ── Recent search row taps just refill the input ──────────────────────────
  const replayRecent = useCallback((username: string) => {
    setQuery(username);
    inputRef.current?.focus();
  }, []);

  const removeRecent = useCallback((username: string) => {
    setRecent(prev => {
      const next = prev.filter(u => u !== username);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearAllRecent = useCallback(() => {
    setRecent([]);
    saveRecent([]);
  }, []);

  // ── Render result item ────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: SearchUser }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: T.borderSubtle }]}
      activeOpacity={0.7}
      onPress={() => openProfile(item.username)}
    >
      <Avatar
        size="md"
        name={item.username}
        uri={item.avatar_url ?? undefined}
      />
      <View style={styles.userText}>
        <View style={styles.usernameRow}>
          <Text
            style={[styles.username, { color: T.text }]}
            numberOfLines={1}
          >
            {item.username}
          </Text>
          {item.is_verified && (
            <Ionicons name="checkmark-circle" size={14} color={T.accent} style={{ marginLeft: 4 }} />
          )}
        </View>
        {!!item.full_name && (
          <Text style={[styles.fullName, { color: T.text2 }]} numberOfLines={1}>
            {item.full_name}
          </Text>
        )}
        {(item.dept || item.university) && (
          <Text style={[styles.meta, { color: T.text3 }]} numberOfLines={1}>
            {[item.dept, item.university].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [T, openProfile]);

  // ── Layout switches based on state ────────────────────────────────────────
  const term       = query.trim();
  const showRecent = term.length < MIN_CHARS && recent.length > 0;
  const showHint   = term.length === 0;
  const showResults = term.length >= MIN_CHARS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <View style={[styles.searchBar, { backgroundColor: T.bgInput, borderRadius: radii.lg }]}>
          <Ionicons name="at" size={18} color={T.text3} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={(text) => setQuery(sanitize(text))}
            placeholder="Search by username"
            placeholderTextColor={T.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="visible-password"
            returnKeyType="search"
            style={[
              styles.searchInput,
              { color: T.text, fontFamily: fonts.regular, fontSize: fontSizes.md },
            ]}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={T.text3} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[{ color: T.accent, fontFamily: fonts.semibold, fontSize: fontSizes.md }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {showResults ? (
        // Results pane
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.headerStatus}>
                <ActivityIndicator size="small" color={T.accent} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyResult}>
                <Ionicons name="person-outline" size={36} color={T.text3} />
                <Text style={[styles.emptyTitle, { color: T.text }]}>
                  {error ? 'Couldn’t search' : `No users matching "${term}"`}
                </Text>
                {!!error && (
                  <Text style={[styles.emptyHint, { color: T.text3 }]}>
                    {error}
                  </Text>
                )}
                {!error && (
                  <Text style={[styles.emptyHint, { color: T.text3 }]}>
                    Try a different spelling or check the handle.
                  </Text>
                )}
              </View>
            ) : null
          }
        />
      ) : (
        // Pre-search state: hint + recent
        <View style={{ flex: 1 }}>
          {showHint && (
            <View style={styles.hintWrap}>
              <Ionicons name="search-outline" size={28} color={T.text3} />
              <Text style={[styles.hintTitle, { color: T.text }]}>
                Find people by username
              </Text>
              <Text style={[styles.hintBody, { color: T.text3 }]}>
                Type at least {MIN_CHARS} characters of someone's handle.
              </Text>
            </View>
          )}

          {term.length > 0 && term.length < MIN_CHARS && (
            <View style={styles.hintWrap}>
              <Text style={[styles.hintBody, { color: T.text3 }]}>
                Keep typing… (at least {MIN_CHARS} characters)
              </Text>
            </View>
          )}

          {showRecent && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: T.text, fontFamily: fonts.semibold }]}>
                  Recent
                </Text>
                <TouchableOpacity onPress={clearAllRecent}>
                  <Text style={[{ color: T.accent, fontFamily: fonts.medium, fontSize: fontSizes.sm }]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              </View>

              {recent.map(item => (
                <View
                  key={item}
                  style={[styles.row, { borderBottomColor: T.borderSubtle }]}
                >
                  <TouchableOpacity
                    style={styles.rowMain}
                    onPress={() => replayRecent(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: T.bgCard }]}>
                      <Ionicons name="time-outline" size={16} color={T.text3} />
                    </View>
                    <Text
                      style={[
                        styles.rowText,
                        { color: T.text2, fontFamily: fonts.regular, fontSize: fontSizes.md },
                      ]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeRecent(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={T.text3} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.md,
    height:            42,
    gap:               spacing.sm,
  },
  searchInput: { flex: 1, includeFontPadding: false },

  headerStatus: {
    paddingVertical: spacing.md,
    alignItems:      'center',
  },

  // Result rows
  userRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userText: { flex: 1, gap: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  username: { fontFamily: fonts.semibold, fontSize: fontSizes.md },
  fullName: { fontFamily: fonts.regular,  fontSize: fontSizes.sm },
  meta:     { fontFamily: fonts.regular,  fontSize: fontSizes.xs },

  // Empty / hint states
  emptyResult: {
    alignItems:        'center',
    paddingVertical:   spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize:   fontSizes.md,
    textAlign:  'center',
    marginTop:  spacing.md,
  },
  emptyHint: {
    fontFamily: fonts.regular,
    fontSize:   fontSizes.sm,
    textAlign:  'center',
    marginTop:  spacing.xs,
  },

  hintWrap: {
    alignItems:        'center',
    paddingVertical:   spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  hintTitle: {
    fontFamily: fonts.semibold,
    fontSize:   fontSizes.md,
    marginTop:  spacing.sm,
  },
  hintBody: {
    fontFamily: fonts.regular,
    fontSize:   fontSizes.sm,
    marginTop:  spacing.xs,
    textAlign:  'center',
  },

  // Recent rows
  section:     { paddingTop: spacing.md },
  sectionHead: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.md },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:               spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  rowIcon: {
    width:          34,
    height:         34,
    borderRadius:   radii.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
});
