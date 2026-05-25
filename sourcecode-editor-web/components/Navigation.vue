<template>
  <nav>
    <ul class="menu-links">
      <li>
        <NuxtLink to="/"><strong>Code</strong></NuxtLink>
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
import { AuthService } from "~~/services/AuthService";
import { PreferencesService } from "~/services/PreferencesService";
const authenticationStore = AuthenticationStore();
const gitHubStore = GitHubStore();

// Initialize GitHub store on mount
gitHubStore.init();
</script>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";

export default {
  watch: {
    $route(to, from) {
      this.routeUpdated(to);
    },
  },
  data() {
    return {
      activeRoute: "",
    };
  },
  async created() {
    this.routeUpdated(this.$route);
    if (await AuthenticationStore().ensureAuthenticated()) {
      setTimeout(async () => {
        // Renew session tocken
        axios
          .post(
            `${(await Config.get()).SERVER_URL}/users/session`,
            {},
            await AuthService.getAuthHeader(),
          )
          .then((res) => {
            AuthService.saveToken(res.data.token);
          });
      }, 10000);
    }
    GitProjectsStore().fetch();
    PreferencesService.applyTheme();
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
