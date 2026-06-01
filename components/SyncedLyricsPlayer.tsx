import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { parseLrc } from "../utils/syncLyrics";

const isEmojiInterval = (text: string) => {
  if (!text || text.trim() === "") return true;
  // If it has any alphanumeric character (a-z, A-Z, 0-9) or any Japanese character (hiragana, katakana, kanji), it's a real lyric line.
  // Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF, Kanji: \u4E00-\u9FAF
  const hasLyrics = /[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  return !hasLyrics;
};

const IntroCountdown = React.memo(({
  duration,
  currentTime,
  onPress,
  isActive,
  isScrubbing,
  highlightColor,
}: {
  duration: number;
  currentTime: number;
  onPress: (time: number) => void;
  isActive: boolean;
  isScrubbing: boolean;
  highlightColor: string;
}) => {
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && duration > 0) {
      const progress = Math.max(0, Math.min(1, currentTime / duration));
      const remaining = 1 - progress;
      const diff = Math.abs(remaining - (progressAnim as any)._value);
      if (diff > 0.15) {
        progressAnim.setValue(remaining);
      } else {
        Animated.timing(progressAnim, {
          toValue: remaining,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
    } else {
      progressAnim.setValue(isActive ? 1 : 0);
    }
  }, [currentTime, isActive, duration]);

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(0)} disabled={!isActive}>
      <View style={styles.lyricLineContainer}>
        {/* Loading bar container */}
        <View style={[styles.intervalBarContainer, { opacity: isActive ? 1 : 0 }]}>
          <Animated.View
            style={[
              styles.intervalBarFill,
              {
                width: widthInterpolate,
                backgroundColor: highlightColor,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const LyricLine = React.memo(({
  text,
  isActive,
  isPast,
  onPress,
  time,
  style,
  isScrubbing,
  highlightColor,
  isEmojiInterval,
  duration,
  currentTime,
}: {
  text: string;
  isActive: boolean;
  isPast: boolean;
  onPress: (time: number) => void;
  time: number;
  style?: any;
  isScrubbing?: boolean;
  highlightColor?: string;
  isEmojiInterval?: boolean;
  duration?: number;
  currentTime?: number;
}) => {
  const getInitialValue = () => {
    if (isActive) return 1;
    if (isPast) return 2;
    return 0;
  };

  const animValue = useRef(new Animated.Value(getInitialValue())).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let toValue = 0;
    if (isActive) {
      toValue = 1;
    } else if (isPast) {
      toValue = 2;
    }

    const animDuration = isScrubbing ? 0 : (isActive ? 0 : 400); // 0ms for instant highlight / scrubbing, 400ms for snappy fade-out

    Animated.timing(animValue, {
      toValue,
      duration: animDuration,
      useNativeDriver: true, // Native driver runs entirely on GPU/UI thread
    }).start();
  }, [isActive, isPast, isScrubbing]);

  useEffect(() => {
    if (isEmojiInterval && isActive && duration && duration > 0 && currentTime !== undefined) {
      const progress = Math.max(0, Math.min(1, (currentTime - time) / duration));
      const remaining = 1 - progress;
      const diff = Math.abs(remaining - (progressAnim as any)._value);
      if (diff > 0.15) {
        progressAnim.setValue(remaining);
      } else {
        Animated.timing(progressAnim, {
          toValue: remaining,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
    } else {
      progressAnim.setValue(isActive ? 1 : 0);
    }
  }, [currentTime, isActive, isEmojiInterval, time, duration]);

  const textOpacity = animValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.4, 1.0, 0.15], // Map states to standard text opacities
  });

  const bgOpacity = animValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0], // Translucent glow visible only in active state
  });

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(time)}>
      <View style={styles.lyricLineContainer}>
        {/* GPU-Accelerated Glow Overlay Background */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: 8,
              opacity: bgOpacity,
            },
          ]}
        />
        {/* GPU-Accelerated Text Opacity */}
        <Animated.Text
          style={[
            styles.lyricLineText,
            { color: (isActive || isPast) ? (highlightColor || "#FFFFFF") : "#FFFFFF", opacity: textOpacity },
            style,
          ]}
        >
          {text || "🎵"}
        </Animated.Text>

        {/* Emoji Interval countdown loading bar */}
        {isEmojiInterval && (
          <View style={[styles.intervalBarContainer, { opacity: isActive ? 1 : 0 }]}>
            <Animated.View
              style={[
                styles.intervalBarFill,
                {
                  width: widthInterpolate,
                  backgroundColor: highlightColor || "#FFFFFF",
                },
              ]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const LyricsList = React.memo(({
  scrollViewRef,
  parsedLines,
  activeLineIndex,
  lineLayouts,
  handleLinePress,
  lyricStyle,
  isScrubbing,
  containerHeight,
  autoScroll,
  highlightColor,
  currentTime,
  trackDuration,
}: {
  scrollViewRef: React.RefObject<ScrollView | null>;
  parsedLines: any[];
  activeLineIndex: number;
  lineLayouts: React.MutableRefObject<{ [key: number]: number }>;
  handleLinePress: (time: number) => void;
  lyricStyle: any;
  isScrubbing: boolean;
  containerHeight: number;
  autoScroll: boolean;
  highlightColor: string;
  currentTime: number;
  trackDuration: number;
}) => {
  const firstLineTime = parsedLines[0]?.time || 0;
  const showIntro = firstLineTime > 1.5; // Show intro if there's more than 1.5s before first lyric

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.flatListContent}
      showsVerticalScrollIndicator={false}
    >
      {showIntro && (
        <IntroCountdown
          duration={firstLineTime}
          currentTime={currentTime}
          onPress={handleLinePress}
          isActive={activeLineIndex === -1 && currentTime < firstLineTime}
          isScrubbing={isScrubbing}
          highlightColor={highlightColor}
        />
      )}
      {parsedLines.map((item, index) => {
        const isActive = index === activeLineIndex;
        const isPast = index < activeLineIndex;
        const nextTime = parsedLines[index + 1]?.time || trackDuration;
        const itemDuration = nextTime - item.time;
        const emojiInterval = isEmojiInterval(item.text);

        return (
          <View
            key={`${item.time}-${index}`}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              lineLayouts.current[index] = y;
              // If the active line's layout is measured/updated, scroll to it immediately.
              // This is crucial for initial load, layout reflows, and toggling Romaji.
              if (isActive && autoScroll && scrollViewRef.current && containerHeight > 0) {
                const scrollPosition = Math.max(0, y - containerHeight * 0.3);
                scrollViewRef.current.scrollTo({
                  y: scrollPosition,
                  animated: !isScrubbing,
                });
              }
            }}
          >
            <LyricLine
              text={item.text}
              isActive={isActive}
              isPast={isPast}
              onPress={handleLinePress}
              time={item.time}
              style={lyricStyle}
              isScrubbing={isScrubbing}
              highlightColor={highlightColor}
              isEmojiInterval={emojiInterval}
              duration={emojiInterval ? itemDuration : undefined}
              currentTime={isActive && emojiInterval ? currentTime : 0}
            />
          </View>
        );
      })}
    </ScrollView>
  );
});

