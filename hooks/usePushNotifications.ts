import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {

  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | undefined
  >();

  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  async function registerForPushNotificationsAsync() {
    let token;
    // We allow getting tokens on Android Emulators too.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.error('Failed to get push token for push notification');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      try {
        token = await Notifications.getExpoPushTokenAsync({
          projectId: 'e9d43593-5d0a-478f-9177-4978e4560931'
        });
      } catch (e) {
        if (__DEV__) console.log('Error getting token', e);
      }
    } else {
      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  useEffect(() => {
    // setNotificationHandler must be called once on mount, not during render
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldShowBanner: true,  // แสดงเป็น heads-up / banner (แทน shouldShowAlert)
        shouldShowList: true,    // แสดงใน notification center / shade (แทน shouldShowAlert)
        shouldSetBadge: false,
      }),
    });

    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (__DEV__ && token) {
        console.log('--- Expo Push Token ---');
        console.log(token.data);
        console.log('-----------------------');
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        if (__DEV__) console.log('[Push] Notification response received');
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
