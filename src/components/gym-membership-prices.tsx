import Link from 'next/link';

export function GymMembershipPrices() {
  return <section className="gym-prices" aria-label="Gym prices">
    <p className="gym-price-note gym-price-eligibility">Public monthly membership is R850. Ask Christine who qualifies for the R450 monthly and R200 off-peak plans before choosing a plan or making payment. Eligibility for these two plans has not yet been confirmed here.</p>
    <div className="gym-membership-plans">
      <article className="gym-price-card"><p className="gym-kicker">FULL MEMBER</p><h2>Room for your routine.</h2><p className="gym-price-window">Full access · 05:00–21:00</p><dl><div><dt>Monthly membership</dt><dd>R450 <small>/ month</small></dd></div><div><dt>Public</dt><dd>R850 <small>/ month</small></dd></div></dl></article>
      <article className="gym-price-card"><p className="gym-kicker">OFF-PEAK</p><h2>A quieter time to train.</h2><p className="gym-price-window">10:00–16:00</p><dl><div><dt>Monthly membership</dt><dd>R200 <small>/ month</small></dd></div></dl></article>
    </div>
    <p className="gym-price-note">Access is within the Gym’s <Link href="/gym/info">opening hours</Link>. Saturday hours differ; Sunday is closed.</p>
    <div className="gym-price-extras"><h2>Day visits &amp; extras</h2><dl><div><dt>Day visit · tenant</dt><dd>R40</dd></div><div><dt>Day visit · public</dt><dd>R150</dd></div><div><dt>Towel rental</dt><dd>R20</dd></div><div><dt>Towel purchase</dt><dd>R120</dd></div><div><dt>VIP Pod</dt><dd>R100</dd></div></dl></div>
    <p className="gym-price-note">Terms and conditions apply. Prices are subject to change.</p>
  </section>;
}
