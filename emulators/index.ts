import EmulatorPlugin from './lib/EmulatorPlugin';
import EmulatorPluginStatics, { IEmulatorPluginStatics } from './lib/EmulatorPluginStatics';
import Utils from './lib/Utils';
import UserAgents from './lib/UserAgents';
import Browsers from './data/browsers.json';
import Log from '@secret-agent/commons/Logger';

// tslint:disable:variable-name

const { log } = Log(module);

export default class Emulators {
  public static defaultEmulatorId: string;
  private static readonly pluginsById: { [emulatorId: string]: IEmulatorPluginStatics } = {};

  private static readonly pluginUsageDistribution: string[] = [];

  public static load(EmulatorPluginImpl: IEmulatorPluginStatics) {
    if (!this.defaultEmulatorId) this.defaultEmulatorId = EmulatorPluginImpl.emulatorId;
    this.pluginsById[EmulatorPluginImpl.emulatorId] = EmulatorPluginImpl;

    const statCounterUsage = Browsers.browsers.find(
      y => y.browser === EmulatorPluginImpl.statcounterBrowser,
    );

    const usagePct = statCounterUsage?.usage ?? 0;

    if (!usagePct) {
      log.warn("Browser plugin doesn't have a usage percent in the wild!", {
        sessionId: null,
        emulatorId: EmulatorPluginImpl.emulatorId,
      });
    }
    for (let i = 0; i < usagePct; i += 1) {
      this.pluginUsageDistribution.push(EmulatorPluginImpl.emulatorId);
    }
  }

  public static create(emulatorId: string) {
    let SelectedPlugin = this.pluginsById[emulatorId];
    if (!SelectedPlugin) {
      const fromShortId = `@secret-agent/emulate-${emulatorId}`;
      try {
        SelectedPlugin = require(fromShortId)?.default;
      } catch (err) {
        // try as full package name
        SelectedPlugin = require(emulatorId)?.default;
      }
      if (SelectedPlugin) Emulators.load(SelectedPlugin);
    }
    if (!SelectedPlugin) {
      throw new Error(`Emulator could not be found: ${emulatorId}`);
    }
    return new SelectedPlugin();
  }

  public static getId(emulatorId?: string) {
    if (!emulatorId) {
      return this.defaultEmulatorId;
    }
    if (emulatorId === 'random') {
      return this.getRandomId();
    }
    return emulatorId;
  }

  public static getRandomId(): string {
    return Utils.pickRandom(this.pluginUsageDistribution);
  }
}

export { EmulatorPlugin, EmulatorPluginStatics, Utils, UserAgents };
