import VideoPlaceholder from '@/components/VideoPlaceholder';
import { useVideoStatus } from '@/hooks/use-video-status';
import { ROV_VIDEO_URL } from '@/utils/rov-stream';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';


/** Web build of the ROV camera feed: browsers play MJPEG in a plain <img>. */
export default function VideoFeed({ style }: { style?: StyleProp<ViewStyle> }) {
  const { status, attempt } = useVideoStatus();

  if (status !== 'live') {
    return <VideoPlaceholder style={style} connecting={status === 'connecting'} />;
  }

  return (
    <View style={[style, { backgroundColor: '#000' }]} pointerEvents="none">
      <img
        key={attempt}
        src={`${ROV_VIDEO_URL}?t=${attempt}`}
        alt="ROV camera"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </View>
  );
}
