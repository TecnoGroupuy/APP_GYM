const cron = require("node-cron");
const emailService = require("../services/emailService");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Attendance = require("../models/Attendance");

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const toMinutes = (timeValue) => {
  const parts = String(timeValue || "").split(":");
  if (parts.length !== 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const isWithinWindow = (timeValue, startDate, endDate) => {
  const timeMinutes = toMinutes(timeValue);
  if (timeMinutes === null) return false;

  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

  if (endMinutes >= startMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
};

const runClassReminderJob = async () => {
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const windowEnd = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);
  const targetDay = dayNames[twoHoursFromNow.getDay()];

  const bookings = await Booking.find({
    status: "booked",
    reminderSent: { $ne: true }
  })
    .populate("user", "name email")
    .populate("class", "name day time trainer");

  let sent = 0;
  for (const booking of bookings) {
    if (!booking.class || !booking.user?.email) continue;
    if (booking.class.day !== targetDay) continue;
    if (!isWithinWindow(booking.class.time, twoHoursFromNow, windowEnd)) continue;

    const result = await emailService.sendClassReminder(booking.user, {
      name: booking.class.name,
      day: booking.class.day,
      time: booking.class.time,
      trainer: booking.class.trainer,
      bookingId: booking._id.toString()
    });

    if (result.success) {
      booking.reminderSent = true;
      booking.reminderSentAt = new Date();
      await booking.save();
      sent += 1;
    }
  }

  console.log(`[notifications] class reminders sent: ${sent}`);
};

const runPaymentReminderJob = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usersWithDebt = await User.find({
    status: "active",
    planExpires: { $lt: today },
    $or: [
      { lastPaymentReminder: { $exists: false } },
      { lastPaymentReminder: null },
      {
        lastPaymentReminder: {
          $lt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
        }
      }
    ]
  });

  let sent = 0;
  for (const user of usersWithDebt) {
    if (!user.email || !user.planExpires) continue;
    const daysOverdue = Math.floor((today.getTime() - new Date(user.planExpires).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (![1, 5, 10].includes(daysOverdue)) continue;

    const debt = {
      amount: Number(user.debt || user.planPrice || 1900),
      monthsDue: Math.max(1, Math.ceil(daysOverdue / 30))
    };

    const result = await emailService.sendPaymentReminder(user, debt);
    if (result.success) {
      user.lastPaymentReminder = new Date();
      await user.save();
      sent += 1;
    }
  }

  console.log(`[notifications] payment reminders sent: ${sent}`);
};

const runMonthlyReportJob = async () => {
  const now = new Date();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const users = await User.find({ status: "active" }).select("_id name email progress");
  let sent = 0;

  for (const user of users) {
    if (!user.email) continue;

    const attendances = await Attendance.countDocuments({
      user: user._id,
      status: "present",
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    if (attendances <= 0) continue;

    const result = await emailService.sendMonthlyReport(user, {
      classes: attendances,
      streak: Number(user.progress?.streak || 0),
      calories: attendances * 450
    });

    if (result.success) sent += 1;
  }

  console.log(`[notifications] monthly reports sent: ${sent}`);
};

const startNotificationJobs = () => {
  const enabled = String(process.env.NOTIFICATIONS_CRON_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) {
    console.log("[notifications] cron disabled by NOTIFICATIONS_CRON_ENABLED=false");
    return;
  }

  cron.schedule("*/15 * * * *", () => {
    runClassReminderJob().catch((error) => console.error("[notifications] class reminder error:", error.message));
  });

  cron.schedule("0 9 * * *", () => {
    runPaymentReminderJob().catch((error) => console.error("[notifications] payment reminder error:", error.message));
  });

  cron.schedule("0 10 1 * *", () => {
    runMonthlyReportJob().catch((error) => console.error("[notifications] monthly report error:", error.message));
  });

  console.log("[notifications] cron jobs started");
};

module.exports = {
  startNotificationJobs,
  runClassReminderJob,
  runPaymentReminderJob,
  runMonthlyReportJob
};
