// Static CSS aggregator for OpacaCMS Admin UI

import { TOKENS_CSS } from './css/tokens';
import { BASE_CSS } from './css/base';
import { BUTTON_CSS } from './css/button';
import { CARD_CSS } from './css/card';
import { TABLE_CSS } from './css/table';
import { FORM_CSS } from './css/form';
import { SIDEBAR_CSS } from './css/sidebar';
import { ALERTS_CSS } from './css/alerts';

export const ADMIN_CSS = [
  TOKENS_CSS,
  BASE_CSS,
  BUTTON_CSS,
  CARD_CSS,
  TABLE_CSS,
  FORM_CSS,
  SIDEBAR_CSS,
  ALERTS_CSS
].join('\n');
