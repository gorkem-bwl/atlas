import type { WidgetDefinition } from './types';
import { weatherWidget } from './weather-widget';
import { quoteWidget } from './quote-widget';
import { stocksWidget } from './stocks-widget';
import { gameWidget } from './game-widget';

export const widgetRegistry: WidgetDefinition[] = [
  weatherWidget,
  quoteWidget,
  stocksWidget,
  gameWidget,
];
