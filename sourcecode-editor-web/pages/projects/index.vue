<template>
  <div id="projects-layout">
    <div id="projects-actions" class="actions">
      <i class="bi bi-arrow-clockwise" v-on:click="refresh()"></i>
      <NuxtLink to="/projects/new"><i class="bi bi-plus-square"></i></NuxtLink>
    </div>
    <div v-for="project in projects" :key="project.id" class="project-card">
      <div class="project-name">{{ project.name }}</div>
      <div class="project-controls">
        <select v-model="selectedBranches[project.id]" class="branch-select">
          <option
            v-for="branch in getBranches(project)"
            :key="branch"
            :value="branch"
          >
            {{ branch }}
          </option>
        </select>
        <button @click="cloneProject(project)">Clone</button>
        <button @click="pullProject(project)">Pull</button>
        <button @click="commitProject(project)">Commit</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";

export default {
  data() {
    return {
      projects: [],
      selectedBranches: {},
    };
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    this.fetchProjects();
  },
  methods: {
    async fetchProjects() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.projects = res.data.projects;
          // Initialize selectedBranches with default branch for each project
          this.projects.forEach((project) => {
            this.$set(
              this.selectedBranches,
              project.id,
              this.getBranches(project)[0]
            );
          });
          console.log(res.data);
        })
        .catch(handleError);
    },
    getBranches(project) {
      // Placeholder: Replace with actual branch list per project if available
      return project.branches || ["main", "dev", "feature"];
    },
    async cloneProject(project) {
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/clone`,
          {},
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Repository Cloned",
          });
        })
        .catch(handleError);
    },
    pullProject(project) {
      // Placeholder for pull logic
      alert(
        `Pull ${project.name} on branch ${this.selectedBranches[project.id]}`
      );
    },
    commitProject(project) {
      // Placeholder for commit logic
      alert(
        `Commit on ${project.name} branch ${this.selectedBranches[project.id]}`
      );
    },
    refresh() {
      this.fetchProjects();
    },
  },
};
</script>

<style>
#object-layout {
  display: grid;
  max-height: 100%;
  height: auto;
  grid-template-rows: auto auto 1fr;
}
#object-actions {
  display: grid;
  grid-template-columns: 1fr auto;
}
#object-actions span {
  padding-top: 0.3rem;
}
#object-search {
  padding-top: 0.5em;
  padding-bottom: 0.5em;
  padding-left: 3em;
  height: 2.6rem;
}

#object-list {
  overflow-x: auto;
  overflow-y: auto;
  height: 100%;
  width: 100%;
}
#object-list td {
  white-space: nowrap;
}

#object-list td,
#object-list pre,
#object-list div,
#object-list span,
#object-list p {
  font-size: 0.9em;
}

/* Add some basic styling for project cards and controls */
.project-card {
  border: 1px solid #ddd;
  border-radius: 6px;
  margin: 1em 0;
  padding: 1em;
}
.project-name {
  font-weight: bold;
  margin-bottom: 0.5em;
}
.project-controls {
  display: flex;
  gap: 0.5em;
  align-items: center;
}
.branch-select {
  min-width: 100px;
}
</style>
