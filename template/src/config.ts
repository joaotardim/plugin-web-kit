interface CompanyIdentity {
  name: string
  loginButtonText: string
  primaryColor: string
  primaryColorHover: string
}

const IDENTITIES: Partial<Record<string, CompanyIdentity>> = {
  litoral: {
    name: 'Litoral',
    loginButtonText: 'Entrar com conta Litoral',
    primaryColor: '#0f62fe',
    primaryColorHover: '#0353e9',
  },
  fotus: {
    name: 'Fotus',
    loginButtonText: 'Entrar com conta Fotus',
    primaryColor: '#0f62fe',
    primaryColorHover: '#0353e9',
  },
}

export const config: CompanyIdentity =
  IDENTITIES[import.meta.env.VITE_COMPANY ?? ''] ?? {
    name: 'CSC Web Kit',
    loginButtonText: 'Entrar',
    primaryColor: '#0f62fe',
    primaryColorHover: '#0353e9',
  }
