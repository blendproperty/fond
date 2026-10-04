import type {TradingSettings} from './management';

export function fondAvailability(open:boolean,settings:Pick<TradingSettings,'collectionEnabled'|'deliveryEnabled'>,paymentMode:'live'|'sandbox'|'none'='none') {
  const publicReady=open&&paymentMode!=='sandbox'&&(settings.collectionEnabled!==false||(settings.deliveryEnabled&&paymentMode==='live'));
  return {publicReady,action:publicReady?'Order now':'Browse menu',status:!open?'Currently closed':paymentMode==='sandbox'?'Open · Online payments are in test mode':publicReady?'Taking orders':'Open · Ordering unavailable',message:paymentMode==='sandbox'?'Online payments are being tested. Browse the menu or contact FOND for help with a real order.':!open?'Browse the menu now and contact FOND about your next visit.':!publicReady?'Contact FOND to check the available ordering options.':''};
}
