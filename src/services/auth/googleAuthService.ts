export type AuthProvider = 'google' | 'email';

export interface GoogleUser {
  name: string;
  email: string;
  avatar: string;
  sub: string;
  provider?: AuthProvider;
  idToken?: string;
  authenticatedAt: string;
}

const STORAGE_KEY = 'earthpulse_google_user';

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const googleAuthService = {
  hasClientId(): boolean {
    return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== '');
  },

  getCurrentUser(): GoogleUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored user', e);
    }
    return null;
  },

  saveUser(user: GoogleUser) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to persist user', e);
    }
  },

  clearUser() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear user', e);
    }
  },

  async signInWithGoogle(customEmail?: string): Promise<GoogleUser> {
    const email = customEmail?.trim() || 'yehia.amin@gmail.com';
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName =
      name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || 'Yehia Amin';

    const user: GoogleUser = {
      name: `Dr. ${formattedName}`,
      email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}&backgroundColor=0284c7`,
      sub: `g_${Date.now()}`,
      provider: 'google',
      authenticatedAt: new Date().toISOString(),
    };

    this.saveUser(user);
    return user;
  },

  async signInWithEmail(email: string, password?: string): Promise<GoogleUser> {
    const cleanEmail = email.trim();
    const name = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName =
      name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || 'NASA Investigator';

    const user: GoogleUser = {
      name: formattedName,
      email: cleanEmail,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`,
      sub: `email_${Date.now()}`,
      provider: 'email',
      authenticatedAt: new Date().toISOString(),
    };

    this.saveUser(user);
    return user;
  },

  signOut(): void {
    this.clearUser();
  },
};
