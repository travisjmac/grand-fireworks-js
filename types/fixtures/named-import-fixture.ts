/**
 * Verifies the named-import consumer path: `import { GrandFireworks }`.
 *
 * Some TypeScript consumers use a named import instead of the default import.
 * This fixture guarantees that path type-checks and exposes the full instance
 * contract with static members. It is not shipped and never runs.
 */
import { GrandFireworks, GrandFireworksOptions, Stats } from '../../index';

const options: GrandFireworksOptions = {
  baseStyle: 'spectacle',
  renderer: { preferred: 'canvas2d' },
  show: { enabledTypes: ['royal_palm', 'crown_jewel'] },
  sound: { boomStyle: 'rolling' },
};

const engine = new GrandFireworks(options);

const stats: Stats = engine.getStats();
const state: string = stats.state;

const started: GrandFireworks = engine.start({ duration: 3000 });
started.setStyle('mixed').launchWorldEnder({ maxChainDepth: 4 }).setMuted(false);

const version: string = GrandFireworks.VERSION;
const defaultColors: string[] | undefined = undefined;
void version;
void state;

// Referenced so nothing is report-unused under strict settings.
const namedResult: { instance: GrandFireworks; version: string; defaultColors: typeof defaultColors } = {
  instance: engine,
  version,
  defaultColors,
};
export default namedResult;
