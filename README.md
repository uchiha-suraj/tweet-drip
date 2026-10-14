# 🐦 Tweet Drip — random-interval tweet reminders

Write your tweets up front, choose how many to post and over how many days, and the app sends you a notification at random times. Tap the notification, copy the tweet (or hit **Post on 𝕏**) and you're done.

## Run it

> ⚠️ **Expo Go won't work on Android.** From SDK 53 onward, `expo-notifications` throws an error inside Expo Go on Android, so this app runs as its own installed build instead.

### Option A — Just use it (standalone APK, no laptop needed afterwards)
```bash
npm install
npm install -g eas-cli
eas login                 # free Expo account
npm run build:apk         # builds in Expo's cloud (~10–15 min)
```
Open the link/QR code it prints on your phone, then download and install the APK. Allow "install unknown apps" if Android asks.

### Option B — Develop with hot reload (development build)
```bash
npm install
npm run build:dev         # one-time: installs a "Tweet Drip" dev app on your phone
npx expo start            # then open the dev app and scan the QR code
```
You only rebuild when you add a native package. JS/UI changes hot-reload as usual.

(If you have Android Studio + a USB-connected phone, `npx expo run:android` builds locally instead of in the cloud.)

### After installing
On first launch, allow notifications. On Android 14+, also allow **Alarms & reminders** for the app (Settings → Apps → Tweet Drip). Without it, Android may deliver reminders a few minutes late.

## How it works

| Setting | Rule |
|---|---|
| Tweets | 1 to 15 per day (so up to 45 over 3 days) |
| Days | 1, 2 or 3 (24h each, counted from when you hit *Schedule*) |
| Min gap | at least 30 min; the actual gaps are random but never shorter than this |

**Scheduling algorithm** (`src/scheduler.ts`): tweets are split evenly across the days. For each day, the app takes the free time left after the required gaps, picks random offsets inside it, sorts them, and adds the gaps back. Every arrangement is equally likely, and the minimum gap holds every time. Use **🎲 Reroll** on the review screen to pick new times.

Reminders are local notifications (`expo-notifications`), so they fire even when the app is closed. No server or X API is needed.

## Project layout

```
App.tsx                      root: state, notification taps, confetti
src/scheduler.ts             validation + random time generation
src/notifications.ts         permissions, Android channel, schedule/cancel
src/storage.ts               AsyncStorage persistence (plan + draft)
src/screens/SetupScreen.tsx  3-step wizard: Rhythm → Tweets → Launch
src/screens/DashboardScreen.tsx  countdown, progress, timeline
src/components/              TweetModal, Stepper, GradientButton, Confetti
```

## Notes
- **Post on 𝕏** tries the X app with the tweet pre-filled (`twitter://post?message=`), then falls back to `x.com/intent/post`. It always copies the text first.
- Marking a tweet *posted* or *skipped* early cancels its reminder; **Undo** schedules it again.
- On some Android phones, battery optimisation can delay notifications by a few minutes. Turning off battery optimisation for Expo Go (or for your own build) fixes this.
