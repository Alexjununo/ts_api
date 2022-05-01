import { ForecastPoint, StormGlass } from '@src/clients/stormGlass';

// eslint-disable-next-line no-shadow
export enum BeachPosition {
  S = 'S',
  E = 'E',
  W = 'W',
  N = 'N',
}

export interface Beach {
  name: string;
  position: BeachPosition;
  lat: number;
  lng: number;
  user: string;
}

export interface BeachForecast extends Omit<Beach, 'user'>, ForecastPoint {

}

export class Forecast {
  constructor(protected stormGlass = new StormGlass()) {}

  public async processForecastForBeaches(beaches: Beach[]): Promise<BeachForecast[]> {
    const pointsWithCorrectSources:BeachForecast[] = [];

    for (const beach of beaches) {
      // eslint-disable-next-line no-await-in-loop
      const points = await this.stormGlass.fetchPoints(beach.lat, beach.lng);
      const enrichedBeachData = points.map((p) => ({
        ...{
          lat: beach.lat,
          lng: beach.lng,
          name: beach.name,
          position: beach.position,
          rating: 1,
        },
        ...p,
      }));
      pointsWithCorrectSources.push(...enrichedBeachData);
    }

    return pointsWithCorrectSources;
  }
}
