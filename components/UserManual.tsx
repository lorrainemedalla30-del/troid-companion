import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontScale, scaleSize } from '@/utils/scale';

const COLORS = {
  teal: '#1D7A8C',
  tealBg: '#E3F1F4',
  textDark: '#101B2D',
  textMuted: '#5B6B7C',
  white: '#FFFFFF',
};

const s = scaleSize;
const f = fontScale;

type Item = { lead?: string; text: string };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: 'Getting Started',
    items: [
      { lead: 'Log in', text: 'with your operator email and password on the login screen.' },
      { lead: 'Rotate freely', text: 'the app works in both portrait and landscape. Landscape gives the most room for the controls.' },
      { lead: 'Navigate', text: 'with the bar at the bottom: Home opens the ROV control screen, Explore opens this dashboard.' },
    ],
  },
  {
    title: 'Connecting to Wi-Fi',
    items: [
      { lead: 'Wi-Fi Connection', text: 'tab: join a Wi-Fi router or a phone hotspot to get the app online.' },
      { lead: 'Android:', text: 'press SCAN FOR NETWORKS and tap JOIN. For networks marked Password, type the password and press JOIN. Allow location access when asked.' },
      { lead: 'Android 10 and newer:', text: 'the first time, Android asks you to allow this app to suggest networks; tap Allow. If the phone does not switch, tap WI-FI PANEL and pick the network there.' },
      { lead: 'iPhone:', text: 'type the network name and password (leave the password empty for open networks), press JOIN NETWORK, then confirm the iOS prompt.' },
      { lead: 'Status:', text: 'the card shows the network you are on and whether the internet is working (Online, Connected but no internet, or Offline).' },
      { lead: 'LEAVE', text: 'disconnects from the current Wi-Fi. On Android 10 and newer it opens the Wi-Fi panel instead.' },
    ],
  },
  {
    title: 'ROV Control Screen',
    items: [
      { lead: 'Connection dot:', text: 'green CONNECTED means the phone is online. Red DISCONNECTED means no connection; red NO INTERNET means you are on a Wi-Fi network that has no internet.' },
      { lead: 'CONNECT', text: '(top right, shown when offline) opens the Wi-Fi panel so you can join a router or the bot\'s hotspot without leaving the screen.' },
      { lead: 'Gear icon', text: '(shown when online) opens the same Wi-Fi panel to see the network or leave it.' },
      { lead: 'Wi-Fi indicator:', text: 'the Wi-Fi icon turns green when online, and its arcs fill in with connection strength (all arcs lit = strong). The label shows GOOD, FAIR or POOR. A crossed-out icon means no connection. Tap it to open the Wi-Fi panel.' },
      { lead: 'Status bar', text: 'also shows the session timer and robot battery %.' },
    ],
  },
  {
    title: 'Driving the Robot',
    items: [
      { text: 'There are two drive pads, one on each side. Each pad has a FORWARD and a BACKWARD button that controls that side of the robot.' },
      { lead: 'Hold', text: 'a button to drive. Let go to stop that side. The button turns blue while it is active.' },
      { lead: 'Straight ahead:', text: 'hold FORWARD on both pads.' },
      { lead: 'Reverse:', text: 'hold BACKWARD on both pads.' },
      { lead: 'Turn right:', text: 'left FORWARD + right BACKWARD (spins in place), or left FORWARD only (wide turn).' },
      { lead: 'Turn left:', text: 'right FORWARD + left BACKWARD (spins in place), or right FORWARD only (wide turn).' },
    ],
  },
  {
    title: 'Reading the Display',
    items: [
      { lead: 'Battery', text: '(%) is shown in the status bar at the top.' },
      { lead: 'Compass', text: '(between the drive pads) shows the robot heading.' },
    ],
  },
  {
    title: 'Updating Task Status',
    items: [
      { lead: 'Task Status', text: 'tab: choose Task Completed, To Be Continued, or In Progress.' },
      { text: 'Add optional notes, then press UPDATE STATUS. The update is sent straight to the records system, with your login email and the time.' },
      { lead: 'No connection?', text: 'the update is saved on the phone and sent automatically once you are back online. The screen shows how many updates are waiting; RETRY NOW sends them immediately.' },
    ],
  },
  {
    title: 'Safety & Tips',
    items: [
      { lead: 'Battery:', text: 'the reading turns red below 20%. Drive the robot back before it runs out.' },
      { lead: 'Signal:', text: 'green is strong (above 70%), amber is fair, red is weak (below 40%). Stay within range.' },
      { lead: 'Emergency stop:', text: 'release all drive buttons to stop the robot.' },
      { lead: 'Finish:', text: 'disconnect the robot and log out when you are done.' },
    ],
  },
];

export default function UserManual({ isLandscape }: { isLandscape: boolean }) {
  return (
    <View style={styles.grid}>
      {SECTIONS.map((section, index) => (
        <View key={section.title} style={[styles.card, isLandscape && styles.cardHalf]}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>{section.title}</Text>
          </View>

          {section.items.map((item, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>
                {item.lead ? <Text style={styles.itemLead}>{item.lead} </Text> : null}
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: s(12),
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: s(16),
    padding: s(16),
  },
  cardHalf: {
    width: '49%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(10),
  },
  badge: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: COLORS.tealBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(10),
  },
  badgeText: {
    color: COLORS.teal,
    fontSize: f(12),
    fontWeight: '800',
  },
  cardTitle: {
    flex: 1,
    fontSize: f(14),
    fontWeight: '800',
    color: COLORS.textDark,
  },
  item: {
    flexDirection: 'row',
    marginBottom: s(6),
  },
  bullet: {
    color: COLORS.teal,
    fontSize: f(13),
    lineHeight: f(18),
    marginRight: s(8),
  },
  itemText: {
    flex: 1,
    fontSize: f(12),
    lineHeight: f(18),
    color: COLORS.textMuted,
  },
  itemLead: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
