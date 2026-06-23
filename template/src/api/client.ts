import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)

pb.afterSend = (response, data) => {
  if (response.status === 401 && window.location.pathname !== '/login') {
    pb.authStore.clear()
    window.location.replace('/login')
  }
  return data
}
