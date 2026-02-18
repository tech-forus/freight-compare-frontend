import React from "react";

export interface TermsSection {
  title: string;
  content: React.ReactNode;
}

export const termsSections: TermsSection[] = [
  {
    title: "1. ACCEPTANCE OF TERMS",
    content: (
      <>
        <p>By creating an account on <strong>freightcompare.ai</strong>, you:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Confirm you are a legally authorized business/user</li>
          <li>Agree to all Terms, Privacy Policy, and platform rules</li>
          <li>Enter into a legally binding agreement</li>
        </ul>
        <p className="mt-2 font-medium">If you do not agree → you must not sign up or use the platform.</p>
      </>
    ),
  },
  {
    title: "2. PLATFORM NATURE",
    content: (
      <>
        <p><strong>freightcompare.ai</strong> is a freight comparison platform, rate discovery engine, shipment booking interface, and logistics SaaS tool.</p>
        <p className="mt-2">We are <strong>NOT</strong> a transporter, courier company, freight carrier, or customs broker. We only connect users with transporters. All shipments are executed by third-party carriers.</p>
      </>
    ),
  },
  {
    title: "3. USER ELIGIBILITY",
    content: (
      <>
        <p>You confirm:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>You are ≥18 years old</li>
          <li>You are authorized to book shipments</li>
          <li>Your company details are accurate</li>
          <li>GST & KYC details are valid</li>
        </ul>
        <p className="mt-2 font-medium">Fake accounts → immediate termination.</p>
      </>
    ),
  },
  {
    title: "4. ACCOUNT RESPONSIBILITY",
    content: (
      <p>You are responsible for login credentials, API keys, team member access, and all bookings from your account. Any misuse → your liability.</p>
    ),
  },
  {
    title: "5. RATE ACCURACY DISCLAIMER",
    content: (
      <>
        <p>Rates shown on the platform are indicative, API-based, and subject to change. Final charges may vary due to weight differences, volumetric changes, ODA/remote area, fuel surcharge, or carrier revision.</p>
        <p className="mt-2 font-medium">freightcompare.ai is not liable for rate mismatch.</p>
      </>
    ),
  },
  {
    title: "6. SHIPMENT LIABILITY",
    content: (
      <p>We are <strong>NOT</strong> responsible for damage, loss, delay, theft, misrouting, or customs issues. Liability lies with the selected transporter/courier partner. Users must check carrier T&Cs.</p>
    ),
  },
  {
    title: "7. PROHIBITED SHIPMENTS",
    content: (
      <>
        <p>You must <strong>NOT</strong> ship: illegal goods, hazardous materials, drugs, explosives, cash, precious metals, or restricted items.</p>
        <p className="mt-2 font-medium">Violation → account termination + legal action.</p>
      </>
    ),
  },
  {
    title: "8. PAYMENT TERMS",
    content: (
      <p>Users agree that wallet or prepaid system may be required, platform fees apply, subscription plans apply, credit terms may be revoked, and non-payment → account suspension.</p>
    ),
  },
  {
    title: "9. PLATFORM FEES",
    content: (
      <p>freightcompare.ai may charge subscription fees, transaction fees, API usage fees, and premium feature fees. Fees are non-refundable unless stated.</p>
    ),
  },
  {
    title: "10. DATA & PRIVACY",
    content: (
      <p>We collect shipment data, pricing data, and usage data. We may use data for optimization, analytics, ML models, and platform improvement. We never sell sensitive data.</p>
    ),
  },
  {
    title: "11. API & AUTOMATION TERMS",
    content: (
      <p>If using API: rate limits apply, abuse → access revoked, scraping prohibited, reverse engineering prohibited.</p>
    ),
  },
  {
    title: "12. SERVICE AVAILABILITY",
    content: (
      <p>Platform uptime is not guaranteed. We are not liable for server downtime, API downtime, carrier downtime, or data mismatch.</p>
    ),
  },
  {
    title: "13. LIMITATION OF LIABILITY",
    content: (
      <p>Maximum liability of freightcompare.ai is limited to the amount paid to the platform in the last 30 days. We are not liable for business loss, shipment loss, reputation damage, or indirect damages.</p>
    ),
  },
  {
    title: "14. INDEMNITY",
    content: (
      <p>You agree to indemnify freightcompare.ai against misdeclared shipments, illegal goods, payment fraud, carrier disputes, and customs violations.</p>
    ),
  },
  {
    title: "15. ACCOUNT TERMINATION",
    content: (
      <p>We may suspend/terminate your account for fraud, abuse, non-payment, suspicious activity, or legal orders — without prior notice.</p>
    ),
  },
  {
    title: "16. INTELLECTUAL PROPERTY",
    content: (
      <p>All platform elements — algorithms, rate engine, UI, data, and code — belong to freightcompare.ai. Copying is prohibited.</p>
    ),
  },
  {
    title: "17. DISPUTE RESOLUTION",
    content: (
      <p>All disputes are governed by Indian law, with arbitration first. Jurisdiction: Delhi.</p>
    ),
  },
  {
    title: "18. FORCE MAJEURE",
    content: (
      <p>We are not liable for natural disasters, war, API outages, or government actions.</p>
    ),
  },
  {
    title: "19. MODIFICATION OF TERMS",
    content: (
      <p>We may update terms anytime. Continued usage = acceptance.</p>
    ),
  },
  {
    title: "20. FINAL DECLARATION",
    content: (
      <>
        <p>By ticking "I Agree" you confirm:</p>
        <ul className="list-none ml-1 mt-1 space-y-1">
          <li>✔ You understand platform is aggregator</li>
          <li>✔ You accept carrier liability</li>
          <li>✔ You accept rate variability</li>
          <li>✔ You accept payment obligations</li>
          <li>✔ You accept arbitration clause</li>
        </ul>
      </>
    ),
  },
];
