import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cron from "node-cron";
import moment from "moment-timezone";

dotenv.config();
const app = express();
app.use(express.json());

const pool = new pg.Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

// ตัวอย่างข้อมูลสถานี
const airports = ["BKK", "HKG", "SIN", "NRT", "SYD", "DXB", "FRA", "LHR"];
const cargoTypes = ["Electronics", "Automotive", "Textile", "Food", "Medical", "Machinery"];

// ฟังก์ชันสุ่มเที่ยวบิน
function generateFlight() {
  const origin = airports[Math.floor(Math.random() * airports.length)];
  let destination;
  do {
    destination = airports[Math.floor(Math.random() * airports.length)];
  } while (destination === origin);

  const flightNumber = `CG${Math.floor(Math.random() * 9000 + 1000)}`;
  const cargoType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
  const cargoWeight = (Math.random() * 20000 + 500).toFixed(2); // กิโลกรัม

  const tz = "Asia/Bangkok";
  const now = moment().tz(tz);

  const json = {
    flight_number: flightNumber,
    origin,
    destination,
    cargo_type: cargoType,
    cargo_weight: cargoWeight,
    timestamp: Date.now(),
    "Readable date": now.format("DD/MM/YYYY"),
    "Readable time": now.format("HH:mm:ss"),
    "Day of week": now.format("dddd"),
    "Day of month": now.date(),
    Month: now.format("MMMM"),
    Year: now.year(),
    Timezone: tz,
  };

  return json;
}

// ฟังก์ชันบันทึกลง PostgreSQL
async function saveFlightToDB(flight) {
  const query = `
    INSERT INTO cargo_flights (
      flight_number, origin, destination, cargo_type, cargo_weight,
      timestamp, readable_date, readable_time, day_of_week, day_of_month,
      month, year, timezone
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  `;
  const values = [
    flight.flight_number,
    flight.origin,
    flight.destination,
    flight.cargo_type,
    flight.cargo_weight,
    flight.timestamp,
    flight["Readable date"],
    flight["Readable time"],
    flight["Day of week"],
    flight["Day of month"],
    flight.Month,
    flight.Year,
    flight.Timezone,
  ];

  try {
    await pool.query(query, values);
  } catch (err) {
    // Postgres error code 3D000 = invalid_catalog_name (database does not exist)
    if (err && err.code === '3D000') {
      const dbName = process.env.PGDATABASE || '<PGDATABASE not set>';
      const msg = `Postgres database "${dbName}" does not exist. Create the database and the table first (see README.md or .env.example).`;
      console.error(msg, err);
      // throw a clear Error so callers can return a helpful response
      throw new Error(msg);
    }
    // rethrow other errors
    throw err;
  }
}

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", service: "Cargo Flight Scheduler API", schedule: "Data saved every 6 hours to PostgreSQL" });
});

// route สำหรับดูข้อมูลเที่ยวบินล่าสุด
app.get("/api/cargo-flights", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cargo_flights ORDER BY id DESC LIMIT 10");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cargo flights:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch cargo flights' });
  }
});

// สร้างเที่ยวบินใหม่ทันที (manual trigger)
app.post("/api/generate-flight", async (req, res) => {
  try {
    const flight = generateFlight();
    await saveFlightToDB(flight);
    res.json({ status: "success", flight });
  } catch (err) {
    console.error('Error generating flight (POST):', err);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to generate flight' });
  }
});

// ให้รองรับการเรียกแบบ GET ด้วย (สะดวกสำหรับการทดสอบจากเบราว์เซอร์)
app.get("/api/generate-flight", async (req, res) => {
  try {
    const flight = generateFlight();
    await saveFlightToDB(flight);
    res.json({ status: "success", flight });
  } catch (err) {
    console.error('Error generating flight (GET):', err);
    res.status(500).json({ status: 'error', message: 'Failed to generate flight' });
  }
});

// schedule ทุก 6 ชั่วโมง
cron.schedule("0 */6 * * *", async () => {
  try {
    const flight = generateFlight();
    await saveFlightToDB(flight);
    console.log(`🛫 Flight ${flight.flight_number} saved at ${flight["Readable time"]}`);
  } catch (err) {
    console.error('Error saving scheduled flight:', err && err.message ? err.message : err);
    // don't throw so cron doesn't stop scheduling
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
