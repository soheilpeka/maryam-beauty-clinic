const l = require("@libsql/client");
const c = l.createClient({ url: "file:./prisma/dev.db" });
(async () => {
  try {
    const r = await c.execute("select name from sqlite_master where type='table' order by name");
    console.log("TABLES:", r.rows.map((x) => x.name).join(", "));
    const a = await c.execute("select email, role from AdminUser");
    console.log("ADMINS:", JSON.stringify(a.rows));
    const b = await c.execute("select count(*) as n from Booking");
    console.log("BOOKINGS:", JSON.stringify(b.rows));
    const s = await c.execute("select count(*) as n from Service");
    console.log("SERVICES:", JSON.stringify(s.rows));
    const st = await c.execute("select count(*) as n from Staff");
    console.log("STAFF:", JSON.stringify(st.rows));
  } catch (e) { console.log("ERR", e.message); }
})();
