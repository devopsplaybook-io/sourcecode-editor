<template>
  <nav>
    <ul class="menu-links">
      <li>
        <NuxtLink to="/" class="brand-link"
          ><img
            src="/images/icon.png"
            alt="Source Code Editor"
            class="nav-logo"
          />
          <strong>Code</strong></NuxtLink
        >
      </li>
    </ul>
    <ul class="menu-links">
      <li v-if="authenticationStore.isAuthenticated">
        <NuxtLink
          to="/code"
          :class="activeRoute == '/code' ? 'active' : 'inactive'"
          ><i class="bi bi-braces-asterisk"></i>
          <span class="nav-label">Code</span></NuxtLink
        >
      </li>
      <li v-if="authenticationStore.isAuthenticated">
        <NuxtLink
          to="/projects"
          :class="activeRoute == '/projects' ? 'active' : 'inactive'"
          ><i class="bi bi-journals"></i>
          <span class="nav-label">Projects</span></NuxtLink
        >
      </li>
      <li v-if="authenticationStore.isAuthenticated && gitHubStore.enabled">
        <NuxtLink
          to="/github"
          :class="activeRoute == '/github' ? 'active' : 'inactive'"
          ><i class="bi bi-github"></i>
          <span class="nav-label">GitHub</span></NuxtLink
        >
      </li>
      <li v-if="authenticationStore.isAuthenticated">
        <NotificationBell />
      </li>
      <li>
        <NuxtLink
          to="/users"
          :class="activeRoute == '/users' ? 'active' : 'inactive'"
          ><i class="bi bi-person-circle"></i>
          <span class="nav-label">Profile</span></NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { PreferencesService } from "~/services/PreferencesService";
const gitHubStore = GitHubStore();

// Initialize GitHub store on mount
gitHubStore.init();
</script>

<script>
import { SessionRenewalStart } from "~~/services/SessionRenewal";

export default {
  watch: {
    $route(to, from) {
      this.routeUpdated(to);
    },
  },
  data() {
    return {
      activeRoute: "",
      stopSessionRenewal: null,
    };
  },
  async created() {
    this.routeUpdated(this.$route);
    // Sliding session: renew on start, on focus/visibilitychange and when
    // less than 20% of the token lifetime remains.
    this.stopSessionRenewal = SessionRenewalStart();
    GitProjectsStore().fetch();
    PreferencesService.applyTheme();
  },
  beforeUnmount() {
    if (this.stopSessionRenewal) {
      this.stopSessionRenewal();
      this.stopSessionRenewal = null;
    }
  },
  methods: {
    routeUpdated(newRoute) {
      this.activeRoute = newRoute.fullPath.split("?")[0];
    },
  },
};
</script>

<style scoped>
.menu-links li {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
}
.menu-links li {
  padding-right: var(--pad-container);
  font-size: var(--font-icon-large);
}
.menu-links li a {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-inline);
}

.nav-logo {
  height: 1.4em;
  vertical-align: middle;
  margin-right: 0.5rem;
}

.menu-links .inactive {
  opacity: var(--opacity-disabled);
}
.menu-links .active {
  color: #3cabff;
}

/* Hide nav labels at <= 1000px, icon-only navigation */
@media (max-width: 1000px) {
  .nav-label {
    display: none;
  }
}
</style>
