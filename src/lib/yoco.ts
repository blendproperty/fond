// Keep this boundary server-side. Never infer a POS order endpoint from Checkout.
export type RestaurantOrder = { reference: string; lines: { productId: string; quantity: number }[]; collectionTime: string };
export interface RestaurantOrderGateway { submit(order: RestaurantOrder): Promise<{ providerOrderId: string }> }
export class YocoOrderGateway implements RestaurantOrderGateway {
 async submit(_order: RestaurantOrder): Promise<never> {
   throw new Error('Yoco incoming order integration is pending provider confirmation.');
 }
}
