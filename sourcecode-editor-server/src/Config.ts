import { ConfigBase } from "@devopsplaybook.io/common-utils";
import { OTelLogger } from "./OTelContext";

const logger = OTelLogger().createModuleLogger("config");

export class Config extends ConfigBase {
  public PROJECTS_SYNC_FREQUENCY = 3_600_000;
  public GIT_USERNAME = "";
  public GIT_EMAIL = "";
  public LLM_API_KEY = "";
  public LLM_API_URL = "https://api.deepseek.com/chat/completions";
  public LLM_MODEL = "deepseek-chat";
  public GITHUB_TOKEN = "";
  public GITHUB_SYNC_FREQUENCY = 300_000;

  constructor() {
    super("sourcecode-editor-server");

    this.addConfigField({ field: "PROJECTS_SYNC_FREQUENCY" });
    this.addConfigField({ field: "GIT_USERNAME" });
    this.addConfigField({ field: "GIT_EMAIL" });
    this.addConfigField({ field: "LLM_API_KEY", sensitive: true });
    this.addConfigField({ field: "LLM_API_URL" });
    this.addConfigField({ field: "LLM_MODEL" });
    this.addConfigField({ field: "GITHUB_TOKEN", sensitive: true });
    this.addConfigField({ field: "GITHUB_SYNC_FREQUENCY" });
  }

  public async reload(): Promise<void> {
    await super.reload((message: string) => logger.info(message));
  }
}
