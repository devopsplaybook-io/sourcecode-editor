<template>
  <div ref="bellRoot" class="notification-bell">
    <i
      :class="store.unreadCount > 0 ? 'bi bi-bell-fill' : 'bi bi-bell'"
      class="bell-icon"
      title="Notifications"
      @click="togglePanel"
    ></i>
    <span v-if="store.unreadCount > 0" class="bell-badge">{{
      store.unreadCount > 99 ? "99+" : store.unreadCount
    }}</span>
    <div v-if="panelOpen" class="bell-panel">
      <div class="bell-panel-header">
        <strong>Notifications</strong>
        <button
          v-if="store.notifications.length > 0"
          class="bell-mark-read"
          @click="store.markAllRead()"
        >
          Mark all read
        </button>
      </div>
      <div v-if="store.notifications.length === 0" class="bell-empty">
        No notifications
      </div>
      <div v-else class="bell-list">
        <div
          v-for="notification in store.notifications"
          :key="notification.id"
          class="bell-item"
          :class="{ 'bell-item-unread': !notification.read }"
          @click="openNotification(notification)"
        >
          <i
            class="bell-item-icon"
            :class="
              notification.severity === 'error'
                ? 'bi bi-x-circle-fill bell-item-error'
                : 'bi bi-info-circle bell-item-info'
            "
          ></i>
          <span class="bell-item-body">
            <span class="bell-item-title">{{ notification.title }}</span>
            <span class="bell-item-time">{{ relativeTime(notification.ts) }}</span>
          </span>
        </div>
      </div>
      <div v-if="store.notifications.length > 0" class="bell-panel-footer">
        <button class="bell-clear" @click="store.clear()">Clear all</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      panelOpen: false,
    };
  },
  computed: {
    store() {
      return NotificationStore();
    },
  },
  mounted() {
    this.store.init();
    document.addEventListener("click", this.onDocumentClick);
  },
  unmounted() {
    document.removeEventListener("click", this.onDocumentClick);
  },
  methods: {
    togglePanel() {
      this.panelOpen = !this.panelOpen;
    },
    onDocumentClick(event) {
      if (
        this.panelOpen &&
        this.$refs.bellRoot &&
        !this.$refs.bellRoot.contains(event.target)
      ) {
        this.panelOpen = false;
      }
    },
    openNotification(notification) {
      this.store.markRead(notification.id);
      this.panelOpen = false;
      if (notification.url) {
        window.open(notification.url, "_blank");
      } else {
        useRouter().push("/github");
      }
    },
    relativeTime(ts) {
      const seconds = Math.floor((Date.now() - ts) / 1000);
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} h ago`;
      const days = Math.floor(hours / 24);
      return `${days} d ago`;
    },
  },
};
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.bell-icon {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.bell-icon:hover {
  opacity: 1;
}
.bell-badge {
  position: absolute;
  top: -0.5em;
  right: -0.8em;
  background: var(--pico-del-color, #b04a4a);
  color: #fff;
  font-size: 0.65em;
  font-weight: 600;
  border-radius: 1em;
  padding: 0 0.35em;
  line-height: 1.4;
  pointer-events: none;
}
.bell-panel {
  position: absolute;
  top: calc(100% + 0.5em);
  right: 0;
  width: min(24rem, 90vw);
  max-height: 24rem;
  overflow-y: auto;
  background: var(--pico-card-background-color, #1a1d1e);
  border: 1px solid var(--pico-muted-border-color, #333);
  border-radius: var(--pico-border-radius, 4px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.4);
  z-index: 1100;
  font-size: var(--font-body);
}
.bell-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6em 0.8em;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
}
.bell-mark-read,
.bell-clear {
  background: none;
  border: none;
  color: var(--pico-primary, #3cabff);
  cursor: pointer;
  font-size: var(--font-meta);
  padding: 0;
}
.bell-list {
  display: grid;
}
.bell-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  padding: 0.6em 0.8em;
  cursor: pointer;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
}
.bell-item:last-child {
  border-bottom: none;
}
.bell-item:hover {
  background: color-mix(in srgb, var(--pico-primary, #3cabff) 8%, transparent);
}
.bell-item-unread {
  font-weight: 600;
}
.bell-item-icon {
  font-size: var(--font-icon);
  margin-top: 0.15em;
  flex-shrink: 0;
}
.bell-item-error {
  color: var(--pico-del-color, #b04a4a);
}
.bell-item-info {
  color: var(--pico-primary, #3cabff);
}
.bell-item-body {
  display: grid;
  gap: 0.15em;
  min-width: 0;
}
.bell-item-title {
  overflow-wrap: anywhere;
}
.bell-item-time {
  font-size: var(--font-meta);
  opacity: var(--opacity-muted, 0.6);
  font-weight: 400;
}
.bell-empty {
  padding: 1.2em 0.8em;
  text-align: center;
  opacity: var(--opacity-muted, 0.6);
  font-style: italic;
}
.bell-panel-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.4em 0.8em;
  border-top: 1px solid var(--pico-muted-border-color, #333);
}
</style>
