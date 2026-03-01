const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      trim: true,
      default: ""
    },
    documentNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
      set: (value) => {
        const normalized = String(value || "").trim().toLowerCase();
        return normalized || null;
      }
    },
    phone: {
      type: String,
      trim: true
    },
    birthDate: {
      type: Date,
      default: null
    },
    medicalEmergency: {
      type: String,
      trim: true,
      default: ""
    },
    emergencyMedical: {
      type: String,
      trim: true,
      default: null
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: null
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: null
    },
    promocion: {
      type: String,
      trim: true,
      default: ""
    },
    turno: {
      type: String,
      trim: true,
      default: ""
    },
    turnoId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    admissionDate: {
      type: Date,
      default: Date.now
    },
    fechaAlta: {
      type: Date,
      default: Date.now
    },
    roles: [
      {
        type: String,
        enum: ["user", "trainer", "admin"]
      }
    ],
    role: {
      type: String,
      enum: ["user", "trainer", "admin"],
      default: "user"
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "pending"
    },
    deactivationReason: {
      type: String,
      trim: true,
      default: ""
    },
    deactivatedAt: {
      type: Date,
      default: null
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    trainerInfo: {
      specialties: [{ type: String, trim: true }],
      aliases: [{ type: String, trim: true }],
      bio: { type: String, trim: true },
      photo: { type: String, trim: true },
      schedule: [
        {
          day: { type: String, trim: true },
          startTime: { type: String, trim: true },
          endTime: { type: String, trim: true }
        }
      ],
      commissionRate: { type: Number, default: 30 },
      monthlyGoal: { type: Number, default: 15000 }
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    plan: {
      type: String,
      enum: ["8pases", "12pases", "libre", "none"],
      default: "none"
    },
    planPrice: {
      type: Number,
      default: null
    },
    classesLeft: {
      type: Number,
      default: 0
    },
    passesRemaining: {
      type: Number,
      default: 0
    },
    stats: {
      weight: { type: Number, default: null },
      height: { type: Number, default: null },
      bodyFat: { type: Number, default: null },
      muscleMass: { type: Number, default: null }
    },
    planExpires: {
      type: Date,
      default: null
    },
    expirationDate: {
      type: Date,
      default: null
    },
    nextPaymentDate: {
      type: Date,
      default: null
    },
    debt: {
      type: Number,
      default: 0
    },
    lastPaymentReminder: {
      type: Date,
      default: null
    },
    isTemporary: {
      type: Boolean,
      default: false
    },
    lastAttendance: {
      type: Date,
      default: null
    },
    forcePasswordChange: {
      type: Boolean,
      default: false
    },
    appAccess: {
      type: Boolean,
      default: false
    },
    invitedAt: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    goals: [{ type: String, trim: true }],
    progress: {
      workoutsThisMonth: { type: Number, default: 0 },
      totalWorkouts: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      attendanceHistory: [
        {
          month: { type: String, trim: true },
          attended: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 }
        }
      ]
    },
    progressPhotos: [
      {
        url: { type: String, trim: true },
        date: { type: Date, default: Date.now },
        weight: { type: Number, default: null },
        notes: { type: String, trim: true }
      }
    ],
    paymentMethod: {
      type: {
        type: String,
        enum: ["mercadopago", "transferencia", "efectivo", "tarjeta"],
        default: null
      },
      details: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      lastFour: {
        type: String,
        trim: true,
        default: ""
      }
    },
    nutritionPlan: {
      status: {
        type: String,
        enum: ["none", "pending", "active", "inactive"],
        default: "none"
      },
      requestedAt: {
        type: Date,
        default: null
      },
      assignedAt: {
        type: Date,
        default: null
      },
      updatedAt: {
        type: Date,
        default: null
      },
      goal: {
        type: String,
        trim: true,
        default: ""
      },
      dailyCalories: {
        type: Number,
        default: null
      },
      notes: {
        type: String,
        trim: true,
        default: ""
      },
      meals: [
        {
          title: { type: String, trim: true, default: "" },
          time: { type: String, trim: true, default: "" },
          calories: { type: Number, default: null },
          description: { type: String, trim: true, default: "" },
          items: [{ type: String, trim: true }]
        }
      ]
    },
    adminNotes: [
      {
        note: { type: String, trim: true, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    memberSince: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("validate", function preValidate(next) {
  const rolePriority = ["admin", "trainer", "user"];

  let roles = Array.isArray(this.roles) ? this.roles.filter(Boolean) : [];

  if (this.role && !roles.includes(this.role)) {
    roles.push(this.role);
  }

  if (roles.length === 0) {
    roles = ["user"];
  }

  if (!roles.includes("user")) {
    roles.push("user");
  }

  this.roles = Array.from(new Set(roles));

  const derivedRole = rolePriority.find((r) => this.roles.includes(r)) || "user";
  this.role = derivedRole;

  if (this.status === "active") {
    this.isActive = true;
  } else if (["inactive", "suspended"].includes(this.status)) {
    this.isActive = false;
  } else if (this.isActive === undefined) {
    this.isActive = false;
  }

  if (this.documentNumber) {
    this.documentNumber = String(this.documentNumber).replace(/[^\dA-Za-z]/g, "").trim();
  }

  return next();
});

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("password")) {
    return next();
  }

  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasRole = function hasRole(role) {
  return Array.isArray(this.roles) && this.roles.includes(role);
};

module.exports = mongoose.model("User", userSchema);
