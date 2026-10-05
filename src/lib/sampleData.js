// Realistic sample business/finance dataset (~600 sales orders).
// Returned as { headers, rows } — the same shape the Excel parser produces,
// so it flows through detection, pivot, KPIs and charts untouched.

// Deterministic PRNG so the sample data is stable between loads.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleData() {
  const rand = mulberry32(20261005);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const regions = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo'];
  const categories = ['Electronics', 'Furniture', 'Apparel', 'FMCG', 'Services'];
  const salespeople = [
    'Nimal Perera', 'Kamal Fernando', 'Sunil Silva', 'Amara Jayasuriya',
    'Ruwan Wickramasinghe', 'Dilini Gunawardena', 'Sajith Mendis', 'Priya Rajapaksa',
  ];
  const channels = ['Online', 'Retail', 'Wholesale'];

  const headers = [
    'Order ID', 'Date', 'Region', 'Product Category', 'Salesperson',
    'Channel', 'Units', 'Revenue (LKR)', 'Cost (LKR)', 'Profit (LKR)',
  ];

  const start = new Date(2025, 0, 1).getTime();
  const end = new Date(2026, 8, 30, 23, 59, 59).getTime();

  const rows = [];
  for (let i = 0; i < 600; i++) {
    const date = new Date(start + rand() * (end - start));
    date.setHours(0, 0, 0, 0);

    const category = pick(categories);
    // Category-flavoured price bands make the data feel real.
    const unitPrice =
      category === 'Electronics' ? 25000 + rand() * 175000
      : category === 'Furniture' ? 15000 + rand() * 85000
      : category === 'Apparel' ? 1500 + rand() * 13500
      : category === 'FMCG' ? 200 + rand() * 2800
      : 5000 + rand() * 45000; // Services

    const units = 1 + Math.floor(rand() * (category === 'FMCG' ? 900 : 120));
    const discount = 0.85 + rand() * 0.15;
    const revenue = Math.round(units * unitPrice * discount);
    const cost = Math.round(revenue * (0.52 + rand() * 0.33));

    rows.push({
      'Order ID': `ORD-${10001 + i}`,
      Date: date,
      Region: pick(regions),
      'Product Category': category,
      Salesperson: pick(salespeople),
      Channel: pick(channels),
      Units: units,
      'Revenue (LKR)': revenue,
      'Cost (LKR)': cost,
      'Profit (LKR)': revenue - cost,
    });
  }

  rows.sort((a, b) => a.Date - b.Date);
  return { headers, rows };
}
