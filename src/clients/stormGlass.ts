/* eslint-disable max-classes-per-file */
import { InternalError } from '@src/util/errors/internal-error';
import config, { IConfig } from 'config';
import * as HTTPUtil from '@src/util/request';

const stormGlassResourceConfig: IConfig = config.get('App.resources.StormGlass');

export interface StormGlassPointSource {
  [key:string]: number
}

export interface StormGlassPoint {
  readonly time: string,
  readonly waveHeight: StormGlassPointSource,
  readonly waveDirection: StormGlassPointSource,
  readonly swellDirection: StormGlassPointSource,
  readonly swellHeight: StormGlassPointSource,
  readonly swellPeriod: StormGlassPointSource,
  readonly windDirection: StormGlassPointSource,
  readonly windSpeed: StormGlassPointSource,
}

export interface StormGlassForecastResponse {
  hours: StormGlassPoint[]
}

export interface ForecastPoint {
  time: string,
  waveHeight: number,
  waveDirection: number,
  swellDirection: number,
  swellHeight: number,
  swellPeriod: number,
  windDirection: number,
  windSpeed: number,
}

export class ClientRequestError extends InternalError {
  constructor(message: string) {
    const internalMessage = `Unexpected error when trying to communicate to StormGlass: ${message}`;
    super(internalMessage);
  }
}

export class StormGlassResponseError extends InternalError {
  constructor(message: string) {
    const internalMessage = `Unexpected error returned by the StormGlass service: ${message}`;
    super(internalMessage);
  }
}

export class StormGlass {
  readonly stormGlassAPIParams = 'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';

  readonly stormGlassAPISource = 'noaa';

  constructor(protected request = new HTTPUtil.Request()) {}

  private normalizeResponse(points: StormGlassForecastResponse): ForecastPoint[] {
    return points.hours.filter(this.isValidPoint.bind(this)).map((point) => ({
      time: point.time,
      swellDirection: point.swellDirection[this.stormGlassAPISource],
      swellHeight: point.swellHeight[this.stormGlassAPISource],
      swellPeriod: point.swellPeriod[this.stormGlassAPISource],
      waveDirection: point.waveDirection[this.stormGlassAPISource],
      waveHeight: point.waveHeight[this.stormGlassAPISource],
      windDirection: point.windDirection[this.stormGlassAPISource],
      windSpeed: point.windSpeed[this.stormGlassAPISource],
    }));
  }

  private isValidPoint(point: Partial<StormGlassPoint>): boolean {
    return !!(
      point.time
      && point.swellDirection?.[this.stormGlassAPISource]
      && point.swellHeight?.[this.stormGlassAPISource]
      && point.swellPeriod?.[this.stormGlassAPISource]
      && point.waveDirection?.[this.stormGlassAPISource]
      && point.waveHeight?.[this.stormGlassAPISource]
      && point.windDirection?.[this.stormGlassAPISource]
      && point.windSpeed?.[this.stormGlassAPISource]
    );
  }

  public async fetchPoints(lat: number, lng: number): Promise<ForecastPoint[]> {
    try {
      const response = await this.request.get<StormGlassForecastResponse>(
        `${stormGlassResourceConfig.get('apiUrl')}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassAPIParams}&source=${this.stormGlassAPISource}`,
        {
          headers: {
            Authorization: stormGlassResourceConfig.get('apiToken'),
          },
        },
      );

      return this.normalizeResponse(response.data);
    } catch (e: any) {
      if (HTTPUtil.Request.isRequestError(e)) {
        throw new StormGlassResponseError(`Error: ${JSON.stringify(e.response.data)} Code: ${e.response.status}`);
      }
      throw new ClientRequestError(e.message);
    }
  }
}
