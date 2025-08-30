<template>
  <div id="code-layout">
    <select v-model="selectedProjectId" @change="onProjectChange">
      <option disabled value="">Select a project</option>
      <option
        v-for="project in projects"
        :key="project.projectId"
        :value="project.projectId"
      >
        {{ project.name }}
      </option>
    </select>
    {{ files }}
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
      files: [],
      projects: [],
      selectedProjectId: null,
    };
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    await this.fetchProjects();
  },
  methods: {
    async fetchFiles() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.files = res.data.files;
        })
        .catch(handleError);
    },
    async fetchProjects() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.projects = res.data.projects;
        })
        .catch(handleError);
    },
    onProjectChange() {
      this.fetchFiles();
    },
  },
};
</script>

<style>
select {
  padding: 0.5em 1em;
  height: 2.6rem;
}
#code-layout {
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
</style>
