require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("Seeding 2026 Statutory Database...");

  // 1. PhilHealth (5% total, 2.5% EE)
  const { error: e1 } = await supabase.from('philhealth_rules').insert({
    wage_floor: 10000,
    wage_ceiling: 100000,
    total_rate_percentage: 5.0,
    employee_share_percentage: 2.5,
    target_pay_cycle: 'both'
  });
  if (e1) console.error("PhilHealth Error:", e1);

  // 2. Pag-IBIG
  const { error: e2 } = await supabase.from('pagibig_brackets').insert({
    min_compensation: 0,
    max_compensation: 9999999,
    employee_share: 200,
    target_pay_cycle: '15th'
  });
  if (e2) console.error("Pag-IBIG Error:", e2);

  // 3. SSS (15% total: 10% ER, 5% EE)
  const { error: e3 } = await supabase.from('sss_brackets').insert([
    { min_compensation: 0, max_compensation: 10249.99, monthly_salary_credit: 10000, employee_share: 500, employer_share: 1000, target_pay_cycle: 'end_of_month' },
    { min_compensation: 10250, max_compensation: 19749.99, monthly_salary_credit: 15000, employee_share: 750, employer_share: 1500, target_pay_cycle: 'end_of_month' },
    { min_compensation: 19750, max_compensation: 9999999, monthly_salary_credit: 30000, employee_share: 1500, employer_share: 3000, target_pay_cycle: 'end_of_month' }
  ]);
  if (e3) console.error("SSS Error:", e3);

  console.log("Seed complete. Verify in Supabase.");
}

seed();