interface SyncedLyricsPlayerProps {
  title: string;
  artist: string;
  lyrics: string; // Plain lyrics fallback
  syncedLyrics?: string | null; // Raw LRC format lyrics
  duration?: number; // Duration of the song in seconds
  headerRightActions?: React.ReactNode;
  lyricStyle?: any;
  autoScroll?: boolean;
}

export default function SyncedLyricsPlayer({
  title,
  artist,
  lyrics,
  syncedLyrics,
  duration = 180, // Default to 3 minutes if not provided
  headerRightActions,
  lyricStyle,
  autoScroll = true,
}: SyncedLyricsPlayerProps) {
  const highlightColor = lyricStyle?.highlightColor || "#FFFFFF";
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<{ [key: number]: number }>({});
  const [containerHeight, setContainerHeight] = useState(0);
  const intervalRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);

  const progressBarRef = useRef<View>(null);
  const progressBarLeft = useRef(0);

  useEffect(() => {
    lineLayouts.current = {};
  }, [title, artist]);

  const measureProgressBar = () => {
    progressBarRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) {
        progressBarLeft.current = x;
        setProgressBarWidth(width);
      }
    });
  };

  const handleScrub = (evt: any) => {
    const pageX = evt.nativeEvent.pageX;
    const relativeX = pageX - progressBarLeft.current;
    if (progressBarWidth > 0) {
      const percentage = Math.max(0, Math.min(1, relativeX / progressBarWidth));
      setCurrentTime(percentage * trackDuration);
    }
  };

  const handleScrubRef = useRef(handleScrub);
  useEffect(() => {
    handleScrubRef.current = handleScrub;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        handleScrubRef.current(evt);
      },
      onPanResponderMove: (evt) => {
        handleScrubRef.current(evt);
      },
      onPanResponderRelease: () => {
        setIsScrubbing(false);
        triggerHaptic();
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
      },
    })
  ).current;

  // Parse the synced lyrics
  const parsedLines = useMemo(() => {
    return parseLrc(syncedLyrics || "");
  }, [syncedLyrics]);

  const hasSyncedLyrics = parsedLines.length > 0;

  // Determine the track duration. If LRCLIB returns 0, fallback to the last timestamp + 10s
  const trackDuration = useMemo(() => {
    if (duration && duration > 0) return duration;
    if (hasSyncedLyrics) {
      return parsedLines[parsedLines.length - 1].time + 10;
    }
    return 180;
  }, [duration, parsedLines, hasSyncedLyrics]);

  // Find the index of the currently active lyric line
  const activeLineIndex = useMemo(() => {
    if (!hasSyncedLyrics) return -1;
    let activeIndex = -1;
    const adjustedTime = currentTime + 0.3; // Highlight 0.3 seconds faster
    for (let i = 0; i < parsedLines.length; i++) {
      if (adjustedTime >= parsedLines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  }, [currentTime, parsedLines, hasSyncedLyrics]);

  // Handle auto-scrolling when the active line changes
  useEffect(() => {
    if (autoScroll && hasSyncedLyrics && activeLineIndex >= 0 && scrollViewRef.current) {
      const y = lineLayouts.current[activeLineIndex];
      if (y !== undefined) {
        const scrollPosition = Math.max(0, y - containerHeight * 0.3);
        scrollViewRef.current.scrollTo({
          y: scrollPosition,
          animated: !isScrubbing, // Snaps instantly when scrubbing to avoid lag, scrolls smoothly during playback
        });
      }
    }
  }, [activeLineIndex, hasSyncedLyrics, containerHeight, autoScroll, isScrubbing, syncedLyrics]);

  // Timer loop for simulated playback
  useEffect(() => {
    if (isPlaying && !isScrubbing) {
      lastTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= trackDuration) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return trackDuration;
          }
          return next;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isScrubbing, trackDuration]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    }
  };

  const handlePlayPause = () => {
    triggerHaptic();
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    triggerHaptic();
    setIsPlaying(false);
    setCurrentTime(0);
    if (hasSyncedLyrics && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const adjustTime = (amount: number) => {
    triggerHaptic();
    setCurrentTime((prev) => Math.max(0, Math.min(trackDuration, prev + amount)));
  };



  // Jump to specific line on tap (memoized to keep references stable)
  const handleLinePress = useCallback((time: number) => {
    setCurrentTime(time);
    setIsPlaying(true);
    triggerHaptic();
  }, []);

  // Time formatter (mm:ss)
  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.songMeta}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {artist}
          </Text>
        </View>
        {headerRightActions && <View>{headerRightActions}</View>}
      </View>

      {/* Lyrics Content */}
      <View style={styles.lyricsArea} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
        {hasSyncedLyrics ? (
          <LyricsList
            scrollViewRef={scrollViewRef}
            parsedLines={parsedLines}
            activeLineIndex={activeLineIndex}
            lineLayouts={lineLayouts}
            handleLinePress={handleLinePress}
            lyricStyle={lyricStyle}
            isScrubbing={isScrubbing}
            containerHeight={containerHeight}
            autoScroll={autoScroll}
            highlightColor={highlightColor}
            currentTime={currentTime}
            trackDuration={trackDuration}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            <View style={styles.unsyncedInfo}>
              <Ionicons name="alert-circle-outline" size={20} color="#888" />
              <Text style={styles.unsyncedInfoText}>
                Synchronized lyrics not available. Showing plain lyrics.
              </Text>
            </View>
            <Text style={[styles.plainLyricsText, lyricStyle]}>
              {lyrics || "No lyrics available for this track."}
            </Text>
          </ScrollView>
        )}
      </View>

      {/* Floating Music Player Controls at bottom */}
      {hasSyncedLyrics && (
        <View style={styles.playerBar}>
          {/* Progress Seek Bar */}
          <View
            ref={progressBarRef}
            onLayout={measureProgressBar}
            collapsable={false}
            style={styles.progressBarContainer}
            {...panResponder.panHandlers}
          >
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(currentTime / trackDuration) * 100}%`,
                  },
                ]}
              />
            </View>
            {/* Draggable Thumb Indicator */}
            <View
              style={[
                styles.progressBarThumb,
                {
                  transform: [
                    {
                      translateX: progressBarWidth > 0 ? (currentTime / trackDuration) * progressBarWidth : 0,
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* Controls Row (Timer & Buttons on the same line) */}
          <View style={styles.controlsRow}>
            {/* Start Time */}
            <Text style={styles.timeTextSmall}>
              {formatTime(currentTime)}
            </Text>

            {/* Centered Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity onPress={() => adjustTime(-0.2)} style={styles.adjustButton}>
                <Ionicons name="play-back" size={18} color="#fff" />
              </TouchableOpacity>

              {/* <TouchableOpacity onPress={handleStop} style={styles.controlButton}>
                <Ionicons name="stop" size={22} color="#fff" />
              </TouchableOpacity> */}

              <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.playPauseButton}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color="#1DB954"
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => adjustTime(0.2)} style={styles.adjustButton}>
                <Ionicons name="play-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* End Time */}
            <Text style={styles.timeTextSmall}>
              {formatTime(trackDuration)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  songMeta: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  artist: {
    color: "#888",
    fontSize: 16,
    marginTop: 2,
  },
  lyricsArea: {
    flex: 1,
    width: "100%",
  },
  flatListContent: {
    paddingTop: 40,
    paddingBottom: 160, // Clear floating player controls
  },
  scrollViewContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  lyricLineContainer: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 1,
  },
  lyricLineText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "left",
  },
  unsyncedInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  unsyncedInfoText: {
    color: "#888",
    fontSize: 13,
    flex: 1,
  },
  plainLyricsText: {
    color: "#E0E0E0",
    fontSize: 18,
    lineHeight: 30,
  },
  playerBar: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 6,
    overflow: "visible", // Allow thumb circle to overlap container edges without clipping
  },
  progressBarContainer: {
    height: 24, // Reduced height touch target (snugger look)
    marginHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  progressBarTrack: {
    height: 4, // Sleeker line profile
    width: "100%",
    backgroundColor: "#2A2A2A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#1DB954",
  },
  progressBarThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: -6, // Centers the thumb on the progress edge
    top: 6, // Vertically centered at y = 12 (24 / 2 - 12 / 2 = 6)
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4, // Tighter top spacing for a compact profile
    paddingBottom: Platform.OS === "ios" ? 4 : 2,
  },
  timeTextSmall: {
    color: "#aaa",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  buttonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // controlButton: {
  //   width: 36,
  //   height: 36,
  //   alignItems: "center",
  //   justifyContent: "center",
  // },
  playPauseButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  adjustButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalBarContainer: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 1.5,
    marginTop: 4,
    width: "100%",
    overflow: "hidden",
  },
  intervalBarFill: {
    height: "100%",
    borderRadius: 1.5,
  },
});
