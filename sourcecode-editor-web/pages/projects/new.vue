<template>
  <div>
    <h1>New Project</h1>
    <label>Name</label>
    <input v-model="project.name" type="text" />
    <label>URL</label>
    <input v-model="project.info.url" type="text" />
    <label>Username</label>
    <input v-model="project.info.username" type="text" />
    <button v-if="!loading" v-on:click="saveNew()">Add</button>
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
      project: { name: "", info: { url: "" } },
    };
  },
  async created() {},
  methods: {
    async saveNew() {
      if (this.project.name || this.project.info.url) {
        this.loading = true;
        await axios
          .post(
            `${(await Config.get()).SERVER_URL}/projects`,
            this.project,
            await AuthService.getAuthHeader()
          )
          .then(async (res) => {
            EventBus.emit(EventTypes.ALERT_MESSAGE, {
              type: "info",
              text: "Project Added",
            });
            const router = useRouter();
            router.push({
              path: "/projects",
            });
          })
          .catch(handleError);
        this.loading = false;
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
