import { useCallback, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusBarStyle = 'light-content' | 'dark-content';

/** A fully-described status bar state. Spread directly onto <StatusBar>. */
export interface StatusBarPreset {
  barStyle: StatusBarStyle;
  backgroundColor: string;
}

// ─── useStaticStatusBar ───────────────────────────────────────────────────────

/**
 * For screens with a fixed-colour header that never changes (e.g. a dark tab
 * screen). Reapplies the correct style whenever the screen regains focus so
 * that other tabs cannot override it.
 *
 * @example
 * const statusBar = useStaticStatusBar({ barStyle: 'light-content', backgroundColor: '#1D1836' });
 * return <StatusBar barStyle={statusBar.barStyle} backgroundColor={statusBar.backgroundColor} />;
 */
export function useStaticStatusBar(preset: StatusBarPreset): StatusBarPreset {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(preset.barStyle);
    }, [preset.barStyle])
  );
  return preset;
}

// ─── useScrollStatusBar ───────────────────────────────────────────────────────

export interface ScrollStatusBarOptions {
  /**
   * Scroll offset (in px) at which the dark background has fully left the
   * status bar area. Typically the rendered height of your scrolling header.
   */
  threshold: number;
  /**
   * Preset applied while scroll ≤ threshold (dark background visible behind
   * the status bar — use light-content for white icons).
   */
  atTop: StatusBarPreset;
  /**
   * Preset applied while scroll > threshold (light background visible behind
   * the status bar — use dark-content for dark icons).
   */
  atBottom: StatusBarPreset;
}

export interface ScrollStatusBarResult {
  /** The currently active preset. Spread onto your <StatusBar> component. */
  current: StatusBarPreset;
  /**
   * Call with the raw vertical scroll offset inside your scroll listener.
   * Computes and applies the correct preset for that offset.
   *
   * @example
   * // With Animated.ScrollView listener:
   * listener: (event) => onScroll(event.nativeEvent.contentOffset.y)
   *
   * // With regular onScroll:
   * onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
   */
  onScroll: (offsetY: number) => void;
  /**
   * Raw ref tracking the latest scroll position. Read this inside
   * overlay-close handlers to restore the correct preset without waiting
   * for the next scroll event.
   *
   * @example
   * const closeOverlay = () => {
   *   onScroll(scrollOffsetRef.current); // restore correct style
   *   setOverlayVisible(false);
   * };
   */
  scrollOffsetRef: { current: number };
}

/**
 * For screens whose dark header scrolls out of view, revealing a lighter
 * background behind the status bar. Automatically:
 * - Switches between `atTop` and `atBottom` presets as the user scrolls.
 * - Reapplies the correct preset when the screen regains focus (guarding
 *   against stale state from tab switching).
 *
 * @example
 * const { current: statusBar, onScroll, scrollOffsetRef } = useScrollStatusBar({
 *   threshold: 380,
 *   atTop:    { barStyle: 'light-content', backgroundColor: '#00A175' },
 *   atBottom: { barStyle: 'dark-content',  backgroundColor: '#FFFFFF' },
 * });
 *
 * // Wire up the scroll listener:
 * const handleScroll = Animated.event([...], {
 *   listener: (event) => onScroll(event.nativeEvent.contentOffset.y),
 * });
 *
 * // Render:
 * <StatusBar barStyle={statusBar.barStyle} backgroundColor={statusBar.backgroundColor} />
 */
export function useScrollStatusBar({
  threshold,
  atTop,
  atBottom,
}: ScrollStatusBarOptions): ScrollStatusBarResult {
  const scrollOffsetRef = useRef(0);
  // Tracks which side of the threshold we are on so onScroll only calls
  // setCurrent when the zone actually changes — not on every scroll frame.
  const atBottomRef = useRef(false);
  const [current, setCurrent] = useState<StatusBarPreset>(atTop);

  useFocusEffect(
    useCallback(() => {
      const isAtBottom = scrollOffsetRef.current > threshold;
      atBottomRef.current = isAtBottom;
      setCurrent(isAtBottom ? atBottom : atTop);
      // atTop/atBottom intentionally omitted — callers define them as constants.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threshold])
  );

  const onScroll = useCallback(
    (offsetY: number) => {
      scrollOffsetRef.current = offsetY;
      const isAtBottom = offsetY > threshold;
      // Only update state when crossing the threshold — O(1) per zone change
      // instead of O(n) per scroll frame. Avoids 60 setCurrent calls/sec.
      if (isAtBottom !== atBottomRef.current) {
        atBottomRef.current = isAtBottom;
        setCurrent(isAtBottom ? atBottom : atTop);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threshold]
  );

  return { current, onScroll, scrollOffsetRef };
}
