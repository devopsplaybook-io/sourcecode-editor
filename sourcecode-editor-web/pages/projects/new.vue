<template>
  <div>
    <h1>New Project</h1>
    <label>Name</label>
    <input v-model="project.name" type="text" />
    <label>URL</label>
    <input v-model="project.info.url" type="text" />
    <p v-if="urlError" class="field-error">{{ urlError }}</p>
    <label class="clone-option">
      <input type="checkbox" v-model="cloneAfterAdd" />
      Clone after adding
    </label>
    <button
      v-if="!loading"
      :disabled="addDisabled"
      v-on:click="saveNew()"
    >
      Add
    </button>
    <template v-if="loading">
      <Loading />
      <p v-if="cloneAfterAdd">Cloning repository…</p>
    </template>
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { AuthService } from "~~/services/AuthService";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { RepoUrlIsValid, RepoUrlNameFromUrl } from "~~/services/RepoUrl";

export default {
  data() {
    return {
      loading: false,
      project: { name: "", info: { url: "" } },
      cloneAfterAdd: true,
      suggestedName: "",
    };
  },
  computed: {
    urlError() {
      if (
        !this.project.info.url ||
        this.project.info.url.trim().length === 0
      ) {
        return "";
      }
      if (!RepoUrlIsValid(this.project.info.url)) {
        return "Invalid repository URL: use https://…, ssh://… or user@host:path format.";
      }
      return "";
    },
    addDisabled() {
      return !!this.urlError;
    },
  },
  watch: {
    "project.info.url"(url) {
      const suggestion = RepoUrlNameFromUrl(url);
      // Auto-suggest while the name is empty or still holds the previous
      // suggestion; never overwrite a name typed by the user.
      if (
        suggestion &&
        (this.project.name === "" ||
          this.project.name === this.suggestedName)
      ) {
        this.project.name = suggestion;
        this.suggestedName = suggestion;
      }
    },
  },
  methods: {
    async saveNew() {
      if (this.project.name || this.project.info.url) {
        if (this.urlError) {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "error",
            text: this.urlError,
          });
          return;
        }
        this.loading = true;
        await axios
          .post(
            `${(await Config.get()).SERVER_URL}/projects`,
            {
              name: this.project.name,
              info: this.project.info,
              clone: this.cloneAfterAdd,
            },
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

<style scoped>
.field-error {
  color: #e53935;
  margin: 0.2em 0 0.8em 0;
}
.clone-option {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
</style>
