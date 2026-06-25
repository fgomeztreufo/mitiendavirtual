import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '../config/firebase'
import { supabase } from '../supabaseClient'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

interface PushState {
  supported: boolean
  permission: NotificationPermission | 'loading'
  token: string | null
}

export function usePushNotifications(userId: string) {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'loading',
    token: null,
  })

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window
    setState(prev => ({
      ...prev,
      supported,
      permission: supported ? Notification.permission : 'denied',
    }))
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const messaging = await getFirebaseMessaging()
      if (!messaging) return false

      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission }))
      if (permission !== 'granted') return false

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready

      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!fcmToken) return false

      const { error } = await supabase
        .from('user_notification_configs')
        .upsert({
          user_id: userId,
          channel_type: 'push',
          is_active: true,
          config: {
            fcm_token: fcmToken,
            subscribed_at: new Date().toISOString(),
            user_agent: navigator.userAgent.slice(0, 200),
          },
        }, { onConflict: 'user_id, channel_type' })

      if (error) {
        console.error('Error saving push token:', error)
        return false
      }

      setState(prev => ({ ...prev, token: fcmToken }))

      onMessage(messaging, (payload) => {
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'MiTiendaVirtual', {
            body: payload.notification?.body || '',
            icon: '/images/icon-192.png',
          })
        }
      })

      return true
    } catch (err) {
      console.error('Push subscription error:', err)
      return false
    }
  }, [userId])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_notification_configs')
        .update({ is_active: false, config: {} })
        .eq('user_id', userId)
        .eq('channel_type', 'push')

      if (error) return false
      setState(prev => ({ ...prev, token: null }))
      return true
    } catch {
      return false
    }
  }, [userId])

  return { ...state, subscribe, unsubscribe }
}
