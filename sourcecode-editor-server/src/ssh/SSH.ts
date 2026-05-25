import { Span } from "@opentelemetry/sdk-trace-base";
import { ensureDir } from "fs-extra";
import fs from "fs/promises";
import path from "path";
import { Config } from "../Config";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { SystemCommandExecute } from "../utils-std-ts/SystemCommand";

let config: Config;
let sshConfigFolder = "";
const logger = OTelLogger().createModuleLogger("SSH");

export async function SSHInit(context: Span, configIn: Config): Promise<void> {
  const span = OTelTracer().startSpan("SSHInit", context);
  config = configIn;
  sshConfigFolder = path.join(config.DATA_DIR, "/ssh_config/ssh_config");
  await ensureDir(sshConfigFolder);
  const privateKeyPath = path.join(sshConfigFolder, "id_rsa");
  try {
    await fs.access(privateKeyPath);
  } catch {
    logger.info("Generating new SSH key pair", span);
    await SystemCommandExecute(
      span,
      `ssh-keygen -t rsa -b 4096 -f "${privateKeyPath}" -N "" -q`
    );
    logger.info("SSH key pair generated.", span);
  }
  span.end();
}

export async function SSHGetPublicKey(context: Span): Promise<string> {
  const span = OTelTracer().startSpan("SSHGetPubkicKey", context);
  try {
    const publicKeyPath = path.join(sshConfigFolder, "id_rsa.pub");
    const pubKey = await fs.readFile(publicKeyPath, "utf8");
    span.end();
    return pubKey.trim();
  } catch (err) {
    logger.error("Failed to read SSH public key", err, span);
    span.end();
    throw err;
  }
}

export async function SSHGetPrivateKeyPath(context: Span): Promise<string> {
  const span = OTelTracer().startSpan("SSHGetPrivateKeyPath", context);
  try {
    const privateKeyPath = path.resolve(path.join(sshConfigFolder, "id_rsa"));
    await fs.access(privateKeyPath);
    span.end();
    return privateKeyPath;
  } catch (err) {
    logger.error("Failed to access SSH private key", err, span);
    span.end();
    throw err;
  }
}
