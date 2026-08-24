require('dotenv').config({ path: 'C:\\Users\\ANDREW\\.gemini\\antigravity\\Master-TechnoSys-Folder\\hris-admin\\.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("Seeding Inventory...");
  
  const { data: techs } = await supabase.from('technicians').select('id, name');
  if (!techs || techs.length === 0) {
    console.log("No technicians found to assign tools to!");
  }

  const items = [
    { name: "Makita 18V Cordless Drill", description: "Standard issue cordless drill", total_qty: 10, available_qty: 8, image_url: "" },
    { name: "Robinair Manifold Gauge", description: "A/C diagnostics gauge set", total_qty: 5, available_qty: 5, image_url: "" },
    { name: "Fluke Multimeter", description: "Digital multimeter for electrical testing", total_qty: 15, available_qty: 14, image_url: "" },
    { name: "Bosch Rotary Hammer", description: "Heavy duty hammer drill", total_qty: 3, available_qty: 3, image_url: "" },
    { name: "Vacuum Pump 5CFM", description: "HVAC vacuum pump", total_qty: 4, available_qty: 4, image_url: "" }
  ];

  const { data: insertedItems, error } = await supabase.from('inventory_items').insert(items).select();
  if (error) {
     console.error("Failed to seed items", error);
     return;
  }
  
  console.log("Items seeded. Assigning to Sasha or Albert...");
  const albert = techs ? techs.find(t => t.name.includes("Albert")) || techs[0] : null;
  const sasha = techs ? techs.find(t => t.name.includes("Sasha")) || techs[0] : null;

  // Assign a drill to Albert
  if (insertedItems && insertedItems.length > 0 && albert) {
    await supabase.from('tool_assignments').insert([
       { technician_id: albert.id, item_id: insertedItems[0].id, checkout_notes: "Assigned for client job Pacita branch", status: 'active' }
    ]);
    console.log("Assigned Makita Drill to Albert");
  }

  // Assign a multimeter to Sasha
  if (insertedItems && insertedItems.length > 2 && sasha) {
    await supabase.from('tool_assignments').insert([
       { technician_id: sasha.id, item_id: insertedItems[2].id, checkout_notes: "Assigned for diagnostic run", status: 'active' }
    ]);
    console.log("Assigned Fluke Multimeter to Sasha");
  }

  console.log("Seed complete!");
}
seed();
