const CLIENT_ID = '1397698478805069'
const SCOPES = 'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement,pages_show_list,business_management,instagram_manage_comments,pages_messaging'

export function buildInstagramOAuthUrl(userId: string): string {
  const redirectUri = `${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/instagram-auth`
  return `https://www.facebook.com/v25.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${SCOPES}&response_type=code&state=${encodeURIComponent(userId)}`
}
