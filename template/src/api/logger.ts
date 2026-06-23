type Properties = Record<string, string | number | boolean | undefined>

let appInsights: { trackEvent: (name: string, properties?: Properties) => void } | null = null

async function getAppInsights() {
  const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING
  if (!connectionString || appInsights) return appInsights

  try {
    const { ApplicationInsights } = await import('@microsoft/applicationinsights-web')
    const instance = new ApplicationInsights({
      config: { connectionString },
    })
    instance.loadAppInsights()
    appInsights = instance
  } catch {
    // package not installed — fall through to console.log
  }

  return appInsights
}

export async function logEvent(name: string, properties?: Properties): Promise<void> {
  const ai = await getAppInsights()

  if (ai) {
    ai.trackEvent(name, properties)
    return
  }

  console.log('[logEvent]', name, properties)
}
