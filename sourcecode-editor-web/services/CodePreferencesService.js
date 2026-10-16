export class CodePreferencesService {
  static STORAGE_KEYS = {
    LAST_PROJECT_ID: "code_preferences_last_project_id",
  };

  // Generic get/set for arbitrary preferences
  static set(key, value) {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }

  static get(key) {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  }

  static setLastProjectId(projectId) {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEYS.LAST_PROJECT_ID, projectId);
    }
  }

  static getLastProjectId() {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(this.STORAGE_KEYS.LAST_PROJECT_ID);
    }
    return null;
  }

  static clearLastProjectId() {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEYS.LAST_PROJECT_ID);
    }
  }

  static isValidProject(projectId, projects) {
    return projects.some((project) => project.projectId === projectId);
  }

  static setOpenTabs(projectId, paths) {
    this.set(
      `code_preferences_open_tabs_${projectId}`,
      JSON.stringify(paths)
    );
  }

  static getOpenTabs(projectId) {
    const raw = this.get(`code_preferences_open_tabs_${projectId}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  static setActiveTabPath(projectId, path) {
    this.set(`code_preferences_active_tab_${projectId}`, path || "");
  }

  static getActiveTabPath(projectId) {
    return this.get(`code_preferences_active_tab_${projectId}`);
  }
}
