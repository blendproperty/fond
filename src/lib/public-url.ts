export function publicBaseUrl(){
  const configured=process.env.FOND_PUBLIC_URL?.trim();
  if(configured){
    try{const url=new URL(configured);if(url.protocol==='https:')return url.origin;}catch{/* fall through to the routed host */}
  }
  const host=process.env.FOND_HOST?.trim().toLowerCase();
  if(host&&/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host))return `https://${host}`;
  // FOND is a single-tenant Midpoint service; keep its canonical verified
  // production domain available even when Compose uses FOND_HOST only for
  // Traefik label interpolation and does not inject it into the container.
  return 'https://fond.mid-point.co.za';
}

// During the domain transition existing provider registrations stay on the
// old routed hostname. New customer links use FOND_PUBLIC_URL independently.
export function callbackBaseUrl(){
  const configured=process.env.FOND_CALLBACK_URL;
  if(configured){
    const url=new URL(configured);
    if(url.protocol!=='https:'||!['fond.mid-point.co.za','midpointhub.com','fond-test.mid-point.co.za'].includes(url.hostname)||url.username||url.password)throw new Error('Invalid provider callback URL.');
    return url.origin;
  }
  return publicBaseUrl();
}
export function orderingUrl(){return `${publicBaseUrl()}${process.env.MIDPOINT_HUB_ENABLED==='true'?'/fond':'/'}`;}
