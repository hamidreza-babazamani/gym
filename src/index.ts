
import app from "./app";

// تعیین پورت سرور
const PORT = 5000;

// اجرای سرور
app.listen(PORT, () => {
  console.log(`Gym Backend is running on http://localhost:${PORT}`);
});
