import { Agent, lookup } from 'useragent';
import IUserAgent from '../interfaces/IUserAgent';
import records from '../data/user-agents.json';

interface IFilterOptions {
  deviceCategory: string;
  vendor?: string;
  family: string;
  versionMajor: number;
  versionMinor?: number;
  operatingSystems?: IOperatingSystemFilter[];
}

interface IOperatingSystemFilter {
  family: 'Ubuntu' | 'Linux' | 'Windows' | 'Mac OS X';
  versionMajor?: string;
  versionMinor?: string;
}

export default class UserAgents {
  public static getList(filter: IFilterOptions, defaultAgents: string[]): IUserAgent[] {
    const userAgents: { [key: string]: IUserAgent } = {};
    for (const record of records) {
      const agent = lookup(record.userAgent);
      const userAgent = this.convertAgent(agent, record);
      if (this.matchesFilter(filter, userAgent)) {
        userAgents[userAgent.raw] = userAgent;
      }
    }
    for (const agent of defaultAgents) {
      if (!userAgents[agent]) {
        userAgents[agent] = this.convertDesktopAgent(agent);
      }
    }
    return Object.values(userAgents);
  }

  public static convertDesktopAgent(useragent: string): IUserAgent {
    const agent = lookup(useragent);
    let platform = 'MacIntel';
    if (useragent.includes('Windows')) platform = 'Win32';
    let vendor = 'Google Inc.';
    if (agent.family === 'Safari') {
      vendor = 'Apple Computer, Inc.';
    }

    let match: any = {};
    for (const record of records) {
      const recordAgent = lookup(record.userAgent);
      // if same browser family and os, use this record
      if (
        agent.family === recordAgent.family &&
        agent.os.family === recordAgent.os.family &&
        agent.os.major === recordAgent.os.major
      ) {
        match = record;
        break;
      }
    }

    return this.convertAgent(agent, {
      platform: match.platform ?? platform,
      vendor: match.vendor ?? vendor,
      userAgent: useragent,
      deviceCategory: 'desktop',
    });
  }

  public static findOne(filter: IFilterOptions): IUserAgent {
    for (const record of records) {
      const agent = lookup(record.userAgent);
      const userAgent = this.convertAgent(agent, record);
      if (this.matchesFilter(filter, userAgent)) {
        return userAgent;
      }
    }
    return null;
  }

  public static convertAgent(
    agent: Agent,
    record: {
      platform: string;
      vendor: string;
      userAgent: string;
      deviceCategory: string;
      weight?: number;
    },
  ): IUserAgent {
    const os = agent.os;
    return {
      platform: record.platform,
      family: agent.family,
      vendor: record.vendor,
      os: {
        family: os.family,
        major: os.major,
        minor: os.minor,
      },
      raw: record.userAgent,
      deviceCategory: record.deviceCategory,
      version: {
        major: Number(agent.major),
        minor: Number(agent.minor),
        patch: Number(agent.patch),
      },
      weight: record.weight,
    };
  }

  private static matchesFilter(filter: IFilterOptions, userAgent: IUserAgent) {
    if (filter.deviceCategory !== userAgent.deviceCategory) {
      return false;
    }

    if (filter.family !== userAgent.family) {
      return false;
    }

    if (filter.vendor && filter.vendor !== userAgent.vendor) {
      return false;
    }

    if (filter.versionMinor !== undefined && filter.versionMinor !== userAgent.version.minor) {
      return false;
    }

    if (filter.versionMajor !== undefined && filter.versionMajor !== userAgent.version.major) {
      return false;
    }

    if (filter.operatingSystems) {
      const hasMatch = filter.operatingSystems.find(x => {
        if (x.family !== userAgent.os.family) return false;
        if (x.versionMajor !== undefined && userAgent.os.major !== x.versionMajor) return false;
        if (x.versionMinor !== undefined && userAgent.os.minor !== x.versionMinor) return false;
        return true;
      });
      if (!hasMatch) return false;
    }

    return true;
  }
}
