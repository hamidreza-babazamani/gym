
import "dotenv/config";
import app from "./app";

// تعیین پورت سرور
const PORT = Number(process.env.PORT) || 5000;

// اجرای سرور
app.listen(PORT, () => {
  console.log(`Gym Backend is running on http://localhost:${PORT}`);
});
