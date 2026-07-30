import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const brokers = [
  ["broker1@demo.easymoving.test", "Alicia Moreno", "Alicia", "Moreno", "+1 305 555 0181"],
  ["broker2@demo.easymoving.test", "Derek Callahan", "Derek", "Callahan", "+1 312 555 0142"],
  ["broker3@demo.easymoving.test", "Priya Raghunathan", "Priya", "Raghunathan", "+1 512 555 0119"],
];
const first = ["James","Maria","David","Lisa","Ahmed","Sofia","Ethan","Nina","Marcus","Chloe","Victor","Hannah","Omar","Grace","Tyler","Isabel","Nathan","Rachel","Leo","Amara","Sean","Julia","Diego","Emma","Kevin"];
const last = ["Whitfield","Alvarez","Chen","Donovan","Haddad","Rossi","Brooks","Petrova","Sullivan","Nguyen","Ramos","Feldman","Khalil","Okonkwo","Bennett","Cortez","Wallace","Goldstein","Marchetti","Diallo","O'Neill","Vasquez","Herrera","Lindqvist","Park"];
const customers = first.map((f,i)=>{
  const l = last[i];
  const n = String(i+1).padStart(2,"0");
  return [`customer${n}@demo.easymoving.test`, `${f} ${l}`, f, l, `+1 ${[212,305,312,404,512,617,702,720,813,917][i%10]} 555 0${(100+i).toString()}`];
});

const existing = new Map();
for (let page=1; page<=20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  data.users.forEach(u => existing.set((u.email||"").toLowerCase(), u.id));
  if (data.users.length < 200) break;
}

const out = [];
for (const [email, full, f, l, phone] of [...brokers, ...customers]) {
  let id = existing.get(email);
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password: "DemoMoving!2026", email_confirm: true, user_metadata: { full_name: full },
    });
    if (error) throw new Error(email + ": " + error.message);
    id = data.user.id;
  }
  out.push({ id, email, full, f, l, phone });
}
console.log(JSON.stringify(out.length));
