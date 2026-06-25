import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '../config/firebase'
import { supabase } from '../supabaseClient'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

function getDeviceId(): string {
  let id = localStorage.getItem('mtv_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('mtv_device_id', id)
  }
  return id
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad/i.test(ua)) return 'iOS'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows'
  return 'Desktop'
}

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

    if (supported && Notification.permission === 'granted') {
      getFirebaseMessaging().then(messaging => {
        if (!messaging) return
        onMessage(messaging, (payload) => {
          console.log('[Push] Foreground message:', payload)
          new Notification(payload.notification?.title || 'MiTiendaVirtual', {
            body: payload.notification?.body || '',
            icon: '/images/icon-192.png',
          })
        })
      }).catch(() => {})
    }
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

      const deviceId = getDeviceId()
      const deviceLabel = getDeviceLabel()

      const { data: existing } = await supabase
        .from('user_notification_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('channel_type', 'push')
        .single()

      const currentDevices: any[] = existing?.config?.devices || []
      const filtered = currentDevices.filter((d: any) => d.device_id !== deviceId)
      filtered.push({
        device_id: deviceId,
        fcm_token: fcmToken,
        device_label: deviceLabel,
        subscribed_at: new Date().toISOString(),
      })

      const { error } = await supabase
        .from('user_notification_configs')
        .upsert({
          user_id: userId,
          channel_type: 'push',
          is_active: true,
          config: {
            devices: filtered,
            fcm_token: fcmToken,
          },
        }, { onConflict: 'user_id, channel_type' })

      if (error) {
        console.error('Error saving push token:', error)
        return false
      }

      setState(prev => ({ ...prev, token: fcmToken }))

      return true
    } catch (err) {
      console.error('Push subscription error:', err)
      return false
    }
  }, [userId])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const deviceId = getDeviceId()

      const { data: existing } = await supabase
        .from('user_notification_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('channel_type', 'push')
        .single()

      const currentDevices: any[] = existing?.config?.devices || []
      const filtered = currentDevices.filter((d: any) => d.device_id !== deviceId)

      if (filtered.length === 0) {
        const { error } = await supabase
          .from('user_notification_configs')
          .update({ is_active: false, config: {} })
          .eq('user_id', userId)
          .eq('channel_type', 'push')
        if (error) return false
      } else {
        const { error } = await supabase
          .from('user_notification_configs')
          .update({ config: { devices: filtered, fcm_token: filtered[0].fcm_token } })
          .eq('user_id', userId)
          .eq('channel_type', 'push')
        if (error) return false
      }

      setState(prev => ({ ...prev, token: null }))
      return true
    } catch {
      return false
    }
  }, [userId])

  return { ...state, subscribe, unsubscribe }
}
