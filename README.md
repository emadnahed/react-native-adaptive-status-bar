# react-native-adaptive-status-bar

[![npm version](https://img.shields.io/npm/v/react-native-adaptive-status-bar.svg)](https://www.npmjs.com/package/react-native-adaptive-status-bar)
[![license](https://img.shields.io/npm/l/react-native-adaptive-status-bar.svg)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)](https://reactnative.dev)

React Native hooks for adaptive status bar — static and scroll-based dynamic switching between light/dark content styles.

---

## The Problem

React Native's `StatusBar` API is imperative and global. In a tab-based or stack-based app, switching between screens often leaves the status bar in the wrong state — a light tab overriding the dark style set by the previous screen, or a modal dismissal restoring the wrong icon colour. When a header scrolls out of view and reveals a lighter background, the default black icons become invisible.

This library solves both problems with two focused hooks: one for screens with a fixed status bar style and one for screens where the style must change as the user scrolls.

---

## Installation

```sh
npm install react-native-adaptive-status-bar
# or
yarn add react-native-adaptive-status-bar
```

### Peer dependencies

Make sure these are already installed in your project:

```sh
npm install react react-native @react-navigation/native
```

---

## Quick Start

```tsx
import { useStaticStatusBar } from 'react-native-adaptive-status-bar';
import { StatusBar, View } from 'react-native';

export default function DarkScreen() {
  const statusBar = useStaticStatusBar({
    barStyle: 'light-content',
    backgroundColor: '#1D1836',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#1D1836' }}>
      <StatusBar barStyle={statusBar.barStyle} backgroundColor={statusBar.backgroundColor} />
      {/* screen content */}
    </View>
  );
}
```

---

## API Reference

### `useStaticStatusBar(preset)`

For screens with a fixed-colour header that never changes. Reapplies the correct style whenever the screen regains focus so that other tabs or screens cannot override it.

| Parameter | Type | Description |
|-----------|------|-------------|
| `preset` | `StatusBarPreset` | The status bar style to apply and hold for this screen. |

**Returns** `StatusBarPreset` — the same preset you passed in. Spread directly onto `<StatusBar>`.

#### `StatusBarPreset`

| Field | Type | Description |
|-------|------|-------------|
| `barStyle` | `'light-content' \| 'dark-content'` | Icon/text colour for the status bar. Use `light-content` on dark backgrounds. |
| `backgroundColor` | `string` | Background colour of the status bar (Android). |

---

### `useScrollStatusBar(options)`

For screens whose dark header scrolls out of view, revealing a lighter background behind the status bar. Automatically switches between two presets as the user scrolls and restores the correct preset when the screen regains focus.

#### Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `threshold` | `number` | Scroll offset in px at which the dark background has fully left the status bar area. Typically the rendered height of your scrolling header. |
| `atTop` | `StatusBarPreset` | Preset while scroll ≤ threshold (dark background visible — use `light-content`). |
| `atBottom` | `StatusBarPreset` | Preset while scroll > threshold (light background visible — use `dark-content`). |

#### Returns `ScrollStatusBarResult`

| Field | Type | Description |
|-------|------|-------------|
| `current` | `StatusBarPreset` | The currently active preset. Spread onto `<StatusBar>`. |
| `onScroll` | `(offsetY: number) => void` | Call with the raw vertical scroll offset in your scroll listener. |
| `scrollOffsetRef` | `{ current: number }` | Ref tracking the latest scroll position. Use in overlay-close handlers to restore the correct preset without waiting for the next scroll event. |

---

## Full Usage Example

The example below shows a home screen with a tall coloured hero section that scrolls out of view. When the hero leaves the status bar area, the hook switches from white icons (on green) to dark icons (on white). It also shows how to use `scrollOffsetRef` to restore the correct style when dismissing an overlay modal.

```tsx
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useScrollStatusBar } from 'react-native-adaptive-status-bar';

const HERO_HEIGHT = 380;

export default function HomeScreen() {
  const [overlayVisible, setOverlayVisible] = useState(false);

  const { current: statusBar, onScroll, scrollOffsetRef } = useScrollStatusBar({
    threshold: HERO_HEIGHT,
    atTop:    { barStyle: 'light-content', backgroundColor: '#00A175' },
    atBottom: { barStyle: 'dark-content',  backgroundColor: '#FFFFFF' },
  });

  // Wire up Animated scroll listener so the JS handler fires on every frame.
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => onScroll(event.nativeEvent.contentOffset.y),
    }
  );

  const openOverlay = () => setOverlayVisible(true);

  // Use scrollOffsetRef to restore the correct style immediately on close —
  // without waiting for the next scroll event.
  const closeOverlay = () => {
    onScroll(scrollOffsetRef.current);
    setOverlayVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={statusBar.barStyle}
        backgroundColor={statusBar.backgroundColor}
      />

      <Animated.ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
        {/* Hero section — dark background, white status bar icons */}
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Text style={styles.heroTitle}>Dashboard</Text>
          <Pressable onPress={openOverlay} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Open Details</Text>
          </Pressable>
        </View>

        {/* Content section — light background, dark status bar icons */}
        <View style={styles.content}>
          {Array.from({ length: 20 }, (_, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardText}>Item {i + 1}</Text>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      <Modal
        visible={overlayVisible}
        transparent
        animationType="slide"
        onRequestClose={closeOverlay}
      >
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Details</Text>
          <Pressable onPress={closeOverlay} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  hero:            { backgroundColor: '#00A175', alignItems: 'center', justifyContent: 'center' },
  heroTitle:       { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  heroButton:      { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  heroButtonText:  { color: '#fff', fontSize: 16 },
  content:         { backgroundColor: '#fff', padding: 16, gap: 12 },
  card:            { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 16 },
  cardText:        { fontSize: 16, color: '#333' },
  overlay:         { flex: 1, backgroundColor: '#fff', marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  overlayTitle:    { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  closeButton:     { backgroundColor: '#00A175', padding: 14, borderRadius: 10, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

---

## Contributing

Contributions, bug reports, and feature requests are welcome. Please open an issue before submitting a PR to discuss the change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a pull request

---

## License

MIT — see [LICENSE](./LICENSE) for details.
