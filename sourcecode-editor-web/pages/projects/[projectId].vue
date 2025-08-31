<template>
  <div>
    <h1>Edit Project</h1>
    <label>Name</label>
    <input v-model="project.name" type="text" />
    <label>URL</label>
    <input v-model="project.info.url" type="text" />
    <label>Username</label>
    <input v-model="project.info.username" type="text" />
    <button v-if="!loading" v-on:click="updateProject()">Update</button>
    <Loading v-if="loading" />
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { AuthService } from "~~/services/AuthService";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";

export default {
  data() {
    return {
      loading: false,
      project: { projectId: "", name: "", info: { url: "" } },
    };
  },
  async created() {
    const projectId = useRoute().params.projectId;
    this.loading = true;
    const res = await axios
      .get(
        `${(await Config.get()).SERVER_URL}/projects/${projectId}`,
        await AuthService.getAuthHeader()
      )
      .then((res) => {
        this.project = res.data;
      })
      .catch(handleError)
      .finally(() => {
        this.loading = false;
      });
  },
  methods: {
    async updateProject() {
      if (
        this.project.name ||
        this.project.info.url ||
        this.project.info.username
      ) {
        this.loading = true;
        axios
          .put(
            `${(await Config.get()).SERVER_URL}/projects/${
              this.project.projectId
            }`,
            this.project,
            await AuthService.getAuthHeader()
          )
          .then(() => {
            EventBus.emit(EventTypes.ALERT_MESSAGE, {
              type: "info",
              text: "Project Updated",
            });
            useRouter().push({ path: "/projects" });
          })
          .catch(handleError)
          .finally(() => {
            this.loading = false;
          });
      } else {
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "error",
          text: "Missing Information",
        });
      }
    },
  },
};
</script>
