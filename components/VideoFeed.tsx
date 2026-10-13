import VideoPlaceholder from '@/components/VideoPlaceholder';
import { useVideoStatus } from '@/hooks/use-video-status';
import { ROV_ORIGIN, ROV_VIDEO_URL } from '@/utils/rov-stream';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Live ROV camera feed from the Pi relay.
 *
 * The relay serves MJPEG (multipart/x-mixed-replace), which React Native's
 * image views can't play, but a browser <img> can, so the feed is an <img>
 * inside a WebView. The web build uses a plain <img> (VideoFeed.web.tsx).
 */
export default function VideoFeed({ style }: { style?: StyleProp<ViewStyle> }) {
  const { status, attempt } = useVideoStatus();

  if (status !== 'live') {
    return <VideoPlaceholder style={style} connecting={status === 'connecting'} />;
  }

  // The query string stops the WebView reusing a cached, dead stream on reconnect.
  const src = `${ROV_VIDEO_URL}?t=${attempt}`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}img{width:100%;height:100%;object-fit:cover}</style>
</head><body><img src="${src}"></body></html>`;

  return (
    <View style={style} pointerEvents="none">
      <WebView
        key={attempt}
        style={styles.webview}
        // Base the page on the relay's origin so Android loads the stream like a same-site image.
        source={{ html, baseUrl: ROV_ORIGIN }}
        originWhitelist={['*']}
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
