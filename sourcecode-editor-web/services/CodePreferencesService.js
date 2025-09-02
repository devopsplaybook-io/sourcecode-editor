export class CodePreferencesService {
  static STORAGE_KEYS = {
    LAST_PROJECT_ID: "code_preferences_last_project_id",
  };

  /**
   * Save the last selected project ID
   * @param {string} projectId - The project ID to save
   */
  static setLastProjectId(projectId) {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEYS.LAST_PROJECT_ID, projectId);
    }
  }

  /**
   * Get the last selected project ID
   * @returns {string|null} The last selected project ID or null if not found
   */
  static getLastProjectId() {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(this.STORAGE_KEYS.LAST_PROJECT_ID);
    }
    return null;
  }

  /**
   * Clear the last selected project ID
   */
  static clearLastProjectId() {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEYS.LAST_PROJECT_ID);
    }
  }

  /**
   * Check if a project ID exists in the given projects list
   * @param {string} projectId - The project ID to check
   * @param {Array} projects - Array of project objects
   * @returns {boolean} True if project exists, false otherwise
   */
  static isValidProject(projectId, projects) {
    return projects.some((project) => project.projectId === projectId);
  }
}
