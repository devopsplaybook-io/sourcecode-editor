import { jwtDecode } from "jwt-decode";
import { AuthService } from "~~/services/AuthService";

export const AuthenticationStore = defineStore("AuthenticationStore", {
  state: () => ({
    isAuthenticated: false,
    userId: null as string | null,
    userName: null as string | null,
    role: null as string | null,
    scopes: [] as string[],
  }),

  getters: {
    isAdmin: (state): boolean => state.role === "admin",
  },

  actions: {
    async ensureAuthenticated(): Promise<boolean> {
      this.isAuthenticated = await AuthService.isAuthenticated();
      return this.isAuthenticated;
    },

    async refreshFromToken(): Promise<void> {
      const token = await AuthService.getToken();
      if (!token) {
        this.isAuthenticated = false;
        this.userId = null;
        this.userName = null;
        this.role = null;
        this.scopes = [];
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decoded = jwtDecode(token) as any;
        this.isAuthenticated = true;
        this.userId = decoded.userId || null;
        this.userName = decoded.userName || null;
        this.role = decoded.role || null;
        this.scopes = decoded.scopes || [];
      } catch {
        this.isAuthenticated = false;
        this.userId = null;
        this.userName = null;
        this.role = null;
        this.scopes = [];
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(AuthenticationStore, import.meta.hot));
}
