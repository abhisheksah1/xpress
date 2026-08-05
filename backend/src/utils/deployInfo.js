import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEPLOY_INFO_PATH = path.join(__dirname, '../../deploy-info.json');

const processStartedAt = new Date().toISOString();

/**
 * Read deploy stamp written by deploy.sh (or build). Falls back to process start time.
 */
export function getDeployInfo() {
  let deployedAt = null;
  let gitSha = null;
  let source = 'process-start';

  try {
    if (fs.existsSync(DEPLOY_INFO_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DEPLOY_INFO_PATH, 'utf8'));
      if (raw?.deployedAt) {
        deployedAt = String(raw.deployedAt);
        gitSha = raw.gitSha ? String(raw.gitSha) : null;
        source = raw.source || 'deploy';
      }
    }
  } catch {
    /* ignore corrupt file */
  }

  return {
    deployedAt: deployedAt || processStartedAt,
    serverStartedAt: processStartedAt,
    gitSha,
    source: deployedAt ? source : 'process-start',
    hasDeployStamp: Boolean(deployedAt),
  };
}

/** Write deploy-info.json (used by deploy.sh / local stamp script). */
export function writeDeployInfo({ deployedAt = new Date().toISOString(), gitSha = null, source = 'manual' } = {}) {
  const payload = {
    deployedAt,
    gitSha,
    source,
  };
  fs.writeFileSync(DEPLOY_INFO_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}
