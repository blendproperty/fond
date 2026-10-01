export type DeliveryLocation = { latitude:number; longitude:number; accuracy:number };

// A pin supplements the business/building; it never expands the delivery area.
export function validateDeliveryLocation(value:unknown):DeliveryLocation|null {
  if(value==null)return null;
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Check the delivery location.');
  const {latitude,longitude,accuracy}=value as DeliveryLocation;
  if(!Number.isFinite(latitude)||latitude < -90||latitude > 90||!Number.isFinite(longitude)||longitude < -180||longitude > 180||!Number.isFinite(accuracy)||accuracy < 0||accuracy > 100000)throw new Error('Check the delivery location.');
  return {latitude,longitude,accuracy};
}

export function deliveryDirections(location:DeliveryLocation){
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}

export function deliveryPinPreview(location:DeliveryLocation){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
}
