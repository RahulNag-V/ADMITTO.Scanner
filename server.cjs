var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  activeSessions: () => activeSessions,
  authLimiter: () => authLimiter,
  boundScannerDevices: () => boundScannerDevices,
  broadcastToEventStream: () => broadcastToEventStream,
  enforceDeviceBinding: () => enforceDeviceBinding,
  invalidateUserSessions: () => invalidateUserSessions,
  requestAccessLimiter: () => requestAccessLimiter,
  resetScannerDeviceBindings: () => resetScannerDeviceBindings,
  scanLimiter: () => scanLimiter
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);

// src/lib/db.ts
var import_crypto = __toESM(require("crypto"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// src/lib/supabase/server.ts
var import_supabase_js = require("@supabase/supabase-js");
var DEFAULT_SUPABASE_URL = "https://vifgaafjgzahqxuxtdar.supabase.co";
var DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZmdhYWZqZ3phaHF4dXh0ZGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDY2NjMsImV4cCI6MjEwNDIyMjY2M30.dP-RFo-xhAsyNS0i8a-gnau4n3CBNN3ce4hANARPi8Y";
var DEFAULT_SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZmdhYWZqZ3phaHF4dXh0ZGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODY0NjY2MywiZXhwIjoyMTA0MjIyNjYzfQ.OpfnzOIQDMUTNTP8mV8j3ChjxwowkPH67xoYorEMn04";
function isPlaceholder(val) {
  if (!val) return true;
  const s = val.trim().toLowerCase();
  return !s || s.includes("your-project-id") || s.includes("your-anon-key") || s.includes("your-service-role") || s.includes("your-") || s.includes("placeholder");
}
function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}
function getSupabaseServerUrl() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const normalized = normalizeSupabaseUrl(rawUrl);
  if (isPlaceholder(normalized)) {
    return DEFAULT_SUPABASE_URL;
  }
  return normalized;
}
function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (isPlaceholder(key)) {
    return DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
  }
  return key;
}
function getSupabaseAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || "";
  if (isPlaceholder(key)) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return key;
}
var serverSupabaseClient = null;
var serverAdminSupabaseClient = null;
function getServerSupabase() {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  const activeKey = !isPlaceholder(serviceRoleKey) ? serviceRoleKey : !isPlaceholder(anonKey) ? anonKey : DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !activeKey || isPlaceholder(url) || isPlaceholder(activeKey)) {
    return null;
  }
  if (!serverSupabaseClient) {
    try {
      serverSupabaseClient = (0, import_supabase_js.createClient)(url, activeKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (err) {
      console.error("[Server Supabase] Error creating client:", err);
      return null;
    }
  }
  return serverSupabaseClient;
}
function getServerSupabaseAdmin() {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const activeKey = !isPlaceholder(serviceRoleKey) ? serviceRoleKey : DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !activeKey || isPlaceholder(url) || isPlaceholder(activeKey)) {
    return null;
  }
  if (!serverAdminSupabaseClient) {
    try {
      serverAdminSupabaseClient = (0, import_supabase_js.createClient)(url, activeKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (err) {
      console.error("[Server Supabase Admin] Error creating admin client:", err);
      return null;
    }
  }
  return serverAdminSupabaseClient;
}
async function testServerSupabaseHealth() {
  const url = getSupabaseServerUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  const client = getServerSupabase();
  if (!client || !url) {
    return {
      connected: false,
      url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: false,
      message: "Supabase credentials missing or placeholder values in environment."
    };
  }
  try {
    const { error: authErr } = await client.auth.getSession();
    if (authErr) {
      return {
        connected: false,
        url,
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
        authWorking: false,
        message: `Supabase auth handshake error: ${authErr.message}`
      };
    }
    return {
      connected: true,
      url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: true,
      message: "Supabase connection established and operational."
    };
  } catch (err) {
    return {
      connected: false,
      url,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasAnonKey: Boolean(anonKey),
      authWorking: false,
      message: `Connection test failed: ${err.message || String(err)}`
    };
  }
}

// src/lib/barcodeValidator.ts
function extractBarcodeIdentifier(rawId, config) {
  if (rawId === null || rawId === void 0) return "";
  const str = String(rawId).trim();
  if (!str) return "";
  if (!config) return str;
  const isFull = config.extraction_mode === "full_id" || config.extraction_mode === "full" || Boolean(config.full_id);
  let result = str;
  if (!isFull) {
    const pos = config.extraction_position || "front";
    const count = typeof config.character_count === "number" && config.character_count > 0 ? config.character_count : 5;
    if (str.length < count) {
      return "";
    }
    if (pos === "front") {
      result = str.slice(0, count);
    } else {
      result = str.slice(-count);
    }
  }
  if (config.fixed_prefix) {
    result = `${config.fixed_prefix}${result}`;
  }
  if (config.fixed_suffix) {
    result = `${result}${config.fixed_suffix}`;
  }
  return result;
}
function resolveBarcodeConfig(event) {
  const bc = event?.barcode_config || event?.scan_config?.barcode_config;
  if (bc) {
    return {
      mode: bc.mode || (bc.extraction_mode === "custom" ? bc.extraction_position === "end" ? "suffix" : "prefix" : "full"),
      value: bc.value || (bc.fixed_prefix || bc.fixed_suffix || ""),
      identifier_field: bc.identifier_field || event?.barcode_field || event?.primary_scan_field || "usn",
      case_sensitive: Boolean(bc.case_sensitive),
      min_length: bc.min_length ?? null,
      max_length: bc.max_length ?? null,
      enabled: bc.enabled ?? true,
      extraction_mode: bc.extraction_mode || (bc.full_id ? "full_id" : void 0),
      extraction_position: bc.extraction_position,
      character_count: bc.character_count,
      full_id: bc.full_id,
      fixed_prefix: bc.fixed_prefix ?? null,
      fixed_suffix: bc.fixed_suffix ?? null
    };
  }
  return {
    mode: "full",
    value: "",
    identifier_field: event?.barcode_field || event?.primary_scan_field || "usn",
    case_sensitive: false,
    min_length: null,
    max_length: null,
    extraction_mode: "full_id",
    full_id: true
  };
}
function validateBarcodePattern(rawBarcode, config) {
  const barcode = (rawBarcode || "").trim();
  if (!barcode) {
    return {
      valid: false,
      reason: "EMPTY_BARCODE",
      message: "Barcode cannot be empty.",
      originalBarcode: rawBarcode || ""
    };
  }
  const activeConfig = config || {
    mode: "full",
    value: "",
    identifier_field: "usn",
    case_sensitive: false,
    min_length: null,
    max_length: null
  };
  const { mode = "full", value = "", identifier_field = "usn", case_sensitive = false, min_length, max_length } = activeConfig;
  const configVal = (value || "").trim();
  const caseSensitive = Boolean(case_sensitive);
  if (min_length !== null && min_length !== void 0 && min_length > 0) {
    if (barcode.length < min_length) {
      return {
        valid: false,
        reason: "LENGTH_MISMATCH",
        message: "This barcode does not belong to this event.",
        originalBarcode: barcode
      };
    }
  }
  if (max_length !== null && max_length !== void 0 && max_length > 0) {
    if (barcode.length > max_length) {
      return {
        valid: false,
        reason: "LENGTH_MISMATCH",
        message: "This barcode does not belong to this event.",
        originalBarcode: barcode
      };
    }
  }
  const barcodeToCompare = caseSensitive ? barcode : barcode.toUpperCase();
  const patternToCompare = caseSensitive ? configVal : configVal.toUpperCase();
  if (mode === "prefix") {
    if (configVal) {
      if (!barcodeToCompare.startsWith(patternToCompare)) {
        return {
          valid: false,
          reason: "PREFIX_MISMATCH",
          message: "This barcode does not belong to this event.",
          originalBarcode: barcode
        };
      }
      const extractedIdentifier = barcode.slice(configVal.length).trim();
      if (!extractedIdentifier) {
        return {
          valid: false,
          reason: "EMPTY_IDENTIFIER",
          message: "Barcode recognized, but no registered attendee was found.",
          originalBarcode: barcode
        };
      }
      return {
        valid: true,
        extractedIdentifier,
        mode: "prefix",
        identifierField: identifier_field,
        caseSensitive,
        originalBarcode: barcode
      };
    }
    return {
      valid: true,
      extractedIdentifier: barcode,
      mode: "prefix",
      identifierField: identifier_field,
      caseSensitive,
      originalBarcode: barcode
    };
  }
  if (mode === "suffix") {
    if (configVal) {
      if (!barcodeToCompare.endsWith(patternToCompare)) {
        return {
          valid: false,
          reason: "SUFFIX_MISMATCH",
          message: "This barcode does not belong to this event.",
          originalBarcode: barcode
        };
      }
      const extractedIdentifier = barcode.slice(0, barcode.length - configVal.length).trim();
      if (!extractedIdentifier) {
        return {
          valid: false,
          reason: "EMPTY_IDENTIFIER",
          message: "Barcode recognized, but no registered attendee was found.",
          originalBarcode: barcode
        };
      }
      return {
        valid: true,
        extractedIdentifier,
        mode: "suffix",
        identifierField: identifier_field,
        caseSensitive,
        originalBarcode: barcode
      };
    }
    return {
      valid: true,
      extractedIdentifier: barcode,
      mode: "suffix",
      identifierField: identifier_field,
      caseSensitive,
      originalBarcode: barcode
    };
  }
  return {
    valid: true,
    extractedIdentifier: barcode,
    mode: "full",
    identifierField: identifier_field || "barcode",
    caseSensitive,
    originalBarcode: barcode
  };
}
function matchAttendeeWithIdentifier(student, identifierField, identifierValue, caseSensitive = false, barcodeConfig) {
  if (!student || !identifierValue) return false;
  const normalize = (v) => {
    if (v === void 0 || v === null) return "";
    const str = String(v).trim();
    return caseSensitive ? str : str.toUpperCase();
  };
  const target = normalize(identifierValue);
  if (!target) return false;
  if (student.barcode && normalize(student.barcode) === target) {
    return true;
  }
  const fieldKey = identifierField.trim();
  const candidates = [
    student[fieldKey],
    student.meta?.[fieldKey]
  ];
  const fieldKeyLower = fieldKey.toLowerCase().replace(/[\s_-]+/g, "");
  if (fieldKeyLower === "usn" || fieldKeyLower === "rollnumber" || fieldKeyLower === "rollno") {
    candidates.push(student.usn, student.meta?.usn, student.meta?.roll_number, student.meta?.["Roll Number"], student.meta?.rollNo);
  } else if (fieldKeyLower === "email") {
    candidates.push(student.email, student.meta?.email);
  } else if (fieldKeyLower === "barcode") {
    candidates.push(student.barcode, student.meta?.barcode);
  } else if (fieldKeyLower === "employeeid" || fieldKeyLower === "empid") {
    candidates.push(student.meta?.employee_id, student.meta?.emp_id, student.meta?.["Employee ID"]);
  } else if (fieldKeyLower === "registrationid" || fieldKeyLower === "regid") {
    candidates.push(student.meta?.registration_id, student.meta?.reg_id, student.meta?.["Registration ID"]);
  }
  if (fieldKeyLower === "barcode" || fieldKey === "barcode") {
    candidates.push(student.barcode);
  }
  if (candidates.some((c) => c !== void 0 && c !== null && normalize(c) === target)) {
    return true;
  }
  if (barcodeConfig && barcodeConfig.extraction_mode === "custom") {
    return candidates.some((c) => {
      if (c === void 0 || c === null) return false;
      const extracted = extractBarcodeIdentifier(String(c), barcodeConfig);
      return normalize(extracted) === target;
    });
  }
  return false;
}

// src/lib/db.ts
var scannerInvalidationHook = null;
function registerScannerInvalidationHook(hook) {
  scannerInvalidationHook = hook;
}
function notifyScannerInvalidated(scannerId) {
  if (scannerInvalidationHook) {
    scannerInvalidationHook(scannerId);
  }
}
function generateId() {
  return import_crypto.default.randomUUID();
}
var initialDB = {
  profiles: [],
  passwords: {},
  events: [],
  students: [],
  scanner_accounts: [],
  check_ins: [],
  scan_attempts: [],
  activity_logs: [],
  scanner_referral_codes: [],
  scanner_access_requests: [],
  password_reset_codes: []
};
var DatabaseService = class {
  constructor() {
    this.inMemoryDB = JSON.parse(JSON.stringify(initialDB));
    this.forceInMemory = false;
  }
  resetDatabase() {
    this.inMemoryDB = JSON.parse(JSON.stringify(initialDB));
  }
  setForceInMemory(force) {
    this.forceInMemory = force;
  }
  getClient() {
    if (this.forceInMemory) return null;
    return getServerSupabaseAdmin() || getServerSupabase();
  }
  // --- PROFILES & AUTH ---
  async getProfileByEmail(email) {
    const supabase = this.getClient();
    const cleanEmail = email.toLowerCase().trim();
    if (supabase) {
      const { data, error } = await supabase.from("profiles").select("*").ilike("email", cleanEmail).maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error getting profile by email:", error);
        throw new Error(`Database error fetching profile: ${error.message}`);
      }
      return data || null;
    }
    return this.inMemoryDB.profiles.find((p) => p.email.toLowerCase() === cleanEmail) || null;
  }
  async getProfileById(id) {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error getting profile by id:", error);
        throw new Error(`Database error fetching profile: ${error.message}`);
      }
      return data || null;
    }
    return this.inMemoryDB.profiles.find((p) => p.id === id) || null;
  }
  async createAdminProfile(email, name, passwordPlain, phone) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanPhone = phone?.trim();
    const id = generateId();
    const passwordHash = await import_bcryptjs.default.hash(passwordPlain, 10);
    const newProfile = {
      id,
      email: cleanEmail,
      name: cleanName,
      phone: cleanPhone,
      role: "ADMIN",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = this.getClient();
    if (supabase) {
      const insertPayload = {
        id,
        email: cleanEmail,
        name: cleanName,
        role: "ADMIN",
        created_at: newProfile.created_at,
        updated_at: newProfile.updated_at
      };
      if (cleanPhone) {
        insertPayload.phone = cleanPhone;
      }
      const { error } = await supabase.from("profiles").insert(insertPayload);
      if (error) {
        if (error.code === "23505" || error.message?.includes("duplicate key") || error.message?.includes("unique")) {
          const existing = await this.getProfileByEmail(cleanEmail);
          if (existing) {
            this.inMemoryDB.passwords[cleanEmail] = passwordHash;
            return existing;
          }
        }
        if (error.message?.includes("phone") || error.code === "42703") {
          delete insertPayload.phone;
          const { error: retryError } = await supabase.from("profiles").insert(insertPayload);
          if (retryError) {
            if (retryError.code === "23505" || retryError.message?.includes("duplicate key") || retryError.message?.includes("unique")) {
              const existing = await this.getProfileByEmail(cleanEmail);
              if (existing) {
                this.inMemoryDB.passwords[cleanEmail] = passwordHash;
                return existing;
              }
            }
            console.error("[Supabase DB] Error creating admin profile:", retryError);
            throw new Error(`Failed to create account in database: ${retryError.message}`);
          }
        } else {
          console.error("[Supabase DB] Error creating admin profile:", error);
          throw new Error(`Failed to create account in database: ${error.message}`);
        }
      }
    }
    this.inMemoryDB.profiles.push(newProfile);
    this.inMemoryDB.passwords[cleanEmail] = passwordHash;
    return newProfile;
  }
  async createScannerProfile(email, name) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim() || cleanEmail.split("@")[0];
    const id = generateId();
    const newProfile = {
      id,
      email: cleanEmail,
      name: cleanName,
      role: "SCANNER",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("profiles").insert(newProfile);
      if (error) {
        if (error.code === "23505" || error.message?.includes("duplicate key") || error.message?.includes("unique")) {
          const existing = await this.getProfileByEmail(cleanEmail);
          if (existing) return existing;
        }
        console.error("[Supabase DB] Error creating scanner profile:", error);
        throw new Error(`Failed to create scanner profile: ${error.message}`);
      }
    }
    this.inMemoryDB.profiles.push(newProfile);
    return newProfile;
  }
  async verifyAdminPassword(email, passwordPlain) {
    const cleanEmail = email.toLowerCase().trim();
    const profile = await this.getProfileByEmail(cleanEmail);
    if (!profile) return null;
    const storedPass = this.inMemoryDB.passwords[cleanEmail] || profile.password_hash;
    if (storedPass) {
      if (storedPass.startsWith("$2")) {
        const match = await import_bcryptjs.default.compare(passwordPlain, storedPass);
        return match ? profile : null;
      }
      return storedPass === passwordPlain ? profile : null;
    }
    return profile;
  }
  async deleteAccount(userId) {
    const supabase = this.getClient();
    const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
    if (supabase) {
      try {
        const { data: events } = await supabase.from("events").select("id").eq("admin_id", userId);
        if (events && events.length > 0) {
          const eventIds = events.map((e) => e.id);
          await supabase.from("scanner_access_requests").delete().in("event_id", eventIds);
          await supabase.from("scanner_referral_codes").delete().in("event_id", eventIds);
          await supabase.from("scan_attempts").delete().in("event_id", eventIds);
          await supabase.from("check_ins").delete().in("event_id", eventIds);
          await supabase.from("scanner_accounts").delete().in("event_id", eventIds);
          await supabase.from("students").delete().in("event_id", eventIds);
          await supabase.from("activity_logs").delete().in("event_id", eventIds);
          await supabase.from("events").delete().eq("admin_id", userId);
        }
        await supabase.from("scanner_access_requests").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);
      } catch (dbErr) {
        console.error("[Supabase DB] Error in cascade account deletion:", dbErr);
      }
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch {
        }
      }
    }
    const profile = this.inMemoryDB.profiles.find((p) => p.id === userId);
    if (profile) {
      delete this.inMemoryDB.passwords[profile.email.toLowerCase()];
    }
    this.inMemoryDB.profiles = this.inMemoryDB.profiles.filter((p) => p.id !== userId);
    const eventIdsToDelete = this.inMemoryDB.events.filter((e) => e.admin_id === userId).map((e) => e.id);
    this.inMemoryDB.events = this.inMemoryDB.events.filter((e) => e.admin_id !== userId);
    this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => !eventIdsToDelete.includes(s.event_id));
    this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter((s) => !eventIdsToDelete.includes(s.event_id));
    this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => !eventIdsToDelete.includes(c.event_id));
    this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => !eventIdsToDelete.includes(a.event_id));
    this.inMemoryDB.activity_logs = this.inMemoryDB.activity_logs.filter((l) => !eventIdsToDelete.includes(l.event_id));
    this.inMemoryDB.scanner_referral_codes = this.inMemoryDB.scanner_referral_codes.filter((r) => !eventIdsToDelete.includes(r.event_id));
    this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter(
      (r) => r.user_id !== userId && !eventIdsToDelete.includes(r.event_id)
    );
    return true;
  }
  async updateProfile(userId, updates) {
    const cleanName = updates.name ? updates.name.trim() : void 0;
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const supabase = this.getClient();
    if (supabase) {
      const payload = { updated_at: updatedAt };
      if (cleanName) payload.name = cleanName;
      const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select("*").maybeSingle();
      if (error) {
        console.warn("[Supabase DB] Profile update warning:", error.message);
      }
      if (data) {
        return data;
      }
    }
    const inMem = this.inMemoryDB.profiles.find((p) => p.id === userId);
    if (inMem) {
      if (cleanName) inMem.name = cleanName;
      inMem.updated_at = updatedAt;
      return inMem;
    }
    return null;
  }
  async updatePassword(email, newPasswordPlain) {
    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = await import_bcryptjs.default.hash(newPasswordPlain, 10);
    this.inMemoryDB.passwords[cleanEmail] = passwordHash;
    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase.from("profiles").update({ password_hash: passwordHash, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("email", cleanEmail);
      } catch (err) {
        console.warn("[Supabase DB] Warning updating profile password_hash:", err?.message);
      }
    }
    return true;
  }
  // --- PASSWORD RESET CODES (Supabase Persistent with Resilient Fallback) ---
  isTableMissing(err) {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    return err.code === "PGRST205" || msg.includes("could not find the table") || msg.includes("does not exist");
  }
  getOtpFilePath() {
    return import_path.default.resolve(process.cwd(), ".temp", "password_reset_codes.json");
  }
  readPersistentOtpCodes() {
    try {
      const filePath = this.getOtpFilePath();
      if (import_fs.default.existsSync(filePath)) {
        const raw = import_fs.default.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
      }
    } catch {
    }
    return this.inMemoryDB.password_reset_codes || [];
  }
  writePersistentOtpCodes(codes) {
    try {
      const filePath = this.getOtpFilePath();
      const dir = import_path.default.dirname(filePath);
      if (!import_fs.default.existsSync(dir)) {
        import_fs.default.mkdirSync(dir, { recursive: true });
      }
      import_fs.default.writeFileSync(filePath, JSON.stringify(codes, null, 2), "utf8");
    } catch {
    }
    this.inMemoryDB.password_reset_codes = codes;
  }
  async createPasswordResetCode(userId, email, codeHash, expiresAt) {
    const cleanEmail = email.toLowerCase().trim();
    const newRecord = {
      id: generateId(),
      user_id: userId,
      email: cleanEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase.from("password_reset_codes").update({ used: true }).eq("email", cleanEmail).eq("used", false);
        const { data, error } = await supabase.from("password_reset_codes").insert({
          id: newRecord.id,
          user_id: newRecord.user_id,
          email: newRecord.email,
          code_hash: newRecord.code_hash,
          expires_at: newRecord.expires_at,
          attempts: 0,
          used: false,
          created_at: newRecord.created_at
        }).select("*").single();
        if (!error && data) {
          return data;
        }
        if (error && !this.isTableMissing(error)) {
          console.error("[Supabase DB] Error inserting reset code:", error);
          throw new Error(`Database error persisting reset code: ${error.message}`);
        }
      } catch (err) {
        if (!this.isTableMissing(err)) {
          throw err;
        }
      }
    }
    const codes = this.readPersistentOtpCodes();
    codes.forEach((r) => {
      if (r.email.toLowerCase() === cleanEmail && !r.used) {
        r.used = true;
      }
    });
    codes.push(newRecord);
    this.writePersistentOtpCodes(codes);
    return newRecord;
  }
  async getActivePasswordResetCode(email) {
    const cleanEmail = email.toLowerCase().trim();
    const supabase = this.getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("password_reset_codes").select("*").eq("email", cleanEmail).eq("used", false).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).lt("attempts", 5).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!error) {
          return data || null;
        }
        if (error && !this.isTableMissing(error)) {
          console.error("[Supabase DB] Error fetching active reset code:", error);
          throw new Error(`Database error fetching reset code: ${error.message}`);
        }
      } catch (err) {
        if (!this.isTableMissing(err)) {
          throw err;
        }
      }
    }
    const now = Date.now();
    const codes = this.readPersistentOtpCodes();
    const valid = codes.filter(
      (r) => r.email.toLowerCase() === cleanEmail && !r.used && new Date(r.expires_at).getTime() > now && r.attempts < 5
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return valid[0] || null;
  }
  async incrementPasswordResetAttempts(id) {
    let currentAttempts = 1;
    const codes = this.readPersistentOtpCodes();
    const inRecord = codes.find((r) => r.id === id);
    if (inRecord) {
      currentAttempts = (inRecord.attempts || 0) + 1;
      inRecord.attempts = currentAttempts;
      if (currentAttempts >= 5) {
        inRecord.used = true;
      }
      this.writePersistentOtpCodes(codes);
    }
    const supabase = this.getClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("password_reset_codes").select("attempts").eq("id", id).single();
        if (!error && data) {
          const updatedAttempts = (data.attempts || 0) + 1;
          currentAttempts = updatedAttempts;
          await supabase.from("password_reset_codes").update({
            attempts: updatedAttempts,
            used: updatedAttempts >= 5
          }).eq("id", id);
        }
      } catch (err) {
      }
    }
    return currentAttempts;
  }
  async markPasswordResetCodeUsed(id) {
    const codes = this.readPersistentOtpCodes();
    const inRecord = codes.find((r) => r.id === id);
    if (inRecord) {
      inRecord.used = true;
      this.writePersistentOtpCodes(codes);
    }
    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase.from("password_reset_codes").update({ used: true }).eq("id", id);
      } catch (err) {
      }
    }
    return true;
  }
  // --- SCANNER AUTH (LEGACY DIRECT LOGINS) ---
  async verifyScannerAuth(accessCodeOrEmail, passwordOrCode) {
    if (!accessCodeOrEmail || !passwordOrCode) return null;
    const identifier = accessCodeOrEmail.trim().toUpperCase();
    const cleanEmail = accessCodeOrEmail.trim().toLowerCase();
    const cleanPassword = passwordOrCode.trim();
    const supabase = this.getClient();
    let scanner = null;
    if (supabase) {
      const { data: codeData, error: codeErr } = await supabase.from("scanner_accounts").select("*").eq("access_code", identifier).eq("is_active", true).maybeSingle();
      if (codeErr) {
        console.error("[Supabase DB] Error fetching scanner by code:", codeErr);
        throw new Error(`Database error fetching scanner: ${codeErr.message}`);
      }
      if (codeData) {
        scanner = codeData;
      } else {
        const { data: emailData, error: emailErr } = await supabase.from("scanner_accounts").select("*").eq("email", cleanEmail).eq("is_active", true).maybeSingle();
        if (emailErr) {
          console.error("[Supabase DB] Error fetching scanner by email:", emailErr);
          throw new Error(`Database error fetching scanner: ${emailErr.message}`);
        }
        if (emailData) {
          scanner = emailData;
        }
      }
    } else {
      scanner = this.inMemoryDB.scanner_accounts.find(
        (s) => (s.access_code.toUpperCase() === identifier || s.email.toLowerCase() === cleanEmail) && s.is_active
      ) || null;
    }
    if (!scanner) return null;
    if (scanner.expires_at && new Date(scanner.expires_at).getTime() < Date.now()) {
      return null;
    }
    const isCodeMatch = scanner.access_code.toUpperCase() === cleanPassword.toUpperCase();
    let isPassMatch = false;
    const storedHash = scanner.password_hash || this.inMemoryDB.passwords[scanner.email.toLowerCase()];
    if (storedHash) {
      if (storedHash.startsWith("$2")) {
        isPassMatch = await import_bcryptjs.default.compare(cleanPassword, storedHash);
      } else {
        isPassMatch = storedHash === cleanPassword;
      }
    }
    if (!isCodeMatch && !isPassMatch) {
      return null;
    }
    const event = await this.getEventById(scanner.event_id);
    if (!event || event.status === "DELETED") return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    scanner.last_login_at = now;
    if (supabase) {
      await supabase.from("scanner_accounts").update({ last_login_at: now }).eq("id", scanner.id);
    }
    return { scanner, event };
  }
  // --- EVENTS (Strict Multi-Admin Isolation) ---
  async getEventsByAdmin(adminId) {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("events").select("*").eq("admin_id", adminId).neq("status", "DELETED").order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase DB] Error getting events:", error);
        throw new Error(`Database error fetching events: ${error.message}`);
      }
      return data || [];
    }
    return this.inMemoryDB.events.filter((e) => e.admin_id === adminId && e.status !== "DELETED").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  async getEventById(eventId, adminId) {
    const supabase = this.getClient();
    if (supabase) {
      let query = supabase.from("events").select("*").eq("id", eventId).neq("status", "DELETED");
      if (adminId) {
        query = query.eq("admin_id", adminId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error getting event by id:", error);
        throw new Error(`Database error fetching event: ${error.message}`);
      }
      return data || null;
    }
    const event = this.inMemoryDB.events.find((e) => e.id === eventId && e.status !== "DELETED");
    if (!event) return null;
    if (adminId && event.admin_id !== adminId) {
      return null;
    }
    return event;
  }
  async createEvent(adminId, data) {
    const profile = await this.getProfileById(adminId);
    const newEvent = {
      id: generateId(),
      admin_id: adminId,
      title: data.title?.trim() || "Untitled Event",
      description: data.description?.trim() || "",
      venue: data.venue?.trim() || "Main Auditorium",
      event_date: data.event_date || (/* @__PURE__ */ new Date()).toISOString(),
      admin_name: data.admin_name?.trim() || profile?.name || "Event Organizer",
      admin_phone: data.admin_phone?.trim() || data.phone?.trim() || profile?.phone || "",
      admin_email: data.admin_email?.trim() || profile?.email || "",
      banner_url: data.banner_url?.trim() || "",
      status: "ACTIVE",
      attendee_type: data.attendee_type || "STUDENTS",
      attendee_label_singular: data.attendee_label_singular?.trim() || "Student",
      attendee_label_plural: data.attendee_label_plural?.trim() || "Students",
      primary_scan_field: data.primary_scan_field || "usn",
      secondary_scan_field: data.secondary_scan_field || null,
      qr_mode: data.qr_mode || "SECURE_TOKEN",
      barcode_field: data.barcode_field || "usn",
      barcode_config: data.barcode_config || data.scan_config?.barcode_config || {
        mode: "full",
        value: "",
        identifier_field: data.barcode_field || data.primary_scan_field || "usn",
        case_sensitive: false,
        min_length: null,
        max_length: null
      },
      scan_config: {
        primary_scan_field: data.primary_scan_field || "usn",
        secondary_scan_field: data.secondary_scan_field || null,
        qr_mode: data.qr_mode || "SECURE_TOKEN",
        barcode_field: data.barcode_field || "usn",
        is_uniqueness_verified: true,
        ...data.scan_config || {},
        barcode_config: data.barcode_config || data.scan_config?.barcode_config || {
          mode: "full",
          value: "",
          identifier_field: data.barcode_field || data.primary_scan_field || "usn",
          case_sensitive: false,
          min_length: null,
          max_length: null
        }
      },
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      deleted_at: null
    };
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("events").insert(newEvent);
      if (error) {
        console.warn("[Supabase DB] Error creating event with full schema, retrying without barcode_config column:", error.message);
        const { barcode_config, ...cleanEvent } = newEvent;
        const { error: retryErr } = await supabase.from("events").insert(cleanEvent);
        if (retryErr) {
          console.error("[Supabase DB] Error creating event on retry:", retryErr);
          throw new Error(`Failed to create event in database: ${retryErr.message}`);
        }
      }
    }
    this.inMemoryDB.events.push(newEvent);
    await this.logActivity(
      newEvent.id,
      adminId,
      profile?.name || "Admin",
      "event_created",
      `Event "${newEvent.title}" was created.`
    );
    return newEvent;
  }
  async updateEvent(eventId, adminId, updates) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) return null;
    const updatedData = {
      ...updates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.barcode_config) {
      updatedData.barcode_config = updates.barcode_config;
      if (!updatedData.scan_config) {
        updatedData.scan_config = {
          ...event.scan_config,
          primary_scan_field: event.primary_scan_field || "usn",
          barcode_field: event.barcode_field || "usn",
          qr_mode: event.qr_mode || "SECURE_TOKEN",
          barcode_config: updates.barcode_config
        };
      } else {
        updatedData.scan_config.barcode_config = updates.barcode_config;
      }
    }
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("events").update(updatedData).eq("id", eventId);
      if (error) {
        console.warn("[Supabase DB] Error in full event update, attempting core payload update:", error.message);
        const corePayload = {
          updated_at: updatedData.updated_at
        };
        if (updatedData.title !== void 0) corePayload.title = updatedData.title;
        if (updatedData.description !== void 0) corePayload.description = updatedData.description;
        if (updatedData.venue !== void 0) corePayload.venue = updatedData.venue;
        if (updatedData.event_date !== void 0) corePayload.event_date = updatedData.event_date;
        if (updatedData.admin_name !== void 0) corePayload.admin_name = updatedData.admin_name;
        if (updatedData.admin_phone !== void 0) corePayload.admin_phone = updatedData.admin_phone;
        if (updatedData.admin_email !== void 0) corePayload.admin_email = updatedData.admin_email;
        if (updatedData.banner_url !== void 0) corePayload.banner_url = updatedData.banner_url;
        if (updatedData.status !== void 0) corePayload.status = updatedData.status;
        if (updatedData.scan_config !== void 0) corePayload.scan_config = updatedData.scan_config;
        const { error: retryError } = await supabase.from("events").update(corePayload).eq("id", eventId);
        if (retryError) {
          console.error("[Supabase DB] Error in fallback core event update:", retryError);
          throw new Error(`Failed to update event in database: ${retryError.message}`);
        }
      }
    }
    const inMemEvent = this.inMemoryDB.events.find((e) => e.id === eventId);
    if (inMemEvent) {
      Object.assign(inMemEvent, updatedData);
    } else {
      this.inMemoryDB.events.push({ ...event, ...updatedData });
    }
    Object.assign(event, updatedData);
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "event_updated",
      `Event details updated for "${event.title}".`
    );
    return event;
  }
  async updateScanConfig(eventId, adminId, config) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const updatePayload = {
      primary_scan_field: config.primary_scan_field || "usn",
      secondary_scan_field: config.secondary_scan_field || null,
      qr_mode: config.qr_mode || "SECURE_TOKEN",
      barcode_field: config.barcode_field || "usn",
      scan_config: config,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (config.barcode_config) {
      updatePayload.barcode_config = config.barcode_config;
    }
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("events").update(updatePayload).eq("id", eventId).eq("admin_id", adminId);
      if (error) {
        console.warn("[Supabase DB] Error saving scan configuration with barcode_config column, retrying with scan_config fallback:", error.message);
        const { barcode_config, ...cleanPayload } = updatePayload;
        const { error: retryError } = await supabase.from("events").update(cleanPayload).eq("id", eventId).eq("admin_id", adminId);
        if (retryError) throw new Error(`Database error saving scan configuration: ${retryError.message}`);
      }
    }
    Object.assign(event, updatePayload);
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "event_updated",
      `Updated scanning configuration: Primary Key "${config.primary_scan_field}", QR Mode "${config.qr_mode}".`
    );
    return event;
  }
  validateDatasetUniqueness(rows, primaryKey, secondaryKey) {
    if (!rows || rows.length === 0) {
      return {
        is_unique: true,
        total_records: 0,
        unique_values_count: 0,
        duplicate_values: [],
        requires_secondary: false,
        message: "No records to validate."
      };
    }
    const getVal = (row, key) => {
      if (!key) return "";
      const direct = row[key] ?? row[key.toLowerCase()] ?? row.meta?.[key] ?? row.raw?.[key];
      if (direct !== void 0 && direct !== null && String(direct).trim() !== "") return String(direct).trim();
      if (row.raw) {
        const foundKey = Object.keys(row.raw).find((k) => k.toLowerCase() === key.toLowerCase());
        if (foundKey && row.raw[foundKey] !== void 0 && row.raw[foundKey] !== null) {
          return String(row.raw[foundKey]).trim();
        }
      }
      return "";
    };
    const primaryCounts = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      if (!pVal) continue;
      primaryCounts.set(pVal, (primaryCounts.get(pVal) || 0) + 1);
    }
    const duplicates = [];
    for (const [val, count] of primaryCounts.entries()) {
      if (count > 1) {
        duplicates.push({ value: val, count });
      }
    }
    if (duplicates.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: [],
        requires_secondary: false,
        message: `Verified! All ${rows.length} records have unique "${primaryKey}" values.`
      };
    }
    if (!secondaryKey) {
      return {
        is_unique: false,
        total_records: rows.length,
        unique_values_count: primaryCounts.size,
        duplicate_values: duplicates.slice(0, 10),
        requires_secondary: true,
        message: `Duplicate primary key detected: "${primaryKey}" has ${duplicates.length} duplicate values affecting ${duplicates.reduce((acc, d) => acc + d.count, 0)} records. Please select a secondary verification key.`
      };
    }
    const compositeCounts = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const pVal = getVal(r, primaryKey).toUpperCase();
      const sVal = getVal(r, secondaryKey).toUpperCase();
      const composite = `${pVal}:::${sVal}`;
      compositeCounts.set(composite, (compositeCounts.get(composite) || 0) + 1);
    }
    const compositeDups = [];
    for (const [comp, count] of compositeCounts.entries()) {
      if (count > 1) {
        const [p, s] = comp.split(":::");
        compositeDups.push({ value: `${primaryKey}: ${p} + ${secondaryKey}: ${s}`, count });
      }
    }
    if (compositeDups.length === 0) {
      return {
        is_unique: true,
        total_records: rows.length,
        unique_values_count: compositeCounts.size,
        duplicate_values: [],
        requires_secondary: true,
        message: `Verified! Combining "${primaryKey}" + "${secondaryKey}" uniquely identifies all ${rows.length} attendees.`
      };
    }
    return {
      is_unique: false,
      total_records: rows.length,
      unique_values_count: compositeCounts.size,
      duplicate_values: compositeDups.slice(0, 10),
      requires_secondary: true,
      message: `Combination of "${primaryKey}" + "${secondaryKey}" still contains ${compositeDups.length} duplicate pairs. Please select a different secondary key.`
    };
  }
  async deleteEvent(eventId, adminId, _permanentPurge = true) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) return false;
    const supabase = this.getClient();
    if (supabase) {
      try {
        await supabase.from("scanner_access_requests").delete().eq("event_id", eventId);
        await supabase.from("scanner_referral_codes").delete().eq("event_id", eventId);
        await supabase.from("scan_attempts").delete().eq("event_id", eventId);
        await supabase.from("check_ins").delete().eq("event_id", eventId);
        await supabase.from("scanner_accounts").delete().eq("event_id", eventId);
        await supabase.from("students").delete().eq("event_id", eventId);
        await supabase.from("activity_logs").delete().eq("event_id", eventId);
        const { error } = await supabase.from("events").delete().eq("id", eventId).eq("admin_id", adminId);
        if (error) {
          await supabase.from("events").update({ status: "DELETED", deleted_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", eventId).eq("admin_id", adminId);
        }
      } catch (err) {
        console.warn("[DBService] Notice during Supabase event deletion cascade:", err.message);
      }
    }
    this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => s.event_id !== eventId);
    this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter((sc) => sc.event_id !== eventId);
    this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => c.event_id !== eventId);
    this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id !== eventId);
    this.inMemoryDB.activity_logs = this.inMemoryDB.activity_logs.filter((al) => al.event_id !== eventId);
    this.inMemoryDB.scanner_referral_codes = this.inMemoryDB.scanner_referral_codes.filter((r) => r.event_id !== eventId);
    this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter((r) => r.event_id !== eventId);
    if (this.inMemoryDB.scanner_tokens) {
      this.inMemoryDB.scanner_tokens = this.inMemoryDB.scanner_tokens.filter((t) => t.event_id !== eventId);
    }
    this.inMemoryDB.events = this.inMemoryDB.events.filter((e) => e.id !== eventId);
    return true;
  }
  // --- REFERRAL CODES FOR SCANNER ACCESS ---
  async createReferralCode(eventId, adminId, expiresAt, maxUses = 5) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const prefix = event.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 5).toUpperCase() || "ADM";
    const randPart = import_crypto.default.randomBytes(3).toString("hex").substring(0, 4).toUpperCase();
    const code = `${prefix}-${randPart}`;
    const newReferral = {
      id: generateId(),
      event_id: eventId,
      code,
      created_by: adminId,
      status: "ACTIVE",
      max_uses: maxUses,
      times_used: 0,
      expires_at: null,
      // Scanner referral codes never expire until the event is deleted
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      event_title: event.title,
      event_venue: event.venue
    };
    const supabase = this.getClient();
    if (supabase) {
      const insertPayload = {
        id: newReferral.id,
        event_id: newReferral.event_id,
        code: newReferral.code,
        created_by: newReferral.created_by,
        status: newReferral.status,
        max_uses: newReferral.max_uses,
        times_used: newReferral.times_used,
        expires_at: newReferral.expires_at,
        created_at: newReferral.created_at,
        updated_at: newReferral.updated_at
      };
      let { error } = await supabase.from("scanner_referral_codes").insert(insertPayload);
      if (error && (error.message?.includes("max_uses") || error.message?.includes("schema cache"))) {
        delete insertPayload.max_uses;
        delete insertPayload.times_used;
        const retry = await supabase.from("scanner_referral_codes").insert(insertPayload);
        error = retry.error;
      }
      if (error) {
        console.error("[Supabase DB] Error creating referral code:", error);
        throw new Error(`Failed to create referral code: ${error.message}`);
      }
    }
    this.inMemoryDB.scanner_referral_codes.push(newReferral);
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_referral_created",
      `Created scanner referral access code "${code}".`
    );
    return newReferral;
  }
  async getReferralCodes(eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("scanner_referral_codes").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase DB] Error getting referral codes:", error);
        throw new Error(`Database error fetching referral codes: ${error.message}`);
      }
      return (data || []).map((r) => ({
        ...r,
        event_title: event.title,
        event_venue: event.venue
      }));
    }
    return this.inMemoryDB.scanner_referral_codes.filter((r) => r.event_id === eventId).map((r) => ({ ...r, event_title: event.title, event_venue: event.venue }));
  }
  async toggleReferralCode(codeId, eventId, adminId, status) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("scanner_referral_codes").update({ status, updated_at: now }).eq("id", codeId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error toggling referral code:", error);
        throw new Error(`Database error toggling referral code: ${error.message}`);
      }
      return { ...data, event_title: event.title, event_venue: event.venue };
    }
    const code = this.inMemoryDB.scanner_referral_codes.find((c) => c.id === codeId && c.event_id === eventId);
    if (!code) return null;
    code.status = status;
    code.updated_at = now;
    return { ...code, event_title: event.title, event_venue: event.venue };
  }
  async getReferralCodeByValue(codeRaw) {
    const cleanCode = (codeRaw || "").trim().toUpperCase();
    if (!cleanCode) return null;
    const supabase = this.getClient();
    let refRecord = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_referral_codes").select("*").eq("code", cleanCode).maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error looking up referral code:", error);
        throw new Error(`Database error looking up referral code: ${error.message}`);
      }
      if (data) refRecord = data;
    } else {
      refRecord = this.inMemoryDB.scanner_referral_codes.find((c) => c.code.toUpperCase() === cleanCode) || null;
    }
    if (!refRecord) return null;
    if (refRecord.status !== "ACTIVE") {
      return null;
    }
    const event = await this.getEventById(refRecord.event_id);
    if (!event || event.status === "DELETED") return null;
    return { referral: refRecord, event };
  }
  // --- SCANNER ACCESS REQUESTS & APPROVALS ---
  async createScannerAccessRequest(userId, userEmail, userName, referralCodeString) {
    const lookup = await this.getReferralCodeByValue(referralCodeString);
    if (!lookup) {
      throw new Error("Invalid, disabled, or expired scanner referral code.");
    }
    const { referral, event } = lookup;
    const maxUses = referral.max_uses ?? 5;
    const timesUsed = referral.times_used ?? 0;
    if (timesUsed >= maxUses) {
      throw new Error(`This referral code has reached its maximum redemption limit (${maxUses} users).`);
    }
    const cleanEmail = userEmail.toLowerCase().trim();
    const cleanName = userName.trim();
    const supabase = this.getClient();
    let requests = [];
    if (supabase) {
      const { data } = await supabase.from("scanner_access_requests").select("*").eq("user_id", userId).eq("event_id", event.id).order("requested_at", { ascending: false });
      if (data) requests = data;
    } else {
      requests = this.inMemoryDB.scanner_access_requests.filter((r) => r.user_id === userId && r.event_id === event.id).sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const blockedReq = requests.find((r) => r.is_blocked || r.status === "BLOCKED");
    if (blockedReq) {
      throw new Error("You have been blocked from requesting access to this event by the administrator.");
    }
    const pendingReq = requests.find((r) => r.status === "PENDING");
    if (pendingReq) {
      return {
        ...pendingReq,
        event_title: event.title,
        event_venue: event.venue,
        admin_name: event.admin_name,
        admin_email: event.admin_email
      };
    }
    const approvedReq = requests.find((r) => r.status === "APPROVED");
    if (approvedReq) {
      return {
        ...approvedReq,
        event_title: event.title,
        event_venue: event.venue,
        admin_name: event.admin_name,
        admin_email: event.admin_email
      };
    }
    const latestReq = requests[0];
    if (latestReq && latestReq.status === "REJECTED") {
      const rejectionTime = new Date(latestReq.reviewed_at || latestReq.updated_at).getTime();
      const elapsedMs = Date.now() - rejectionTime;
      const cooldownMs = 30 * 60 * 1e3;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1e3);
        const remainingMin = Math.ceil(remainingSec / 60);
        const err = new Error(`Your access request was rejected. You can request access again after the cooldown period (${remainingMin} min remaining).`);
        err.code = "COOLDOWN_ACTIVE";
        err.remainingSeconds = remainingSec;
        throw err;
      }
    }
    const newRequest = {
      id: generateId(),
      user_id: userId,
      user_email: cleanEmail,
      user_name: cleanName,
      event_id: event.id,
      referral_code_id: referral.id,
      referral_code: referral.code,
      scanner_id: null,
      gate_name: "Main Gate",
      status: "PENDING",
      is_blocked: false,
      requested_at: now,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      expires_at: null,
      created_at: now,
      updated_at: now
    };
    if (supabase) {
      const insertReqPayload = {
        id: newRequest.id,
        user_id: newRequest.user_id,
        user_email: newRequest.user_email,
        user_name: newRequest.user_name,
        event_id: newRequest.event_id,
        referral_code_id: newRequest.referral_code_id,
        referral_code: newRequest.referral_code,
        scanner_id: newRequest.scanner_id,
        gate_name: newRequest.gate_name,
        status: newRequest.status,
        is_blocked: false,
        requested_at: newRequest.requested_at,
        reviewed_at: newRequest.reviewed_at,
        reviewed_by: newRequest.reviewed_by,
        rejection_reason: newRequest.rejection_reason,
        expires_at: newRequest.expires_at,
        created_at: newRequest.created_at,
        updated_at: newRequest.updated_at
      };
      let { error } = await supabase.from("scanner_access_requests").insert(insertReqPayload);
      if (error && (error.message?.includes("referral_code") || error.message?.includes("schema cache"))) {
        delete insertReqPayload.referral_code;
        const retry = await supabase.from("scanner_access_requests").insert(insertReqPayload);
        error = retry.error;
      }
      if (error) {
        if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
          const { data: activeData } = await supabase.from("scanner_access_requests").select("*").eq("user_id", userId).eq("event_id", event.id).in("status", ["PENDING", "APPROVED"]).maybeSingle();
          if (activeData) {
            return {
              ...activeData,
              event_title: event.title,
              event_venue: event.venue,
              admin_name: event.admin_name,
              admin_email: event.admin_email
            };
          }
        }
        console.error("[Supabase DB] Error inserting access request:", error);
        throw new Error(`Failed to record access request: ${error.message}`);
      }
    }
    this.inMemoryDB.scanner_access_requests.push(newRequest);
    referral.times_used = timesUsed + 1;
    if (supabase) {
      await supabase.from("scanner_referral_codes").update({ times_used: referral.times_used }).eq("id", referral.id);
    }
    await this.logActivity(
      event.id,
      userId,
      cleanName,
      "scanner_access_requested",
      `User ${cleanName} (${cleanEmail}) requested scanner access via code "${referral.code}".`
    );
    return {
      ...newRequest,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async getMyScannerAccess(userId, eventId) {
    const supabase = this.getClient();
    let requests = [];
    if (supabase) {
      let query = supabase.from("scanner_access_requests").select("*").eq("user_id", userId);
      if (eventId) {
        query = query.eq("event_id", eventId);
      }
      query = query.order("requested_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        console.error("[Supabase DB] Error getting my scanner access:", error);
        throw new Error(`Database error fetching scanner access: ${error.message}`);
      }
      requests = data || [];
    } else {
      requests = this.inMemoryDB.scanner_access_requests.filter((r) => r.user_id === userId && (!eventId || r.event_id === eventId)).sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }
    if (requests.length === 0) return null;
    let request = requests.find((r) => r.status === "APPROVED") || requests.find((r) => r.status === "PENDING") || requests[0];
    const event = await this.getEventById(request.event_id);
    if (!event || event.status === "DELETED") {
      return null;
    }
    const adminProfile = await this.getProfileById(event.admin_id);
    if (!adminProfile) {
      return null;
    }
    let cooldownRemainingSeconds = 0;
    let canRerequest = false;
    if (request.is_blocked || request.status === "BLOCKED") {
      cooldownRemainingSeconds = 0;
      canRerequest = false;
    } else if (request.status === "REJECTED") {
      const rejectionTime = new Date(request.reviewed_at || request.updated_at).getTime();
      const cooldownMs = 30 * 60 * 1e3;
      const elapsedMs = Date.now() - rejectionTime;
      if (elapsedMs < cooldownMs) {
        cooldownRemainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1e3);
        canRerequest = false;
      } else {
        cooldownRemainingSeconds = 0;
        canRerequest = true;
      }
    } else if (request.status === "REVOKED") {
      cooldownRemainingSeconds = 0;
      canRerequest = true;
    }
    let referralCode = request.referral_code;
    if (!referralCode && request.referral_code_id) {
      if (supabase) {
        const { data: refData } = await supabase.from("scanner_referral_codes").select("code").eq("id", request.referral_code_id).maybeSingle();
        if (refData?.code) referralCode = refData.code;
      } else {
        const found = this.inMemoryDB.scanner_referral_codes.find((c) => c.id === request.referral_code_id);
        if (found) referralCode = found.code;
      }
    }
    return {
      ...request,
      referral_code: referralCode,
      cooldown_remaining_seconds: cooldownRemainingSeconds,
      can_rerequest: canRerequest,
      event,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async getScannerRequestsByEvent(eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const supabase = this.getClient();
    let list = [];
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").select("*").eq("event_id", eventId).order("requested_at", { ascending: false });
      if (error) {
        console.error("[Supabase DB] Error getting scanner requests:", error);
        throw new Error(`Database error fetching scanner requests: ${error.message}`);
      }
      list = data || [];
    } else {
      list = this.inMemoryDB.scanner_access_requests.filter((r) => r.event_id === eventId).sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    }
    const refCodes = await this.getReferralCodes(eventId, adminId).catch(() => []);
    const codeMap = /* @__PURE__ */ new Map();
    for (const c of refCodes) {
      codeMap.set(c.id, c.code);
    }
    return list.map((r) => ({
      ...r,
      referral_code: r.referral_code || (r.referral_code_id ? codeMap.get(r.referral_code_id) : void 0) || "Direct Referral",
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    }));
  }
  async approveScannerRequest(requestId, eventId, adminId, scannerId, gateName, durationHours) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = /* @__PURE__ */ new Date();
    let expiresAt = null;
    if (durationHours && durationHours > 0) {
      expiresAt = new Date(now.getTime() + durationHours * 3600 * 1e3).toISOString();
    }
    const assignedGate = (gateName || "Main Gate").trim();
    const updatePayload = {
      status: "APPROVED",
      scanner_id: scannerId || null,
      gate_name: assignedGate,
      reviewed_by: adminId,
      reviewed_at: now.toISOString(),
      rejection_reason: null,
      expires_at: expiresAt,
      updated_at: now.toISOString()
    };
    const supabase = this.getClient();
    let updated = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").update(updatePayload).eq("id", requestId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error approving scanner request:", error);
        throw new Error(`Failed to approve scanner request: ${error.message}`);
      }
      updated = data;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error("Request not found");
      Object.assign(req, updatePayload);
      updated = req;
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_access_approved",
      `Approved scanner access for ${updated.user_name} (${updated.user_email}) at ${assignedGate}.`
    );
    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async rejectScannerRequest(requestId, eventId, adminId, reason) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updatePayload = {
      status: "REJECTED",
      rejection_reason: (reason || "Access denied by event administrator.").trim(),
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now
    };
    const supabase = this.getClient();
    let updated = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").update(updatePayload).eq("id", requestId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error rejecting scanner request:", error);
        throw new Error(`Failed to reject scanner request: ${error.message}`);
      }
      updated = data;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error("Request not found");
      Object.assign(req, updatePayload);
      updated = req;
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_access_rejected",
      `Rejected scanner access request from ${updated.user_name} (${updated.user_email}). Reason: ${updatePayload.rejection_reason}`
    );
    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async revokeScannerRequest(requestId, eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updatePayload = {
      status: "REVOKED",
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now
    };
    const supabase = this.getClient();
    let updated = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").update(updatePayload).eq("id", requestId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error revoking scanner request:", error);
        throw new Error(`Failed to revoke scanner access: ${error.message}`);
      }
      updated = data;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error("Request not found");
      Object.assign(req, updatePayload);
      updated = req;
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_access_revoked",
      `Revoked scanner access for ${updated.user_name} (${updated.user_email}) at ${updated.gate_name}.`
    );
    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async blockScannerUser(requestId, eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updatePayload = {
      status: "BLOCKED",
      is_blocked: true,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now
    };
    const supabase = this.getClient();
    let updated = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").update(updatePayload).eq("id", requestId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error blocking scanner user:", error);
        throw new Error(`Failed to block scanner operator: ${error.message}`);
      }
      updated = data;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error("Request not found");
      Object.assign(req, updatePayload);
      updated = req;
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_access_blocked",
      `Blocked scanner operator ${updated.user_name} (${updated.user_email}) from requesting access.`
    );
    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async unblockScannerUser(requestId, eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updatePayload = {
      status: "REVOKED",
      is_blocked: false,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now
    };
    const supabase = this.getClient();
    let updated = null;
    if (supabase) {
      const { data, error } = await supabase.from("scanner_access_requests").update(updatePayload).eq("id", requestId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error unblocking scanner user:", error);
        throw new Error(`Failed to unblock scanner operator: ${error.message}`);
      }
      updated = data;
    } else {
      const req = this.inMemoryDB.scanner_access_requests.find((r) => r.id === requestId && r.event_id === eventId);
      if (!req) throw new Error("Request not found");
      Object.assign(req, updatePayload);
      updated = req;
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_access_unblocked",
      `Unblocked scanner operator ${updated.user_name} (${updated.user_email}). Operator is now permitted to request access.`
    );
    return {
      ...updated,
      event_title: event.title,
      event_venue: event.venue,
      admin_name: event.admin_name,
      admin_email: event.admin_email
    };
  }
  async deleteScannerAccessRequest(requestId, eventId, adminId) {
    if (eventId && adminId) {
      const event = await this.getEventById(eventId, adminId);
      if (!event) throw new Error("Unauthorized or event not found");
    }
    const supabase = this.getClient();
    if (supabase) {
      let query = supabase.from("scanner_access_requests").delete().eq("id", requestId);
      if (eventId) query = query.eq("event_id", eventId);
      const { error } = await query;
      if (error) throw new Error(`Database error deleting scanner request: ${error.message}`);
    }
    this.inMemoryDB.scanner_access_requests = this.inMemoryDB.scanner_access_requests.filter(
      (r) => r.id !== requestId
    );
    return true;
  }
  async validateScannerEventAccess(userId, eventId) {
    const event = await this.getEventById(eventId);
    if (!event || event.status === "DELETED") {
      return { authorized: false, gateName: "", reason: "Event has been deleted or not found." };
    }
    const adminProfile = await this.getProfileById(event.admin_id);
    if (!adminProfile) {
      return { authorized: false, gateName: "", reason: "Event organizer account no longer exists." };
    }
    if (event.admin_id === userId) {
      return { authorized: true, gateName: "Admin Terminal", scannerId: event.admin_id };
    }
    const scanner = await this.getScannerById(userId);
    if (scanner) {
      if (scanner.event_id !== eventId) {
        return { authorized: false, gateName: "", reason: "Scanner is not authorized for this event." };
      }
      if (!scanner.is_active) {
        return { authorized: false, gateName: "", reason: "Scanner account is disabled." };
      }
      return { authorized: true, gateName: scanner.name, scannerId: scanner.id };
    }
    const supabase = this.getClient();
    let request = null;
    if (supabase) {
      const { data } = await supabase.from("scanner_access_requests").select("*").eq("user_id", userId).eq("event_id", eventId).eq("status", "APPROVED").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (data) request = data;
    } else {
      request = this.inMemoryDB.scanner_access_requests.find(
        (r) => r.user_id === userId && r.event_id === eventId && r.status === "APPROVED"
      ) || null;
    }
    if (!request) {
      return { authorized: false, gateName: "", reason: "No approved scanner access found for this event." };
    }
    if (request.is_blocked || request.status === "BLOCKED") {
      return { authorized: false, gateName: "", reason: "Scanner operator access has been blocked by administrator." };
    }
    return { authorized: true, gateName: request.gate_name, scannerId: request.scanner_id || void 0 };
  }
  // --- ATTENDEES / STUDENTS ---
  async getStudents(eventId, adminId, search, branch, checkedInFilter, limit, offset = 0) {
    const event = await this.getEventById(eventId);
    if (!event) throw new Error("Unauthorized or event not found");
    const supabase = this.getClient();
    let list = [];
    let checkInsList = [];
    if (supabase) {
      const { data: studentsData, error: stErr } = await supabase.from("students").select("*").eq("event_id", eventId).order("sl_no", { ascending: true });
      if (stErr) {
        console.error("[Supabase DB] Error fetching students:", stErr);
        throw new Error(`Database error fetching attendees: ${stErr.message}`);
      }
      list = studentsData || [];
      const { data: chkData, error: chkErr } = await supabase.from("check_ins").select("*").eq("event_id", eventId);
      if (chkErr) {
        console.error("[Supabase DB] Error fetching check_ins:", chkErr);
        throw new Error(`Database error fetching check_ins: ${chkErr.message}`);
      }
      checkInsList = chkData || [];
    } else {
      list = this.inMemoryDB.students.filter((s) => s.event_id === eventId);
      checkInsList = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
    }
    const checkedInMap = /* @__PURE__ */ new Map();
    checkInsList.forEach((c) => checkedInMap.set(c.student_id, c));
    let enriched = list.map((s) => {
      const checkin = checkedInMap.get(s.id);
      return {
        ...s,
        is_checked_in: Boolean(checkin),
        checked_in_at: checkin?.check_in_at,
        scan_type: checkin?.scan_type
      };
    });
    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (s) => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q) || s.email && s.email.toLowerCase().includes(q) || s.qr_code.toLowerCase().includes(q) || s.barcode.toLowerCase().includes(q)
      );
    }
    if (branch && branch !== "ALL") {
      enriched = enriched.filter((s) => s.branch === branch);
    }
    if (checkedInFilter === "CHECKED_IN") {
      enriched = enriched.filter((s) => s.is_checked_in);
    } else if (checkedInFilter === "NOT_CHECKED_IN") {
      enriched = enriched.filter((s) => !s.is_checked_in);
    }
    if (limit !== void 0 && limit > 0) {
      return enriched.slice(offset, offset + limit);
    }
    return offset > 0 ? enriched.slice(offset) : enriched;
  }
  async createStudent(eventId, adminId, data) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const usnClean = (data.usn || "").trim().toUpperCase();
    if (!usnClean) throw new Error("USN is required");
    if (data.meta && JSON.stringify(data.meta).length > 32768) {
      throw new Error("Student metadata exceeds maximum allowed payload of 32KB");
    }
    const supabase = this.getClient();
    if (supabase) {
      const { data: existing, error: exErr } = await supabase.from("students").select("id").eq("event_id", eventId).eq("usn", usnClean).maybeSingle();
      if (exErr) throw new Error(`Database error checking duplicate USN: ${exErr.message}`);
      if (existing) {
        throw new Error(`Attendee with USN ${usnClean} already exists in this event.`);
      }
    } else {
      const existing = this.inMemoryDB.students.find((s) => s.event_id === eventId && s.usn.toUpperCase() === usnClean);
      if (existing) {
        throw new Error(`Attendee with USN ${usnClean} already exists in this event.`);
      }
    }
    const barcodeClean = (data.barcode || "").trim();
    if (barcodeClean) {
      if (barcodeClean.length < 5) {
        throw new Error("Barcode must be at least 5 characters long.");
      }
      if (supabase) {
        const { data: existingBarcode, error: bErr } = await supabase.from("students").select("id").eq("event_id", eventId).eq("barcode", barcodeClean).maybeSingle();
        if (bErr) throw new Error(`Database error checking duplicate barcode: ${bErr.message}`);
        if (existingBarcode) {
          throw new Error(`Attendee with barcode "${barcodeClean}" already exists in this event.`);
        }
      } else {
        const existingBarcode = this.inMemoryDB.students.find(
          (s) => s.event_id === eventId && s.barcode === barcodeClean
        );
        if (existingBarcode) {
          throw new Error(`Attendee with barcode "${barcodeClean}" already exists in this event.`);
        }
      }
    }
    const id = generateId();
    const secureToken = `adm_sec_${import_crypto.default.randomBytes(16).toString("hex")}`;
    const barcodeRand = Math.floor(1e9 + Math.random() * 9e9).toString();
    let count = 0;
    if (supabase) {
      const { count: c, error: cErr } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("event_id", eventId);
      if (cErr) throw new Error(`Database error counting attendees: ${cErr.message}`);
      count = c || 0;
    } else {
      count = this.inMemoryDB.students.filter((s) => s.event_id === eventId).length;
    }
    const student = {
      id,
      event_id: eventId,
      sl_no: data.sl_no || count + 1,
      usn: usnClean,
      name: (data.name || "Anonymous Attendee").trim(),
      email: data.email?.trim() || "",
      phone_number: data.phone_number?.trim() || "",
      year: data.year?.trim() || "General",
      section: data.section?.trim() || "A",
      branch: data.branch?.trim() || "General",
      qr_code: data.qr_code?.trim() || secureToken,
      barcode: barcodeClean || barcodeRand,
      meta: data.meta || {},
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase) {
      const { error } = await supabase.from("students").insert(student);
      if (error) {
        console.error("[Supabase DB] Error creating student:", error);
        throw new Error(`Failed to create attendee in database: ${error.message}`);
      }
    }
    this.inMemoryDB.students.push(student);
    return student;
  }
  async importStudentsBatch(eventId, adminId, attendees, scanConfig) {
    if (attendees.length > 5e3) {
      throw new Error("Maximum batch import limit is 5,000 attendees per request.");
    }
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    if (scanConfig) {
      await this.updateScanConfig(eventId, adminId, scanConfig);
    }
    const primaryKeyField = scanConfig?.primary_scan_field || event.primary_scan_field || "usn";
    const secondaryKeyField = scanConfig?.secondary_scan_field || event.secondary_scan_field || "";
    const qrMode = scanConfig?.qr_mode || event.qr_mode || "SECURE_TOKEN";
    const barcodeField = scanConfig?.barcode_field || event.barcode_field || "usn";
    const supabase = this.getClient();
    let existingIdentifiers = /* @__PURE__ */ new Set();
    if (supabase) {
      const { data: existingRows, error: exErr } = await supabase.from("students").select("usn, meta").eq("event_id", eventId);
      if (exErr) throw new Error(`Database error fetching existing attendees: ${exErr.message}`);
      if (existingRows) {
        existingRows.forEach((r) => {
          const val = (r[primaryKeyField] || r.meta?.[primaryKeyField] || r.usn || "").toString().trim().toUpperCase();
          if (val) existingIdentifiers.add(val);
        });
      }
    } else {
      this.inMemoryDB.students.filter((s) => s.event_id === eventId).forEach((s) => {
        const val = (s[primaryKeyField] || s.meta?.[primaryKeyField] || s.usn || "").toString().trim().toUpperCase();
        if (val) existingIdentifiers.add(val);
      });
    }
    let imported = 0;
    let duplicates = 0;
    const errors = [];
    const newStudentsToInsert = [];
    let currentSlNo = existingIdentifiers.size;
    for (let i = 0; i < attendees.length; i++) {
      const row = attendees[i];
      const rowMeta = row.meta || row.raw || {};
      if (Buffer.byteLength(JSON.stringify(rowMeta), "utf8") > 32768) {
        errors.push(`Row ${i + 1}: Metadata payload exceeds 32KB limit.`);
        continue;
      }
      const usnClean = (row.usn || row.meta && row.meta[primaryKeyField] || `ATT-${i + 1}`).toString().trim().toUpperCase();
      if (!usnClean && !row.name) {
        errors.push(`Row ${i + 1}: Missing required identifier or name.`);
        continue;
      }
      if (existingIdentifiers.has(usnClean)) {
        duplicates++;
        continue;
      }
      currentSlNo++;
      const id = generateId();
      const barcodeRand = Math.floor(1e9 + Math.random() * 9e9).toString();
      let generatedQr = row.qr_code?.trim();
      if (!generatedQr) {
        if (qrMode === "FULL_DATA") {
          generatedQr = JSON.stringify({
            type: "ADMITTO_ATTENDEE",
            version: 1,
            event_id: eventId,
            usn: usnClean,
            name: row.name?.trim() || "Attendee",
            email: row.email?.trim() || void 0,
            phone: row.phone_number?.trim() || void 0,
            branch: row.branch?.trim() || void 0,
            year: row.year?.trim() || void 0,
            section: row.section?.trim() || void 0,
            meta: row.meta || void 0
          });
        } else {
          const attendeeToken = `adm_sec_${import_crypto.default.randomBytes(16).toString("hex")}`;
          generatedQr = JSON.stringify({
            type: "ADMITTO_ATTENDEE",
            event_id: eventId,
            attendee_token: attendeeToken,
            version: 1
          });
        }
      }
      let generatedBarcode = row.barcode?.trim();
      const activeBarcodeConfig = scanConfig?.barcode_config || event.barcode_config;
      if (!generatedBarcode) {
        let baseVal = usnClean;
        if (barcodeField === "primary_key" || barcodeField === primaryKeyField || barcodeField === "usn") {
          baseVal = usnClean;
        } else if (barcodeField === "secondary_key" || secondaryKeyField && barcodeField === secondaryKeyField) {
          const secVal = row.meta && row.meta[secondaryKeyField] || row.email || row.phone_number || usnClean;
          baseVal = String(secVal).trim();
        } else if (barcodeField === "token" || barcodeField === "secure_token") {
          baseVal = barcodeRand;
        } else if (barcodeField && row.meta && row.meta[barcodeField]) {
          baseVal = String(row.meta[barcodeField]).trim();
        } else if (barcodeField && row[barcodeField]) {
          baseVal = String(row[barcodeField]).trim();
        }
        if (activeBarcodeConfig && activeBarcodeConfig.extraction_mode === "custom") {
          generatedBarcode = extractBarcodeIdentifier(baseVal, activeBarcodeConfig);
        } else {
          generatedBarcode = baseVal || barcodeRand;
        }
      }
      const newStudent = {
        id,
        event_id: eventId,
        sl_no: row.sl_no || currentSlNo,
        usn: usnClean,
        name: (row.name || "Attendee").trim(),
        email: row.email?.trim() || "",
        phone_number: row.phone_number?.trim() || "",
        year: row.year?.trim() || "General",
        section: row.section?.trim() || "A",
        branch: row.branch?.trim() || "General",
        qr_code: generatedQr,
        barcode: generatedBarcode,
        meta: row.meta || row.raw || {},
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      newStudentsToInsert.push(newStudent);
      existingIdentifiers.add(usnClean);
      imported++;
    }
    if (newStudentsToInsert.length > 0) {
      if (supabase) {
        const chunkSize = 100;
        for (let i = 0; i < newStudentsToInsert.length; i += chunkSize) {
          const chunk = newStudentsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from("students").insert(chunk);
          if (error) {
            console.error("[Supabase DB] Error inserting student chunk:", error);
            throw new Error(`Failed to import attendees chunk into database: ${error.message}`);
          }
        }
      }
      this.inMemoryDB.students.push(...newStudentsToInsert);
    }
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "list_imported",
      `Imported ${imported} attendees into ${event.title}. (${duplicates} duplicates skipped).`,
      { total_submitted: attendees.length, imported, duplicates, errors_count: errors.length }
    );
    return { imported, duplicates, errors };
  }
  async toggleStudentCheckIn(studentId, isCheckedIn, adminId) {
    const supabase = this.getClient();
    let student = null;
    if (supabase) {
      const { data, error } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
      if (error) throw new Error(`Database error fetching attendee: ${error.message}`);
      if (data) student = data;
    } else {
      student = this.inMemoryDB.students.find((s) => s.id === studentId) || null;
    }
    if (!student) return null;
    if (adminId) {
      const event = await this.getEventById(student.event_id, adminId);
      if (!event) throw new Error("Unauthorized");
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (isCheckedIn) {
      if (supabase) {
        const { error } = await supabase.from("check_ins").upsert(
          {
            event_id: student.event_id,
            student_id: student.id,
            scan_type: "QR",
            check_in_at: now,
            status: "SUCCESS",
            source: "online"
          },
          { onConflict: "event_id,student_id" }
        );
        if (error) throw new Error(`Database error recording check-in: ${error.message}`);
        await supabase.from("scan_attempts").insert({
          id: generateId(),
          event_id: student.event_id,
          scanner_id: adminId || null,
          student_id: student.id,
          scanned_value: student.usn || student.qr_code || "MANUAL-ADMIN-CHECKIN",
          scan_type: "QR",
          result: "success",
          reason: "Manual Admission via Admin Console",
          timestamp: now
        });
      }
      const existing = this.inMemoryDB.check_ins.find((c) => c.student_id === studentId && c.event_id === student.event_id);
      if (!existing) {
        this.inMemoryDB.check_ins.push({
          id: generateId(),
          event_id: student.event_id,
          student_id: student.id,
          scan_type: "QR",
          check_in_at: now,
          status: "SUCCESS",
          source: "online",
          created_at: now,
          updated_at: now
        });
        this.inMemoryDB.scan_attempts.push({
          id: generateId(),
          event_id: student.event_id,
          scanner_id: adminId || null,
          student_id: student.id,
          scanned_value: student.usn || student.qr_code || "MANUAL-ADMIN-CHECKIN",
          scan_type: "QR",
          result: "success",
          reason: "Manual Admission via Admin Console",
          timestamp: now
        });
      }
    } else {
      if (supabase) {
        const { error } = await supabase.from("check_ins").delete().eq("event_id", student.event_id).eq("student_id", student.id);
        if (error) throw new Error(`Database error deleting check-in: ${error.message}`);
        await supabase.from("scan_attempts").delete().eq("event_id", student.event_id).eq("student_id", student.id);
      }
      this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter(
        (c) => !(c.student_id === studentId && c.event_id === student.event_id)
      );
      this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter(
        (a) => !(a.student_id === studentId && a.event_id === student.event_id)
      );
    }
    return {
      ...student,
      is_checked_in: isCheckedIn,
      checked_in_at: isCheckedIn ? now : void 0
    };
  }
  async deleteStudent(eventId, studentId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("students").delete().eq("id", studentId).eq("event_id", eventId);
      if (error) throw new Error(`Database error deleting attendee: ${error.message}`);
    }
    this.inMemoryDB.students = this.inMemoryDB.students.filter((s) => !(s.event_id === eventId && s.id === studentId));
    this.inMemoryDB.check_ins = this.inMemoryDB.check_ins.filter((c) => !(c.event_id === eventId && c.student_id === studentId));
    this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter((a) => !(a.event_id === eventId && a.student_id === studentId));
    return true;
  }
  async deleteStudentById(studentId, adminId) {
    const supabase = this.getClient();
    let eventId = null;
    if (supabase) {
      const { data, error } = await supabase.from("students").select("event_id").eq("id", studentId).maybeSingle();
      if (error) throw new Error(`Database error fetching attendee event: ${error.message}`);
      if (data) eventId = data.event_id;
    } else {
      const student = this.inMemoryDB.students.find((s) => s.id === studentId);
      if (student) eventId = student.event_id;
    }
    if (!eventId) return false;
    return this.deleteStudent(eventId, studentId, adminId);
  }
  // --- SCANNERS & GATE STATIONS MANAGEMENT ---
  async getScannerById(scannerId) {
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("scanner_accounts").select("*").eq("id", scannerId).maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error fetching scanner by id:", error);
        throw new Error(`Database error fetching scanner: ${error.message}`);
      }
      return data || null;
    }
    return this.inMemoryDB.scanner_accounts.find((s) => s.id === scannerId) || null;
  }
  async getScannerByEmailOrCodeAndEvent(identifier, eventId) {
    const clean = (identifier || "").trim();
    const cleanEmail = clean.toLowerCase();
    const cleanCode = clean.toUpperCase();
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("scanner_accounts").select("*").eq("event_id", eventId).or(`email.ilike.${cleanEmail},access_code.eq.${cleanCode}`).maybeSingle();
      if (error) {
        console.error("[Supabase DB] Error fetching scanner by identifier:", error);
        throw new Error(`Database error fetching scanner: ${error.message}`);
      }
      return data || null;
    }
    return this.inMemoryDB.scanner_accounts.find(
      (s) => s.event_id === eventId && (s.email.toLowerCase() === cleanEmail || s.access_code.toUpperCase() === cleanCode)
    ) || null;
  }
  async getScannersByEvent(eventId, adminId) {
    if (adminId) {
      const event = await this.getEventById(eventId, adminId);
      if (!event) throw new Error("Unauthorized");
    }
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("scanner_accounts").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
      if (error) {
        console.error("[Supabase DB] Error fetching scanners:", error);
        throw new Error(`Database error fetching scanners: ${error.message}`);
      }
      return data || [];
    }
    return this.inMemoryDB.scanner_accounts.filter((s) => s.event_id === eventId);
  }
  async createScanner(eventId, adminId, data) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const cleanCode = (data.access_code || `GATE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`).trim().toUpperCase();
    const cleanEmail = (data.email?.trim() || `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`).toLowerCase();
    const cleanName = (data.name || "Gate Scanner").trim();
    const normalizedNewName = cleanName.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase().replace(/\s+/g, " ");
    const cleanPassword = data.password?.trim() || cleanCode;
    const supabase = this.getClient();
    if (supabase) {
      const { data: existingList, error: exErr } = await supabase.from("scanner_accounts").select("id, email, access_code, name").eq("event_id", eventId);
      if (exErr) throw new Error(`Database error verifying scanner unique constraint: ${exErr.message}`);
      if (existingList && existingList.length > 0) {
        const dupEmail = existingList.find(
          (s) => (s.email || "").toLowerCase().trim() === cleanEmail
        );
        if (dupEmail) {
          throw new Error(`Duplicate email: A scanner account with email "${cleanEmail}" already exists. Each scanner account must have a unique email.`);
        }
        const dupName = existingList.find((s) => {
          const sName = (s.name || "").trim().toLowerCase().replace(/\s+/g, " ");
          const sNormalized = (s.name || "").replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase().replace(/\s+/g, " ");
          return sName === cleanName.toLowerCase().replace(/\s+/g, " ") || sNormalized === normalizedNewName;
        });
        if (dupName) {
          throw new Error(`Duplicate operator name: An operator with name "${cleanName}" already exists. Names cannot be identical; at least one letter must be different.`);
        }
        const dupCode = existingList.find(
          (s) => (s.access_code || "").toUpperCase().trim() === cleanCode
        );
        if (dupCode) {
          throw new Error(`Duplicate scanner ID: Access code "${cleanCode}" already exists for this event.`);
        }
      }
    } else {
      const existingList = this.inMemoryDB.scanner_accounts.filter((s) => s.event_id === eventId);
      const dupEmail = existingList.find(
        (s) => s.email.toLowerCase().trim() === cleanEmail
      );
      if (dupEmail) {
        throw new Error(`Duplicate email: A scanner account with email "${cleanEmail}" already exists. Each scanner account must have a unique email.`);
      }
      const dupName = existingList.find((s) => {
        const sName = s.name.trim().toLowerCase().replace(/\s+/g, " ");
        const sNormalized = s.name.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase().replace(/\s+/g, " ");
        return sName === cleanName.toLowerCase().replace(/\s+/g, " ") || sNormalized === normalizedNewName;
      });
      if (dupName) {
        throw new Error(`Duplicate operator name: An operator with name "${cleanName}" already exists. Names cannot be identical; at least one letter must be different.`);
      }
      const dupCode = existingList.find(
        (s) => s.access_code.toUpperCase().trim() === cleanCode
      );
      if (dupCode) {
        throw new Error(`Duplicate scanner ID: Access code "${cleanCode}" already exists for this event.`);
      }
    }
    const scanner = {
      id: generateId(),
      event_id: eventId,
      email: cleanEmail,
      password_hash: cleanPassword,
      access_code: cleanCode,
      name: cleanName,
      role: "SCANNER",
      is_active: true,
      expires_at: data.expires_at || null,
      last_login_at: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase) {
      const { error } = await supabase.from("scanner_accounts").insert(scanner);
      if (error) {
        console.error("[Supabase DB] Error creating scanner:", error);
        throw new Error(`Failed to create scanner account in database: ${error.message}`);
      }
    }
    this.inMemoryDB.scanner_accounts.push(scanner);
    this.inMemoryDB.passwords[cleanEmail] = cleanPassword;
    await this.logActivity(
      eventId,
      adminId,
      event.admin_name,
      "scanner_created",
      `Scanner "${scanner.name}" (${scanner.access_code}) created for gate access.`
    );
    return scanner;
  }
  async updateScanner(eventId, scannerId, adminId, updates) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const supabase = this.getClient();
    const updatedData = {
      ...updates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.is_active === false) {
      notifyScannerInvalidated(scannerId);
    }
    if (supabase) {
      const { data, error } = await supabase.from("scanner_accounts").update(updatedData).eq("id", scannerId).eq("event_id", eventId).select("*").single();
      if (error) {
        console.error("[Supabase DB] Error updating scanner:", error);
        throw new Error(`Failed to update scanner in database: ${error.message}`);
      }
      return data;
    }
    const scanner = this.inMemoryDB.scanner_accounts.find((s) => s.id === scannerId && s.event_id === eventId);
    if (!scanner) return null;
    Object.assign(scanner, updatedData);
    return scanner;
  }
  async toggleScannerStatusById(scannerId, adminId, isActive) {
    const supabase = this.getClient();
    let eventId = null;
    if (supabase) {
      const { data: sData, error: sErr } = await supabase.from("scanner_accounts").select("event_id").eq("id", scannerId).maybeSingle();
      if (sErr) throw new Error(`Database error looking up scanner: ${sErr.message}`);
      if (sData) eventId = sData.event_id;
    } else {
      const s = this.inMemoryDB.scanner_accounts.find((item) => item.id === scannerId);
      if (s) eventId = s.event_id;
    }
    if (!eventId) throw new Error("Scanner account not found");
    return this.updateScanner(eventId, scannerId, adminId, { is_active: isActive });
  }
  async deleteScanner(eventId, scannerId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    notifyScannerInvalidated(scannerId);
    const supabase = this.getClient();
    if (supabase) {
      const { error } = await supabase.from("scanner_accounts").delete().eq("id", scannerId).eq("event_id", eventId);
      if (error) throw new Error(`Failed to delete scanner from database: ${error.message}`);
    }
    this.inMemoryDB.scanner_accounts = this.inMemoryDB.scanner_accounts.filter(
      (s) => !(s.id === scannerId && s.event_id === eventId)
    );
    return true;
  }
  async deleteScannerById(scannerId, adminId) {
    const supabase = this.getClient();
    let eventId = null;
    if (supabase) {
      const { data: sData, error: sErr } = await supabase.from("scanner_accounts").select("event_id").eq("id", scannerId).maybeSingle();
      if (sErr) throw new Error(`Database error looking up scanner: ${sErr.message}`);
      if (sData) eventId = sData.event_id;
    } else {
      const s = this.inMemoryDB.scanner_accounts.find((item) => item.id === scannerId);
      if (s) eventId = s.event_id;
    }
    if (!eventId) throw new Error("Scanner account not found");
    return this.deleteScanner(eventId, scannerId, adminId);
  }
  // --- CENTRALIZED ATOMIC CHECK-IN ENGINE ---
  async processCheckIn(params) {
    const { eventId, scannedValue, scanType, scannerId, clientScanId, source = "online", secondaryValue } = params;
    const cleanVal = (scannedValue || "").trim();
    const cleanSecVal = (secondaryValue || "").trim();
    const event = await this.getEventById(eventId);
    if (!event || event.status === "DELETED") {
      return { success: false, status: "WRONG_EVENT", message: "Event not found or inactive." };
    }
    if (!cleanVal) {
      return {
        success: false,
        status: "INVALID_TOKEN",
        message: "No QR or barcode data provided."
      };
    }
    const supabase = this.getClient();
    if (scanType === "BARCODE") {
      const barcodeConfig = resolveBarcodeConfig(event);
      const patternResult = validateBarcodePattern(cleanVal, barcodeConfig);
      if (!patternResult.valid) {
        this.inMemoryDB.scan_attempts.push({
          id: generateId(),
          event_id: eventId,
          scanner_id: scannerId || null,
          student_id: null,
          scanned_value: cleanVal,
          scan_type: scanType,
          result: "invalid",
          reason: patternResult.message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (supabase) {
          try {
            await supabase.from("scan_attempts").insert({
              event_id: eventId,
              scanner_id: scannerId || null,
              student_id: null,
              scanned_value: cleanVal,
              scan_type: scanType,
              result: "invalid",
              reason: patternResult.message
            });
          } catch (e) {
          }
        }
        return {
          success: false,
          status: "INVALID_BARCODE",
          message: patternResult.message
        };
      }
      if (clientScanId) {
        const existingIdempotent = this.inMemoryDB.check_ins.find(
          (c) => c.event_id === eventId && c.client_scan_id === clientScanId
        );
        if (existingIdempotent) {
          const student3 = this.inMemoryDB.students.find((s) => s.id === existingIdempotent.student_id);
          return {
            success: true,
            status: "IDEMPOTENT_SUCCESS",
            message: "Check-in was already recorded successfully.",
            student: student3 ? { ...student3, is_checked_in: true, checked_in_at: existingIdempotent.check_in_at } : void 0,
            check_in_id: existingIdempotent.id,
            check_in_at: existingIdempotent.check_in_at
          };
        }
      }
      const extractedIdentifier = patternResult.extractedIdentifier;
      const identifierField = patternResult.identifierField;
      const caseSensitive = patternResult.caseSensitive;
      let matchingStudents2 = [];
      if (supabase) {
        const { data: studentsData } = await supabase.from("students").select("*").eq("event_id", eventId);
        const studentList = studentsData || [];
        matchingStudents2 = studentList.filter(
          (s) => matchAttendeeWithIdentifier(s, identifierField, extractedIdentifier, caseSensitive, barcodeConfig)
        );
      } else {
        matchingStudents2 = this.inMemoryDB.students.filter(
          (s) => s.event_id === eventId && matchAttendeeWithIdentifier(s, identifierField, extractedIdentifier, caseSensitive, barcodeConfig)
        );
      }
      if (matchingStudents2.length === 0) {
        this.inMemoryDB.scan_attempts.push({
          id: generateId(),
          event_id: eventId,
          scanner_id: scannerId || null,
          student_id: null,
          scanned_value: cleanVal,
          scan_type: scanType,
          result: "invalid",
          reason: "Attendee not found",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (supabase) {
          try {
            await supabase.from("scan_attempts").insert({
              event_id: eventId,
              scanner_id: scannerId || null,
              student_id: null,
              scanned_value: cleanVal,
              scan_type: scanType,
              result: "invalid",
              reason: "Attendee not found"
            });
          } catch (e) {
          }
        }
        return {
          success: false,
          status: "ATTENDEE_NOT_FOUND",
          message: "Barcode recognized, but no registered attendee was found."
        };
      }
      let student2 = matchingStudents2[0];
      if (matchingStudents2.length > 1) {
        if (cleanSecVal) {
          const secField = event.secondary_scan_field || "email";
          student2 = matchingStudents2.find((s) => {
            const val = (s[secField] || s.meta?.[secField] || "").toString();
            return caseSensitive ? val === cleanSecVal : val.toUpperCase() === cleanSecVal.toUpperCase();
          }) || matchingStudents2[0];
        } else {
          return {
            success: false,
            status: "AMBIGUOUS_MATCH",
            message: `Multiple attendees found with ${identifierField} "${extractedIdentifier}". Additional verification required (${event.secondary_scan_field || "secondary key"}).`,
            requires_secondary: true,
            secondary_field: event.secondary_scan_field || "email",
            primary_value: cleanVal
          };
        }
      }
      let existingCheckIn2;
      if (supabase) {
        const { data: existingChk } = await supabase.from("check_ins").select("*").eq("event_id", eventId).eq("student_id", student2.id).maybeSingle();
        if (existingChk) existingCheckIn2 = existingChk;
      } else {
        existingCheckIn2 = this.inMemoryDB.check_ins.find((c) => c.event_id === eventId && c.student_id === student2.id);
      }
      if (existingCheckIn2) {
        const checkInTimeStr = new Date(existingCheckIn2.check_in_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        this.inMemoryDB.scan_attempts.push({
          id: generateId(),
          event_id: eventId,
          scanner_id: scannerId || null,
          student_id: student2.id,
          scanned_value: cleanVal,
          scan_type: scanType,
          result: "duplicate",
          reason: `Already checked in at ${checkInTimeStr}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (supabase) {
          try {
            await supabase.from("scan_attempts").insert({
              event_id: eventId,
              scanner_id: scannerId || null,
              student_id: student2.id,
              scanned_value: cleanVal,
              scan_type: scanType,
              result: "duplicate",
              reason: `Already checked in at ${checkInTimeStr}`
            });
          } catch (e) {
          }
        }
        return {
          success: false,
          status: "DUPLICATE_CHECKIN",
          message: `ALREADY CHECKED IN at ${checkInTimeStr}`,
          student: { ...student2, is_checked_in: true, checked_in_at: existingCheckIn2.check_in_at },
          check_in_at: existingCheckIn2.check_in_at
        };
      }
      const checkInId2 = generateId();
      const checkInTime2 = (/* @__PURE__ */ new Date()).toISOString();
      const newCheckIn2 = {
        id: checkInId2,
        event_id: eventId,
        student_id: student2.id,
        scanner_id: scannerId || null,
        scan_type: scanType,
        check_in_at: checkInTime2,
        status: "SUCCESS",
        source,
        client_scan_id: clientScanId || null,
        created_at: checkInTime2,
        updated_at: checkInTime2
      };
      if (supabase) {
        try {
          await supabase.from("check_ins").insert(newCheckIn2);
          await supabase.from("scan_attempts").insert({
            event_id: eventId,
            scanner_id: scannerId || null,
            student_id: student2.id,
            scanned_value: cleanVal,
            scan_type: scanType,
            result: "success",
            reason: "Access granted"
          });
        } catch (e) {
          console.error("[Supabase DB] Error inserting check_in:", e);
        }
      }
      this.inMemoryDB.check_ins.push(newCheckIn2);
      this.inMemoryDB.scan_attempts.push({
        id: generateId(),
        event_id: eventId,
        scanner_id: scannerId || null,
        student_id: student2.id,
        scanned_value: cleanVal,
        scan_type: scanType,
        result: "success",
        reason: "Access granted",
        timestamp: checkInTime2
      });
      return {
        success: true,
        status: "SUCCESS",
        message: "Check-in confirmed successfully.",
        student: {
          ...student2,
          is_checked_in: true,
          checked_in_at: checkInTime2,
          scan_type: scanType
        },
        check_in_id: checkInId2,
        check_in_at: checkInTime2
      };
    }
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc("process_check_in_atomic", {
          p_event_id: eventId,
          p_scanned_value: cleanVal,
          p_scan_type: scanType,
          p_scanner_id: scannerId || null,
          p_client_scan_id: clientScanId || null,
          p_source: source,
          p_secondary_value: cleanSecVal || null
        });
        if (error) {
          console.error("[Supabase DB] RPC check-in error:", error);
          throw new Error(`Database atomic check-in error: ${error.message}`);
        }
        if (data) {
          return data;
        }
      } catch (rpcErr) {
        console.error("[Supabase DB] RPC invocation error:", rpcErr);
        throw new Error(rpcErr.message || "Database error during atomic verification");
      }
    }
    if (clientScanId) {
      const existingIdempotent = this.inMemoryDB.check_ins.find(
        (c) => c.event_id === eventId && c.client_scan_id === clientScanId
      );
      if (existingIdempotent) {
        const student2 = this.inMemoryDB.students.find((s) => s.id === existingIdempotent.student_id);
        return {
          success: true,
          status: "IDEMPOTENT_SUCCESS",
          message: "Check-in was already recorded successfully.",
          student: student2 ? { ...student2, is_checked_in: true, checked_in_at: existingIdempotent.check_in_at } : void 0,
          check_in_id: existingIdempotent.id,
          check_in_at: existingIdempotent.check_in_at
        };
      }
    }
    let lookupVal = cleanVal;
    if (cleanVal.startsWith("{") && cleanVal.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanVal);
        if (parsed.attendee_token) lookupVal = parsed.attendee_token;
      } catch (e) {
        lookupVal = cleanVal;
      }
    }
    let matchingStudents = this.inMemoryDB.students.filter(
      (s) => s.event_id === eventId && (s.qr_code === cleanVal || s.qr_code === lookupVal || s.barcode === cleanVal || s.usn.toUpperCase() === cleanVal.toUpperCase() || s.meta && s.meta[event.primary_scan_field || "usn"]?.toString().toUpperCase() === cleanVal.toUpperCase())
    );
    let student = null;
    if (matchingStudents.length === 1) {
      student = matchingStudents[0];
    } else if (matchingStudents.length > 1) {
      if (cleanSecVal) {
        const secField = event.secondary_scan_field || "email";
        student = matchingStudents.find((s) => {
          const val = (s[secField] || s.meta?.[secField] || "").toString().toUpperCase();
          return val === cleanSecVal.toUpperCase();
        }) || null;
      } else {
        return {
          success: false,
          status: "AMBIGUOUS_MATCH",
          message: `Multiple attendees found with ${event.primary_scan_field || "identifier"} "${cleanVal}". Additional verification required (${event.secondary_scan_field || "secondary key"}).`,
          requires_secondary: true,
          secondary_field: event.secondary_scan_field || "email",
          primary_value: cleanVal
        };
      }
    }
    if (!student) {
      this.inMemoryDB.scan_attempts.push({
        id: generateId(),
        event_id: eventId,
        scanner_id: scannerId || null,
        student_id: null,
        scanned_value: cleanVal,
        scan_type: scanType,
        result: "invalid",
        reason: "Attendee not found",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return { success: false, status: "INVALID_TOKEN", message: "INVALID TOKEN \u2014 Attendee not found" };
    }
    const existingCheckIn = this.inMemoryDB.check_ins.find((c) => c.event_id === eventId && c.student_id === student.id);
    if (existingCheckIn) {
      const checkInTimeStr = new Date(existingCheckIn.check_in_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      this.inMemoryDB.scan_attempts.push({
        id: generateId(),
        event_id: eventId,
        scanner_id: scannerId || null,
        student_id: student.id,
        scanned_value: cleanVal,
        scan_type: scanType,
        result: "duplicate",
        reason: `Already checked in at ${checkInTimeStr}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return {
        success: false,
        status: "DUPLICATE_CHECKIN",
        message: `ALREADY CHECKED IN at ${checkInTimeStr}`,
        student: { ...student, is_checked_in: true, checked_in_at: existingCheckIn.check_in_at },
        check_in_at: existingCheckIn.check_in_at
      };
    }
    const checkInId = generateId();
    const checkInTime = (/* @__PURE__ */ new Date()).toISOString();
    const newCheckIn = {
      id: checkInId,
      event_id: eventId,
      student_id: student.id,
      scanner_id: scannerId || null,
      scan_type: scanType,
      check_in_at: checkInTime,
      status: "SUCCESS",
      source,
      client_scan_id: clientScanId || null,
      created_at: checkInTime,
      updated_at: checkInTime
    };
    this.inMemoryDB.check_ins.push(newCheckIn);
    this.inMemoryDB.scan_attempts.push({
      id: generateId(),
      event_id: eventId,
      scanner_id: scannerId || null,
      student_id: student.id,
      scanned_value: cleanVal,
      scan_type: scanType,
      result: "success",
      reason: "Valid check-in",
      timestamp: checkInTime
    });
    return {
      success: true,
      status: "SUCCESS",
      message: "CHECK-IN SUCCESSFUL",
      student: { ...student, is_checked_in: true, checked_in_at: checkInTime, scan_type: scanType },
      check_in_id: checkInId,
      check_in_at: checkInTime
    };
  }
  // --- STATS & ANALYTICS ---
  async getEventStats(eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized or event not found");
    const supabase = this.getClient();
    let attendees = [];
    let checkins = [];
    let attempts = [];
    let scanners = [];
    let totalEvents = 1;
    if (supabase) {
      const [stRes, chkRes, atmRes, scnRes, evCountRes] = await Promise.all([
        supabase.from("students").select("*").eq("event_id", eventId),
        supabase.from("check_ins").select("*").eq("event_id", eventId),
        supabase.from("scan_attempts").select("*").eq("event_id", eventId),
        supabase.from("scanner_accounts").select("*").eq("event_id", eventId),
        adminId ? supabase.from("events").select("*", { count: "exact", head: true }).eq("admin_id", adminId).neq("status", "DELETED") : Promise.resolve({ count: 1, error: null })
      ]);
      if (stRes.error) throw new Error(`Database error fetching attendees: ${stRes.error.message}`);
      if (chkRes.error) throw new Error(`Database error fetching check-ins: ${chkRes.error.message}`);
      if (atmRes.error) throw new Error(`Database error fetching scan attempts: ${atmRes.error.message}`);
      if (scnRes.error) throw new Error(`Database error fetching scanners: ${scnRes.error.message}`);
      attendees = stRes.data || [];
      checkins = chkRes.data || [];
      attempts = atmRes.data || [];
      scanners = scnRes.data || [];
      totalEvents = evCountRes.count || 1;
    } else {
      attendees = this.inMemoryDB.students.filter((s) => s.event_id === eventId);
      checkins = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
      attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id === eventId);
      scanners = this.inMemoryDB.scanner_accounts.filter((s) => s.event_id === eventId);
      totalEvents = adminId ? this.inMemoryDB.events.filter((e) => e.admin_id === adminId && e.status !== "DELETED").length : 1;
    }
    const total_attendees = attendees.length;
    const total_checked_in = checkins.length;
    const total_remaining = Math.max(0, total_attendees - total_checked_in);
    const checkin_percentage = total_attendees > 0 ? Math.round(total_checked_in / total_attendees * 100) : 0;
    const duplicates_blocked = attempts.filter((a) => a.result === "duplicate").length;
    const invalid_attempts = attempts.filter((a) => a.result === "invalid" || a.result === "wrong_event").length;
    const qr_scans = checkins.filter((c) => c.scan_type === "QR").length;
    const barcode_scans = checkins.filter((c) => c.scan_type === "BARCODE").length;
    const branchMap = /* @__PURE__ */ new Map();
    const checkedInSet = new Set(checkins.map((c) => c.student_id));
    attendees.forEach((s) => {
      const b = s.branch || "General";
      const current = branchMap.get(b) || { total: 0, checked_in: 0 };
      current.total += 1;
      if (checkedInSet.has(s.id)) {
        current.checked_in += 1;
      }
      branchMap.set(b, current);
    });
    const branch_breakdown = Array.from(branchMap.entries()).map(([branch, counts]) => ({
      branch,
      total: counts.total,
      checked_in: counts.checked_in
    }));
    const yearMap = /* @__PURE__ */ new Map();
    attendees.forEach((s) => {
      const y = s.year || "General";
      const current = yearMap.get(y) || { total: 0, checked_in: 0 };
      current.total += 1;
      if (checkedInSet.has(s.id)) {
        current.checked_in += 1;
      }
      yearMap.set(y, current);
    });
    const year_breakdown = Array.from(yearMap.entries()).map(([year, counts]) => ({
      year,
      total: counts.total,
      checked_in: counts.checked_in
    }));
    const active_scanners_count = scanners.filter((s) => s.is_active).length;
    const scanner_activity = scanners.map((scn) => {
      const scnSuccessfulScans = attempts.filter((a) => a.scanner_id === scn.id && a.result === "success").length || checkins.filter((c) => c.scanner_id === scn.id).length;
      const scnAttempts = attempts.filter((a) => a.scanner_id === scn.id);
      const scnCheckins = checkins.filter((c) => c.scanner_id === scn.id);
      const timestamps = [
        ...scnAttempts.map((a) => new Date(a.timestamp).getTime()),
        ...scnCheckins.map((c) => new Date(c.check_in_at).getTime()),
        scn.last_login_at ? new Date(scn.last_login_at).getTime() : 0
      ].filter((t) => !isNaN(t) && t > 0);
      const latestTime = timestamps.length > 0 ? Math.max(...timestamps) : null;
      const isRecent = latestTime ? Date.now() - latestTime < 15 * 60 * 1e3 : false;
      let status = "Inactive";
      if (scn.is_active) {
        status = isRecent ? "Active" : "Idle";
      }
      return {
        scanner_id: scn.id,
        scanner_name: scn.name,
        total_successful_scans: scnSuccessfulScans,
        last_scan_time: latestTime ? new Date(latestTime).toISOString() : null,
        status
      };
    });
    return {
      total_events: totalEvents,
      total_attendees,
      total_checked_in,
      total_remaining,
      checkin_percentage,
      active_scanners_count,
      total_scan_attempts: attempts.length,
      duplicates_blocked,
      invalid_attempts,
      qr_scans,
      barcode_scans,
      branch_breakdown,
      year_breakdown,
      scanner_activity
    };
  }
  // --- SCAN ATTEMPTS & HISTORY ---
  async getScanHistory(eventId, adminId, filters) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const limit = filters?.limit;
    const offset = filters?.offset || 0;
    const supabase = this.getClient();
    let attempts = [];
    let studentsMap = /* @__PURE__ */ new Map();
    let scannersMap = /* @__PURE__ */ new Map();
    if (supabase) {
      let atmQuery = supabase.from("scan_attempts").select("*").eq("event_id", eventId).order("timestamp", { ascending: false });
      if (limit !== void 0) {
        atmQuery = atmQuery.range(offset, offset + limit - 1);
      }
      const [atmRes, stRes, scnRes, reqRes, profRes, chkRes] = await Promise.all([
        atmQuery,
        supabase.from("students").select("*").eq("event_id", eventId),
        supabase.from("scanner_accounts").select("*").eq("event_id", eventId),
        supabase.from("scanner_access_requests").select("*").eq("event_id", eventId),
        supabase.from("profiles").select("id, name, email"),
        supabase.from("check_ins").select("*").eq("event_id", eventId)
      ]);
      if (atmRes.error) throw new Error(`Database error fetching scan history: ${atmRes.error.message}`);
      if (atmRes.data) attempts = atmRes.data;
      if (stRes.data) stRes.data.forEach((s) => studentsMap.set(s.id, s));
      if (scnRes.data) scnRes.data.forEach((sc) => scannersMap.set(sc.id, sc));
      if (reqRes.data) {
        reqRes.data.forEach((r) => {
          const displayName = `${r.user_name || "Volunteer Scanner"} (${r.gate_name || "Gate Terminal"})`;
          const acc = {
            id: r.scanner_id || r.id,
            name: displayName,
            email: r.user_email || "",
            access_code: r.referral_code || "VOLUNTEER",
            role: "SCANNER",
            event_id: eventId,
            is_active: true,
            created_at: r.created_at || (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: r.updated_at || (/* @__PURE__ */ new Date()).toISOString()
          };
          if (r.scanner_id) scannersMap.set(r.scanner_id, acc);
          if (r.id) scannersMap.set(r.id, acc);
          if (r.user_id) scannersMap.set(r.user_id, acc);
        });
      }
      if (profRes.data) {
        profRes.data.forEach((p) => {
          if (!scannersMap.has(p.id)) {
            scannersMap.set(p.id, {
              id: p.id,
              name: `Admin (${p.name || "Organizer"})`,
              email: p.email || "",
              access_code: "ADMIN",
              role: "SCANNER",
              event_id: eventId,
              is_active: true,
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        });
      }
      const recordedSuccessIds = new Set(
        attempts.filter((a) => (a.result === "success" || a.result === "IDEMPOTENT_SUCCESS") && a.student_id).map((a) => a.student_id)
      );
      if (chkRes.data) {
        for (const c of chkRes.data) {
          if (c.student_id && !recordedSuccessIds.has(c.student_id)) {
            recordedSuccessIds.add(c.student_id);
            const st = studentsMap.get(c.student_id);
            attempts.push({
              id: c.id ? `ci-${c.id}` : `ci-${c.student_id}`,
              event_id: eventId,
              student_id: c.student_id,
              scanned_value: st?.usn || st?.qr_code || "VERIFIED-CHECKIN",
              scan_type: c.scan_type || "QR",
              result: "success",
              reason: "Verified Admission Check-In",
              scanner_id: c.scanner_id || null,
              timestamp: c.check_in_at || c.created_at || (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      }
    } else {
      attempts = this.inMemoryDB.scan_attempts.filter((a) => a.event_id === eventId);
      this.inMemoryDB.students.filter((s) => s.event_id === eventId).forEach((s) => studentsMap.set(s.id, s));
      this.inMemoryDB.scanner_accounts.filter((sc) => sc.event_id === eventId).forEach((sc) => scannersMap.set(sc.id, sc));
      this.inMemoryDB.scanner_access_requests.filter((r) => r.event_id === eventId).forEach((r) => {
        const displayName = `${r.user_name || "Volunteer Scanner"} (${r.gate_name || "Gate Terminal"})`;
        const acc = {
          id: r.scanner_id || r.id,
          name: displayName,
          email: r.user_email || "",
          access_code: r.referral_code || "VOLUNTEER",
          role: "SCANNER",
          event_id: eventId,
          is_active: true,
          created_at: r.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: r.updated_at || (/* @__PURE__ */ new Date()).toISOString()
        };
        if (r.scanner_id) scannersMap.set(r.scanner_id, acc);
        if (r.id) scannersMap.set(r.id, acc);
        if (r.user_id) scannersMap.set(r.user_id, acc);
      });
      this.inMemoryDB.profiles.forEach((p) => {
        if (!scannersMap.has(p.id)) {
          scannersMap.set(p.id, {
            id: p.id,
            name: `Admin (${p.name || "Organizer"})`,
            email: p.email || "",
            access_code: "ADMIN",
            role: "SCANNER",
            event_id: eventId,
            is_active: true,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      });
      const recordedSuccessIds = new Set(
        attempts.filter((a) => (a.result === "success" || a.result === "IDEMPOTENT_SUCCESS") && a.student_id).map((a) => a.student_id)
      );
      const inMemCheckIns = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
      for (const c of inMemCheckIns) {
        if (c.student_id && !recordedSuccessIds.has(c.student_id)) {
          recordedSuccessIds.add(c.student_id);
          const st = studentsMap.get(c.student_id);
          attempts.push({
            id: c.id ? `ci-${c.id}` : `ci-${c.student_id}`,
            event_id: eventId,
            student_id: c.student_id,
            scanned_value: st?.usn || st?.qr_code || "VERIFIED-CHECKIN",
            scan_type: c.scan_type || "QR",
            result: "success",
            reason: "Verified Admission Check-In",
            scanner_id: c.scanner_id || null,
            timestamp: c.check_in_at || c.created_at || (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    }
    const recordedSuccessStudentIds = new Set(
      attempts.filter((a) => (a.result === "success" || a.result === "IDEMPOTENT_SUCCESS") && a.student_id).map((a) => a.student_id)
    );
    for (const [stId, st] of studentsMap.entries()) {
      if ((st.is_checked_in || st.checked_in) && !recordedSuccessStudentIds.has(stId)) {
        recordedSuccessStudentIds.add(stId);
        attempts.push({
          id: `st-ci-${stId}`,
          event_id: eventId,
          student_id: stId,
          scanned_value: st.usn || st.qr_code || "VERIFIED-CHECKIN",
          scan_type: "QR",
          result: "success",
          reason: "Verified Attendee Admission",
          scanner_id: null,
          timestamp: st.checked_in_at || st.created_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    if (filters?.result && filters.result !== "ALL") {
      attempts = attempts.filter((a) => a.result === filters.result);
    }
    if (filters?.scannerId && filters.scannerId !== "ALL") {
      attempts = attempts.filter((a) => a.scanner_id === filters.scannerId);
    }
    const adminDisplayName = event.admin_name ? `Admin (${event.admin_name})` : "Admin (Organizer)";
    let enriched = attempts.map((a) => {
      let scanner = a.scanner_id ? scannersMap.get(a.scanner_id) : void 0;
      if (!scanner) {
        if (!a.scanner_id || a.scanner_id === event.admin_id) {
          scanner = {
            id: event.admin_id,
            name: adminDisplayName,
            email: event.admin_email || "",
            access_code: "ADMIN",
            role: "SCANNER",
            event_id: eventId,
            is_active: true,
            created_at: a.timestamp,
            updated_at: a.timestamp
          };
        } else {
          scanner = {
            id: a.scanner_id,
            name: "Gate Scanner Terminal",
            email: "",
            access_code: "STATION",
            role: "SCANNER",
            event_id: eventId,
            is_active: true,
            created_at: a.timestamp,
            updated_at: a.timestamp
          };
        }
      }
      return {
        ...a,
        student: a.student_id ? studentsMap.get(a.student_id) : void 0,
        scanner
      };
    });
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      enriched = enriched.filter(
        (a) => a.scanned_value.toLowerCase().includes(q) || a.student && (a.student.name.toLowerCase().includes(q) || a.student.usn.toLowerCase().includes(q)) || a.scanner && a.scanner.name.toLowerCase().includes(q)
      );
    }
    const sorted = enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (!supabase && limit !== void 0) {
      return sorted.slice(offset, offset + limit);
    }
    return sorted;
  }
  async clearScanHistory(eventId, options) {
    const supabase = this.getClient();
    let deletedCount = 0;
    if (supabase) {
      if (options?.scanIds && options.scanIds.length > 0) {
        const { error, count } = await supabase.from("scan_attempts").delete({ count: "exact" }).eq("event_id", eventId).in("id", options.scanIds);
        if (error) throw new Error(`Database error clearing scan records: ${error.message}`);
        deletedCount = count ?? options.scanIds.length;
      } else {
        const { error, count } = await supabase.from("scan_attempts").delete({ count: "exact" }).eq("event_id", eventId);
        if (error) throw new Error(`Database error clearing scan records: ${error.message}`);
        deletedCount = count ?? 0;
      }
    }
    if (options?.scanIds && options.scanIds.length > 0) {
      const idSet = new Set(options.scanIds);
      const prevLen = this.inMemoryDB.scan_attempts.length;
      this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter(
        (a) => !(a.event_id === eventId && idSet.has(a.id))
      );
      deletedCount = deletedCount || prevLen - this.inMemoryDB.scan_attempts.length;
    } else {
      const prevLen = this.inMemoryDB.scan_attempts.length;
      this.inMemoryDB.scan_attempts = this.inMemoryDB.scan_attempts.filter(
        (a) => a.event_id !== eventId
      );
      deletedCount = deletedCount || prevLen - this.inMemoryDB.scan_attempts.length;
    }
    return { success: true, count: deletedCount };
  }
  // --- ACTIVITY LOGS ---
  async getActivityLogs(eventId, adminId, limit = 50, offset = 0) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const supabase = this.getClient();
    if (supabase) {
      const { data, error } = await supabase.from("activity_logs").select("*").eq("event_id", eventId).order("timestamp", { ascending: false }).range(offset, offset + limit - 1);
      if (error) {
        console.error("[Supabase DB] Error fetching activity logs:", error);
        throw new Error(`Database error fetching activity logs: ${error.message}`);
      }
      return data || [];
    }
    return this.inMemoryDB.activity_logs.filter((l) => l.event_id === eventId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(offset, offset + limit);
  }
  async clearActivityLogs(eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    throw new Error("AUDIT_LOG_IMMUTABLE: Audit logs are strictly immutable and cannot be deleted.");
  }
  async logActivity(eventId, actorId, actorName, type, message, meta) {
    const entry = {
      id: generateId(),
      event_id: eventId,
      actor_id: actorId,
      actor_name: actorName,
      type,
      message,
      meta: meta || {},
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = this.getClient();
    if (supabase) {
      await supabase.from("activity_logs").insert(entry);
    }
    this.inMemoryDB.activity_logs.unshift(entry);
  }
  // --- EXPORT ATTENDANCE AS CSV ---
  async generateAttendanceCSV(eventId, adminId) {
    const event = await this.getEventById(eventId, adminId);
    if (!event) throw new Error("Unauthorized");
    const students = await this.getStudents(eventId, adminId);
    const scanners = await this.getScannersByEvent(eventId, adminId);
    const scannerMap = new Map(scanners.map((s) => [s.id, s.name]));
    const supabase = this.getClient();
    let checkInsList = [];
    if (supabase) {
      const { data, error } = await supabase.from("check_ins").select("*").eq("event_id", eventId);
      if (error) throw new Error(`Database error fetching check-ins for export: ${error.message}`);
      if (data) checkInsList = data;
    } else {
      checkInsList = this.inMemoryDB.check_ins.filter((c) => c.event_id === eventId);
    }
    const checkInsMap = new Map(checkInsList.map((c) => [c.student_id, c]));
    const headers = [
      "Sl No",
      "USN",
      "Name",
      "Email",
      "Phone Number",
      "Year",
      "Section",
      "Branch",
      "Check-in Status",
      "Check-in Time",
      "Scan Type",
      "Scanner Station",
      "Source",
      "QR Code Token",
      "Barcode Token"
    ];
    const rows = students.map((s) => {
      const chk = checkInsMap.get(s.id);
      const scannerStation = chk?.scanner_id ? scannerMap.get(chk.scanner_id) || "Gate Terminal" : "Admin Terminal";
      return [
        s.sl_no || "",
        `"${s.usn}"`,
        `"${s.name}"`,
        `"${s.email || ""}"`,
        `"${s.phone_number || ""}"`,
        `"${s.year || ""}"`,
        `"${s.section || ""}"`,
        `"${s.branch || ""}"`,
        chk ? "CHECKED_IN" : "PENDING",
        chk ? `"${chk.check_in_at}"` : "",
        chk?.scan_type || "",
        chk ? `"${scannerStation}"` : "",
        chk?.source || "",
        `"${s.qr_code}"`,
        `"${s.barcode}"`
      ].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }
};
var dbService = new DatabaseService();

// server.ts
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
import_dotenv.default.config({ path: import_path2.default.resolve(process.cwd(), ".env") });
import_dotenv.default.config({ path: import_path2.default.resolve(currentDir, ".env") });
import_dotenv.default.config({ path: import_path2.default.resolve(currentDir, "..", ".env") });
var app = (0, import_express.default)();
var PORT = parseInt(process.env.PORT || "3001", 10);
var ALLOWED_ORIGINS = [
  "https://rahulnag-v.github.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173"
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".github.io"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-UUID, x-bypass-rate-limit, Accept, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/health/supabase", async (_req, res) => {
  try {
    const health = await testServerSupabaseHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message || "Supabase health check failed"
    });
  }
});
var authLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  skip: (req) => process.env.NODE_ENV === "test" || req.headers["x-bypass-rate-limit"] === "admitto-test",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many authentication attempts. Please try again in 15 minutes." }
});
var requestAccessLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many scanner access requests. Please try again later." }
});
var scanLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Scan rate limit exceeded (maximum 120 scans per minute)." }
});
var activeSessions = /* @__PURE__ */ new Map();
var boundScannerDevices = /* @__PURE__ */ new Map();
function resetScannerDeviceBindings() {
  boundScannerDevices.clear();
}
function enforceDeviceBinding(session, incomingDeviceUuid, res) {
  if (session.role !== "SCANNER") {
    return true;
  }
  const boundUuid = session.deviceUuid || boundScannerDevices.get(session.userId);
  if (boundUuid) {
    if (!incomingDeviceUuid || incomingDeviceUuid !== boundUuid) {
      res.status(403).json({
        error: "DEVICE_MISMATCH",
        code: "DEVICE_BINDING_VIOLATION",
        message: "Security violation: Scanner session is bound to a different device."
      });
      return false;
    }
  } else {
    if (!incomingDeviceUuid) {
      res.status(403).json({
        error: "DEVICE_REQUIRED",
        code: "DEVICE_BINDING_REQUIRED",
        message: "Security violation: Device UUID is required for scanner operations."
      });
      return false;
    }
    session.deviceUuid = incomingDeviceUuid;
    boundScannerDevices.set(session.userId, incomingDeviceUuid);
  }
  return true;
}
registerScannerInvalidationHook((scannerId) => {
  boundScannerDevices.delete(scannerId);
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === scannerId) {
      activeSessions.delete(token);
    }
  }
});
function invalidateUserSessions(userId, email) {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId || email && session.email.toLowerCase() === email.toLowerCase()) {
      activeSessions.delete(token);
    }
  }
}
async function getSessionFromReq(req) {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }
  if (!token) {
    return null;
  }
  const cached = activeSessions.get(token);
  if (cached) {
    if (cached.role === "SCANNER") {
      const scanner = await dbService.getScannerById(cached.userId);
      if (scanner) {
        if (!scanner.is_active || scanner.expires_at && new Date(scanner.expires_at).getTime() < Date.now()) {
          activeSessions.delete(token);
          return null;
        }
      }
    }
    return cached;
  }
  const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (data?.user && !error) {
        const user = data.user;
        const userEmail = user.email || "";
        let profile = await dbService.getProfileByEmail(userEmail);
        if (!profile) {
          try {
            const name = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0] || "Organizer";
            profile = await dbService.createAdminProfile(userEmail, name, "supabase-managed");
          } catch {
            profile = await dbService.getProfileByEmail(userEmail);
          }
        }
        if (profile) {
          if (!profile.auth_id && user.id) {
            try {
              await supabaseAdmin.from("profiles").update({ auth_id: user.id }).eq("id", profile.id);
              profile.auth_id = user.id;
            } catch {
            }
          }
          const sessionData = {
            userId: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role || "ADMIN",
            createdAt: Date.now()
          };
          activeSessions.set(token, sessionData);
          return sessionData;
        }
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0] || "Organizer";
        const fallbackSessionData = {
          userId: user.id,
          email: userEmail,
          name: fallbackName,
          role: "ADMIN",
          createdAt: Date.now()
        };
        activeSessions.set(token, fallbackSessionData);
        return fallbackSessionData;
      }
    } catch (err) {
      console.warn("[getSessionFromReq] Token verification or profile lookup issue:", err?.message || err);
    }
  }
  return null;
}
async function requireAdminAuth(req, res, next) {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
    return;
  }
  if (session.role !== "ADMIN") {
    res.status(403).json({ error: "FORBIDDEN", message: "Admin privileges required." });
    return;
  }
  req.user = session;
  next();
}
async function requireScannerOrAdmin(req, res, next) {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
    return;
  }
  req.user = session;
  next();
}
var exportTokens = /* @__PURE__ */ new Map();
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { emailOrCode, password, role } = req.body;
    if (!emailOrCode || !password) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Email/Access code and password are required." });
      return;
    }
    if (role === "SCANNER" || emailOrCode.startsWith("GATE-") || emailOrCode.includes("scanner")) {
      const scannerResult = await dbService.verifyScannerAuth(emailOrCode, password);
      if (!scannerResult) {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Invalid scanner access code or password, or scanner access has expired."
        });
        return;
      }
      const { scanner, event } = scannerResult;
      const incomingDeviceUuid = req.headers["x-device-uuid"] || req.body?.deviceUuid || req.body?.device_uuid;
      const existingBound = boundScannerDevices.get(scanner.id);
      if (existingBound && incomingDeviceUuid && existingBound !== incomingDeviceUuid) {
        res.status(403).json({
          error: "DEVICE_MISMATCH",
          code: "DEVICE_BINDING_VIOLATION",
          message: "Security violation: Scanner account is bound to another device. Please contact event administrator to reset binding."
        });
        return;
      }
      const boundDevice = incomingDeviceUuid || existingBound;
      if (boundDevice) {
        boundScannerDevices.set(scanner.id, boundDevice);
      }
      const token2 = `scan_tok_${import_crypto2.default.randomBytes(32).toString("hex")}`;
      const sessionData2 = {
        userId: scanner.id,
        email: scanner.email,
        name: scanner.name,
        role: "SCANNER",
        eventId: event.id,
        createdAt: Date.now(),
        deviceUuid: boundDevice
      };
      activeSessions.set(token2, sessionData2);
      const authSession2 = {
        user: {
          id: scanner.id,
          email: scanner.email,
          name: scanner.name,
          role: "SCANNER",
          event_id: event.id,
          event_title: event.title
        },
        token: token2
      };
      res.json({ success: true, session: authSession2 });
      return;
    }
    const adminProfile = await dbService.verifyAdminPassword(emailOrCode, password);
    if (!adminProfile) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid admin credentials. Please check your email and password."
      });
      return;
    }
    const token = `adm_tok_${import_crypto2.default.randomBytes(32).toString("hex")}`;
    const sessionData = {
      userId: adminProfile.id,
      email: adminProfile.email,
      name: adminProfile.name,
      role: "ADMIN",
      createdAt: Date.now()
    };
    activeSessions.set(token, sessionData);
    const authSession = {
      user: {
        id: adminProfile.id,
        email: adminProfile.email,
        name: adminProfile.name,
        role: "ADMIN"
      },
      token
    };
    res.json({ success: true, session: authSession });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "An error occurred during authentication." });
  }
});
app.post("/api/auth/scanner-referral-login", authLimiter, async (req, res) => {
  try {
    const { email, referralCode, name } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (referralCode || "").trim().toUpperCase();
    if (!cleanEmail || !cleanCode) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Both admin-generated email and event referral code are required for scanner login."
      });
      return;
    }
    const lookup = await dbService.getReferralCodeByValue(cleanCode);
    if (!lookup) {
      res.status(400).json({
        error: "INVALID_CODE",
        message: "Invalid, disabled, or expired scanner referral code."
      });
      return;
    }
    const { referral, event } = lookup;
    const scannerAccount = await dbService.getScannerByEmailOrCodeAndEvent(cleanEmail, event.id);
    if (!scannerAccount) {
      res.status(403).json({
        error: "UNAUTHORIZED_SCANNER_EMAIL",
        message: "Access denied: Only admin-generated scanner emails can log in. Please request your event administrator to create your scanner email in the Scanner Management section."
      });
      return;
    }
    if (!scannerAccount.is_active) {
      res.status(403).json({
        error: "ACCOUNT_DEACTIVATED",
        message: "Access denied: This scanner email account has been deactivated by the event administrator."
      });
      return;
    }
    const maxUses = referral.max_uses ?? 5;
    const timesUsed = referral.times_used ?? 0;
    if (timesUsed >= maxUses) {
      res.status(400).json({
        error: "LIMIT_REACHED",
        message: `This referral code has reached its maximum redemption limit (${maxUses} users).`
      });
      return;
    }
    const effectiveName = scannerAccount.name;
    const userId = scannerAccount.id;
    const request = await dbService.createScannerAccessRequest(
      userId,
      scannerAccount.email,
      effectiveName,
      cleanCode
    );
    if (request.status !== "APPROVED") {
      const assignedStation = scannerAccount.name.includes("(") ? scannerAccount.name.split("(")[1].replace(")", "").trim() : "Gate Scanner";
      await dbService.approveScannerRequest(
        request.id,
        event.id,
        event.admin_id,
        scannerAccount.id,
        assignedStation,
        0
      );
      request.status = "APPROVED";
      request.gate_name = assignedStation;
    }
    const incomingDeviceUuid = req.headers["x-device-uuid"] || req.body?.deviceUuid || req.body?.device_uuid;
    const existingBound = boundScannerDevices.get(scannerAccount.id);
    if (existingBound && incomingDeviceUuid && existingBound !== incomingDeviceUuid) {
      res.status(403).json({
        error: "DEVICE_MISMATCH",
        code: "DEVICE_BINDING_VIOLATION",
        message: "Security violation: Scanner operator account is bound to another device."
      });
      return;
    }
    const boundDevice = incomingDeviceUuid || existingBound;
    if (boundDevice) {
      boundScannerDevices.set(scannerAccount.id, boundDevice);
    }
    const token = `scan_tok_${import_crypto2.default.randomBytes(32).toString("hex")}`;
    const sessionData = {
      userId: scannerAccount.id,
      email: scannerAccount.email,
      name: scannerAccount.name,
      role: "SCANNER",
      eventId: event.id,
      createdAt: Date.now(),
      deviceUuid: boundDevice
    };
    activeSessions.set(token, sessionData);
    const authSession = {
      user: {
        id: scannerAccount.id,
        email: scannerAccount.email,
        name: scannerAccount.name,
        role: "SCANNER",
        event_id: event.id,
        event_title: event.title
      },
      token
    };
    res.json({ success: true, session: authSession, request });
  } catch (err) {
    console.error("Scanner referral login error:", err);
    res.status(400).json({
      error: "AUTH_ERROR",
      message: err.message || "Failed to authenticate scanner with referral code."
    });
  }
});
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, name, password, phone } = req.body;
    if (!email || !name || !password || !phone) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Name, email, phone number, and password are required."
      });
      return;
    }
    const cleanPhone = String(phone).trim();
    if (!cleanPhone) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Phone number is required."
      });
      return;
    }
    if (cleanPhone.replace(/\D/g, "").length < 7) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Please enter a valid phone number (at least 7 digits)."
      });
      return;
    }
    if (password.length < 6) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Password must be at least 6 characters long." });
      return;
    }
    const existing = await dbService.getProfileByEmail(email);
    if (existing) {
      res.status(409).json({ error: "CONFLICT", message: "An account with this email already exists." });
      return;
    }
    const newProfile = await dbService.createAdminProfile(email, name, password, cleanPhone);
    const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name, name, phone: cleanPhone }
        });
      } catch {
      }
    }
    const token = `adm_tok_${import_crypto2.default.randomBytes(32).toString("hex")}`;
    const sessionData = {
      userId: newProfile.id,
      email: newProfile.email,
      name: newProfile.name,
      role: "ADMIN",
      createdAt: Date.now()
    };
    activeSessions.set(token, sessionData);
    const authSession = {
      user: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        role: "ADMIN",
        phone: newProfile.phone || cleanPhone
      },
      token
    };
    res.status(201).json({ success: true, session: authSession });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Could not register admin account." });
  }
});
app.get("/api/auth/me", async (req, res) => {
  const session = await getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "No active session found." });
    return;
  }
  let eventTitle;
  if (session.eventId) {
    const event = await dbService.getEventById(session.eventId);
    eventTitle = event?.title;
  }
  res.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      event_id: session.eventId,
      event_title: eventTitle
    }
  });
});
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeSessions.delete(token);
  }
  res.json({ success: true, message: "Logged out successfully." });
});
app.delete("/api/auth/account", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    await dbService.deleteAccount(session.userId);
    for (const [token, sess] of activeSessions.entries()) {
      if (sess.userId === session.userId) {
        activeSessions.delete(token);
      }
    }
    res.json({ success: true, message: "Account and associated event data permanently deleted." });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Failed to delete account." });
  }
});
app.put("/api/auth/profile", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const { name, phone, organization, bio } = req.body;
    if (name !== void 0 && (!name || typeof name !== "string" || name.trim().length === 0)) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Name cannot be empty." });
      return;
    }
    const updatedName = name ? name.trim() : session.name;
    await dbService.updateProfile(session.userId, {
      name: updatedName,
      phone: phone ? String(phone).trim() : void 0,
      organization: organization ? String(organization).trim() : void 0,
      bio: bio ? String(bio).trim() : void 0
    });
    session.name = updatedName;
    for (const [, sess] of activeSessions.entries()) {
      if (sess.userId === session.userId) {
        sess.name = updatedName;
      }
    }
    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: session.userId,
        email: session.email,
        // Email stays completely unchanged
        name: updatedName,
        role: session.role,
        phone: phone || void 0,
        organization: organization || void 0,
        bio: bio || void 0
      }
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Failed to update profile." });
  }
});
app.put("/api/auth/change-password", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "New password must be at least 6 characters long."
      });
      return;
    }
    if (session.role === "ADMIN" && currentPassword) {
      const verified = await dbService.verifyAdminPassword(session.email, currentPassword);
      if (!verified) {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Current password is incorrect."
        });
        return;
      }
    }
    await dbService.updatePassword(session.email, newPassword);
    const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(session.userId, {
          password: newPassword
        });
      } catch (sbErr) {
        console.warn("[Supabase Auth] Password update note:", sbErr?.message);
      }
    }
    res.json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message || "Failed to change password." });
  }
});
function generateAdmittoOtp() {
  return import_crypto2.default.randomInt(1e5, 1e6).toString();
}
async function sendResetCodeEmail(toEmail, code) {
  const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || "";
  const from = process.env.SMTP_FROM || `"ADMITTO Security" <${user || "no-reply@admitto.events"}>`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your ADMITTO password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff;">ADMITTO</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6366f1; margin-top: 4px; font-weight: 700;">Security & Identity Verification</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">Reset your ADMITTO password</h2>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
                      A password reset was requested for your ADMITTO account. Use your confidential 6-digit verification code below to authorize your password change.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15)); border: 1.5px solid rgba(99, 102, 241, 0.4); border-radius: 16px; padding: 20px 32px; display: inline-block;">
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);">
                        ${code}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 14px; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #fca5a5; line-height: 1.5;">
                        <strong>Confidentiality Notice:</strong> This code is strictly confidential and meant solely for your account. Do not disclose this code to anyone. It expires in <strong>15 minutes</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                      If you did not request this password reset, please ignore this email. Your account remains secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
  if (user && pass) {
    try {
      const transporter = import_nodemailer.default.createTransport({
        host: host || "smtp-relay.brevo.com",
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      await transporter.sendMail({
        from,
        to: toEmail,
        subject: "Reset your ADMITTO password",
        text: `A password reset was requested for your ADMITTO account. Your verification code is: ${code}. It expires in 15 minutes.`,
        html: htmlContent
      });
      console.log(`[EMAIL DISPATCH SUCCESS] Real email sent to inbox: ${toEmail}`);
      return true;
    } catch (sendErr) {
      console.error(`[EMAIL DISPATCH ERROR] Failed to deliver via SMTP:`, sendErr.message);
      return false;
    }
  }
  console.warn(`[EMAIL DISPATCH NOTICE] SMTP credentials not configured. Verification email not dispatched.`);
  return false;
}
app.post("/api/auth/send-reset-code", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Email address is required." });
      return;
    }
    const profile = await dbService.getProfileByEmail(cleanEmail);
    if (profile) {
      const existing = await dbService.getActivePasswordResetCode(cleanEmail);
      if (existing && Date.now() - new Date(existing.created_at).getTime() < 60 * 1e3) {
        const elapsed = Math.floor((Date.now() - new Date(existing.created_at).getTime()) / 1e3);
        const remainingSeconds = Math.max(1, 60 - elapsed);
        res.status(429).json({
          error: "COOLDOWN_ACTIVE",
          message: `Please wait ${remainingSeconds}s before requesting another verification code.`,
          remainingSeconds
        });
        return;
      }
      const otp = generateAdmittoOtp();
      const codeHash = import_crypto2.default.createHash("sha256").update(otp).digest("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
      await dbService.createPasswordResetCode(profile.id, cleanEmail, codeHash, expiresAt);
      await sendResetCodeEmail(cleanEmail, otp);
    }
    res.json({
      success: true,
      message: "If an account exists for this email, a verification code has been sent.",
      cooldownSeconds: 60
    });
  } catch (err) {
    console.error("Send reset code error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to process password reset request." });
  }
});
app.post("/api/auth/reset-password-with-code", authLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (code || "").trim();
    if (!cleanEmail || !cleanCode || !newPassword) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Email, verification code, and new password are required."
      });
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      res.status(400).json({
        error: "INVALID_OR_EXPIRED",
        message: "Invalid or expired verification code."
      });
      return;
    }
    if (newPassword.length < 8) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "New password must be at least 8 characters long."
      });
      return;
    }
    const record = await dbService.getActivePasswordResetCode(cleanEmail);
    if (!record) {
      res.status(400).json({
        error: "INVALID_OR_EXPIRED",
        message: "Invalid or expired verification code."
      });
      return;
    }
    const suppliedHash = import_crypto2.default.createHash("sha256").update(cleanCode).digest("hex");
    const suppliedBuffer = Buffer.from(suppliedHash, "utf8");
    const storedBuffer = Buffer.from(record.code_hash, "utf8");
    const isMatch = suppliedBuffer.length === storedBuffer.length && import_crypto2.default.timingSafeEqual(suppliedBuffer, storedBuffer);
    if (!isMatch) {
      const attempts = await dbService.incrementPasswordResetAttempts(record.id);
      if (attempts >= 5) {
        res.status(400).json({
          error: "TOO_MANY_ATTEMPTS",
          message: "Too many verification attempts. Please request a new code."
        });
        return;
      }
      res.status(400).json({
        error: "INVALID_OR_EXPIRED",
        message: "Invalid or expired verification code."
      });
      return;
    }
    await dbService.updatePassword(cleanEmail, newPassword);
    const profile = await dbService.getProfileByEmail(cleanEmail);
    if (profile) {
      const supabaseAdmin = getServerSupabaseAdmin() || getServerSupabase();
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            password: newPassword
          });
          await supabaseAdmin.auth.admin.signOut(profile.id);
        } catch (sbErr) {
          console.warn("[Supabase Auth] Password update note:", sbErr?.message);
        }
      }
      invalidateUserSessions(profile.id, cleanEmail);
    }
    await dbService.markPasswordResetCodeUsed(record.id);
    res.json({
      success: true,
      message: "Password reset successfully. Please sign in again."
    });
  } catch (err) {
    console.error("Reset password with code error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to reset password." });
  }
});
app.get("/api/events", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const events = await dbService.getEventsByAdmin(admin.userId);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.post("/api/events", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const {
      title,
      description,
      venue,
      event_date,
      admin_name,
      admin_phone,
      admin_email,
      banner_url,
      attendee_type,
      attendee_label_singular,
      attendee_label_plural,
      primary_scan_field,
      secondary_scan_field,
      qr_mode,
      barcode_field,
      barcode_config,
      scan_config
    } = req.body;
    if (!title || !title.trim()) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Event title is required." });
      return;
    }
    const contactPhone = (admin_phone || req.body.phone || "").trim();
    if (!contactPhone) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Organizer phone number is mandatory for creating an event." });
      return;
    }
    const newEvent = await dbService.createEvent(admin.userId, {
      title,
      description,
      venue,
      event_date,
      admin_name: admin_name || admin.name,
      admin_phone: contactPhone,
      admin_email: admin_email || admin.email,
      banner_url,
      attendee_type,
      attendee_label_singular,
      attendee_label_plural,
      primary_scan_field: primary_scan_field || "usn",
      secondary_scan_field: secondary_scan_field || null,
      qr_mode: qr_mode || "SECURE_TOKEN",
      barcode_field: barcode_field || primary_scan_field || "usn",
      barcode_config,
      scan_config
    });
    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.get("/api/events/:id", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const event = await dbService.getEventById(req.params.id);
    if (!event || event.status === "DELETED") {
      res.status(404).json({ error: "NOT_FOUND", message: "Event does not exist or has been deleted." });
      return;
    }
    const authCheck = await dbService.validateScannerEventAccess(session.userId, req.params.id);
    if (!authCheck.authorized) {
      res.status(403).json({ error: "FORBIDDEN", message: authCheck.reason || "Access denied." });
      return;
    }
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.get("/api/events/:id/offline-bundle", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const eventId = req.params.id;
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: "FORBIDDEN",
        code: "SCANNER_UNAUTHORIZED",
        message: authCheck.reason || "Scanner is not authorized for this event."
      });
      return;
    }
    const incomingDeviceUuid = req.headers["x-device-uuid"] || req.query.device_uuid || req.body?.deviceUuid;
    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }
    const event = await dbService.getEventById(eventId);
    if (!event || event.status === "DELETED") {
      res.status(404).json({ error: "NOT_FOUND", message: "Event does not exist or has been deleted." });
      return;
    }
    const adminId = session.role === "ADMIN" ? session.userId : void 0;
    const allStudents = await dbService.getStudents(eventId, adminId);
    const primaryKey = event.primary_scan_field || "usn";
    const secondaryKey = event.secondary_scan_field;
    const sanitizedAttendees = allStudents.map((s) => {
      let primaryVal = s.usn;
      if (primaryKey === "usn") primaryVal = s.usn;
      else if (primaryKey === "email") primaryVal = s.email || "";
      else if (primaryKey === "name") primaryVal = s.name;
      else if (s.meta && s.meta[primaryKey]) primaryVal = String(s.meta[primaryKey]);
      let secondaryVal = void 0;
      if (secondaryKey) {
        if (secondaryKey === "email") secondaryVal = s.email;
        else if (secondaryKey === "usn") secondaryVal = s.usn;
        else if (secondaryKey === "name") secondaryVal = s.name;
        else if (secondaryKey === "phone_number") secondaryVal = s.phone_number;
        else if (s.meta && s.meta[secondaryKey]) secondaryVal = String(s.meta[secondaryKey]);
      }
      return {
        id: s.id,
        event_id: s.event_id,
        usn: s.usn,
        name: s.name,
        branch: s.branch,
        qr_code: s.qr_code,
        barcode: s.barcode,
        primary_scan_value: primaryVal,
        secondary_scan_value: secondaryVal,
        is_checked_in: Boolean(s.is_checked_in),
        checked_in_at: s.checked_in_at
      };
    });
    const checkedInIds = sanitizedAttendees.filter((s) => s.is_checked_in).map((s) => s.id);
    const now = Date.now();
    let maxDurationMs = 8 * 60 * 60 * 1e3;
    if (session.role === "SCANNER" && authCheck.scannerId) {
      const scanner = await dbService.getScannerById(authCheck.scannerId);
      if (scanner && scanner.expires_at) {
        const scannerExp = new Date(scanner.expires_at).getTime();
        if (!isNaN(scannerExp) && scannerExp > now) {
          maxDurationMs = Math.min(maxDurationMs, scannerExp - now);
        }
      }
    }
    const expiresAt = new Date(now + maxDurationMs).toISOString();
    const versionString = `${event.id}_${allStudents.length}_${event.updated_at || event.created_at}`;
    const version = import_crypto2.default.createHash("sha256").update(versionString).digest("hex").substring(0, 16);
    res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        event_date: event.event_date,
        banner_url: event.banner_url || "",
        admin_name: event.admin_name || "Event Organizer",
        admin_phone: event.admin_phone || "",
        admin_email: event.admin_email || "",
        primary_scan_field: event.primary_scan_field || "usn",
        secondary_scan_field: event.secondary_scan_field,
        qr_mode: event.qr_mode,
        barcode_field: event.barcode_field,
        barcode_config: event.barcode_config || event.scan_config?.barcode_config,
        downloaded_at: new Date(now).toISOString(),
        expires_at: expiresAt,
        version
      },
      attendees: sanitizedAttendees,
      checked_in_student_ids: checkedInIds,
      version,
      downloaded_at: new Date(now).toISOString(),
      expires_at: expiresAt
    });
  } catch (err) {
    console.error("Offline bundle error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.put("/api/events/:id", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const updated = await dbService.updateEvent(req.params.id, admin.userId, req.body);
    if (!updated) {
      res.status(403).json({ error: "FORBIDDEN", message: "Access denied or event not found." });
      return;
    }
    broadcastToEventStream(req.params.id, {
      type: "EVENT_UPDATED",
      event: updated
    });
    res.json({ success: true, event: updated });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.patch("/api/events/:id/scan-config", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const {
      primary_scan_field,
      secondary_scan_field,
      qr_mode,
      barcode_field,
      barcode_config,
      available_fields,
      is_uniqueness_verified,
      column_configs,
      dataset_name
    } = req.body;
    const primaryKey = primary_scan_field || "usn";
    const updatedEvent = await dbService.updateScanConfig(req.params.id, admin.userId, {
      primary_scan_field: primaryKey,
      secondary_scan_field: secondary_scan_field || null,
      qr_mode: qr_mode || "SECURE_TOKEN",
      barcode_field: barcode_field || "usn",
      barcode_config: barcode_config || void 0,
      available_fields: available_fields || [],
      is_uniqueness_verified: is_uniqueness_verified ?? true,
      column_configs: column_configs || void 0,
      dataset_name: dataset_name || void 0
    });
    broadcastToEventStream(req.params.id, {
      type: "EVENT_UPDATED",
      event: updatedEvent
    });
    res.json({ success: true, event: updatedEvent });
  } catch (err) {
    res.status(400).json({ error: "CONFIG_ERROR", message: err.message });
  }
});
app.post("/api/events/:id/validate-uniqueness", requireAdminAuth, async (req, res) => {
  try {
    const { rows, primaryKey, secondaryKey } = req.body;
    if (!primaryKey) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Primary key is required for validation." });
      return;
    }
    const result = dbService.validateDatasetUniqueness(rows || [], primaryKey, secondaryKey);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: err.message });
  }
});
app.delete("/api/events/:id", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const eventId = req.params.id;
    const success = await dbService.deleteEvent(eventId, admin.userId, true);
    if (!success) {
      res.status(403).json({ error: "FORBIDDEN", message: "Access denied or event not found." });
      return;
    }
    broadcastToEventStream(eventId, { type: "EVENT_DELETED", eventId });
    res.json({ success: true, message: "Event and all associated data permanently purged." });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.get("/api/events/:id/stats", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    if (session.role === "SCANNER" && session.eventId !== req.params.id) {
      res.status(403).json({ error: "FORBIDDEN", message: "Unauthorized event access." });
      return;
    }
    const adminId = session.role === "ADMIN" ? session.userId : void 0;
    const stats = await dbService.getEventStats(req.params.id, adminId);
    res.json({ stats });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.get("/api/events/:id/students", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    if (session.role === "SCANNER" && session.eventId !== req.params.id) {
      res.status(403).json({ error: "FORBIDDEN", message: "Unauthorized event access." });
      return;
    }
    const adminId = session.role === "ADMIN" ? session.userId : void 0;
    const { search, branch, filter } = req.query;
    const limit = req.query.limit !== void 0 ? parseInt(req.query.limit, 10) : void 0;
    const offset = req.query.offset !== void 0 ? parseInt(req.query.offset, 10) : 0;
    const students = await dbService.getStudents(
      req.params.id,
      adminId,
      search,
      branch,
      filter,
      limit,
      offset
    );
    res.json({ students, total: students.length });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.post("/api/events/:id/students", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const student = await dbService.createStudent(req.params.id, admin.userId, req.body);
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: err.message });
  }
});
app.post("/api/events/:id/students/import", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { attendees, scanConfig } = req.body;
    if (!Array.isArray(attendees) || attendees.length === 0) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Attendees array cannot be empty." });
      return;
    }
    if (attendees.length > 5e3) {
      res.status(400).json({ error: "PAYLOAD_TOO_LARGE", message: "Maximum batch import limit is 5,000 attendees per request." });
      return;
    }
    const summary = await dbService.importStudentsBatch(req.params.id, admin.userId, attendees, scanConfig);
    res.json({ success: true, ...summary });
  } catch (err) {
    res.status(400).json({ error: "IMPORT_ERROR", message: err.message });
  }
});
app.delete("/api/events/:id/students/:studentId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    await dbService.deleteStudent(req.params.id, req.params.studentId, admin.userId);
    res.json({ success: true, message: "Attendee removed successfully." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.delete("/api/students/:studentId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const deleted = await dbService.deleteStudentById(req.params.studentId, admin.userId);
    if (!deleted) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attendee not found." });
      return;
    }
    res.json({ success: true, message: "Attendee removed successfully." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.patch("/api/students/:studentId/checkin-status", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { is_checked_in } = req.body;
    const updated = await dbService.toggleStudentCheckIn(req.params.studentId, !!is_checked_in, admin.userId);
    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attendee not found." });
      return;
    }
    if (is_checked_in) {
      const adminDisplayName = admin.name ? `Admin (${admin.name})` : "Admin Console";
      broadcastToEventStream(updated.event_id, {
        type: "SCAN_EVENT",
        eventId: updated.event_id,
        scan: {
          id: "manual-scan-" + Date.now(),
          event_id: updated.event_id,
          student_id: updated.id,
          scanned_value: updated.usn || updated.qr_code || "MANUAL-CHECKIN",
          scan_type: "QR",
          result: "success",
          reason: "Manual Admission via Admin Console",
          scanner_id: admin.userId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          student: updated,
          scanner: {
            id: admin.userId,
            name: adminDisplayName
          }
        },
        student: updated,
        scanner: {
          id: admin.userId,
          name: adminDisplayName
        },
        isCheckIn: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    res.json({ success: true, student: updated });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.get("/api/events/:id/scanners", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const scanners = await dbService.getScannersByEvent(req.params.id, admin.userId);
    res.json({ scanners });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.post("/api/events/:id/scanners", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const scanner = await dbService.createScanner(req.params.id, admin.userId, req.body);
    res.status(201).json({ success: true, scanner });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.patch("/api/events/:id/scanners/:scannerId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const updated = await dbService.updateScanner(req.params.id, req.params.scannerId, admin.userId, req.body);
    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND", message: "Scanner account not found." });
      return;
    }
    res.json({ success: true, scanner: updated });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.patch("/api/scanners/:scannerId/status", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { is_active } = req.body;
    const updated = await dbService.toggleScannerStatusById(req.params.scannerId, admin.userId, Boolean(is_active));
    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND", message: "Scanner account not found." });
      return;
    }
    res.json({ success: true, scanner: updated });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.delete("/api/events/:id/scanners/:scannerId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    await dbService.deleteScanner(req.params.id, req.params.scannerId, admin.userId);
    res.json({ success: true, message: "Scanner deleted." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.delete("/api/scanners/:scannerId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    await dbService.deleteScannerById(req.params.scannerId, admin.userId);
    res.json({ success: true, message: "Scanner deleted." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.get("/api/scanner/my-access", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const eventId = req.query.eventId;
    const request = await dbService.getMyScannerAccess(session.userId, eventId);
    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.post("/api/scanner/request-access", requireScannerOrAdmin, requestAccessLimiter, async (req, res) => {
  try {
    const session = req.user;
    const { referralCode, userName } = req.body;
    if (!referralCode) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Referral code is required." });
      return;
    }
    const effectiveName = typeof userName === "string" && userName.trim() || session.name;
    const request = await dbService.createScannerAccessRequest(
      session.userId,
      session.email,
      effectiveName,
      referralCode
    );
    res.status(201).json({ success: true, request });
  } catch (err) {
    if (err.code === "COOLDOWN_ACTIVE") {
      res.status(429).json({
        error: "COOLDOWN_ACTIVE",
        message: err.message,
        remainingSeconds: err.remainingSeconds
      });
      return;
    }
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.get("/api/events/:id/referral-codes", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const codes = await dbService.getReferralCodes(req.params.id, admin.userId);
    res.json({ codes });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.post("/api/events/:id/referral-codes", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const code = await dbService.createReferralCode(req.params.id, admin.userId, null);
    res.status(201).json({ success: true, code });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.patch("/api/events/:id/referral-codes/:codeId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { status } = req.body;
    const code = await dbService.toggleReferralCode(req.params.codeId, req.params.id, admin.userId, status);
    res.json({ success: true, code });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.get("/api/events/:id/scanner-requests", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const requests = await dbService.getScannerRequestsByEvent(req.params.id, admin.userId);
    res.json({ requests });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.post("/api/events/:id/scanner-requests/:reqId/approve", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { scannerId, gateName, durationHours } = req.body;
    const request = await dbService.approveScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId,
      scannerId,
      gateName,
      durationHours ? parseInt(durationHours, 10) : void 0
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.post("/api/events/:id/scanner-requests/:reqId/reject", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const { reason } = req.body;
    const request = await dbService.rejectScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId,
      reason
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.post("/api/events/:id/scanner-requests/:reqId/revoke", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const request = await dbService.revokeScannerRequest(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.post("/api/events/:id/scanner-requests/:reqId/block", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const request = await dbService.blockScannerUser(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.post("/api/events/:id/scanner-requests/:reqId/unblock", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const request = await dbService.unblockScannerUser(
      req.params.reqId,
      req.params.id,
      admin.userId
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.delete("/api/events/:id/scanner-requests/:reqId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    await dbService.deleteScannerAccessRequest(req.params.reqId, req.params.id, admin.userId);
    res.json({ success: true, message: "Scanner request deleted." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.delete("/api/scanner-requests/:reqId", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    await dbService.deleteScannerAccessRequest(req.params.reqId, void 0, admin.userId);
    res.json({ success: true, message: "Scanner request deleted." });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
var sseClientsByEvent = /* @__PURE__ */ new Map();
function broadcastToEventStream(eventId, payload) {
  const clients = sseClientsByEvent.get(eventId);
  if (!clients || clients.size === 0) return;
  const message = `data: ${JSON.stringify(payload)}

`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
    }
  }
}
app.get("/api/events/:id/live-stream", (req, res) => {
  const eventId = req.params.id;
  if (!eventId) {
    res.status(400).end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Credentials": "true"
  });
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", eventId, timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  if (!sseClientsByEvent.has(eventId)) {
    sseClientsByEvent.set(eventId, /* @__PURE__ */ new Set());
  }
  const clientSet = sseClientsByEvent.get(eventId);
  clientSet.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 2e4);
  req.on("close", () => {
    clearInterval(heartbeat);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseClientsByEvent.delete(eventId);
    }
  });
});
app.post("/api/scan/validate", requireScannerOrAdmin, scanLimiter, async (req, res) => {
  try {
    const session = req.user;
    const { eventId, scannedValue, scanType, clientScanId, secondaryValue } = req.body;
    if (!eventId || !scannedValue || !scanType) {
      res.status(422).json({
        error: "VALIDATION_ERROR",
        message: "Missing required parameters: eventId, scannedValue, scanType."
      });
      return;
    }
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: authCheck.reason || "Scanner is not authorized to perform check-ins for this event."
      });
      return;
    }
    const incomingDeviceUuid = req.headers["x-device-uuid"] || req.body?.deviceUuid || req.body?.device_uuid;
    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }
    const isAdminUser = session.role === "ADMIN" || authCheck.gateName === "Admin Terminal";
    const scannerId = isAdminUser ? void 0 : authCheck.scannerId;
    const result = await dbService.processCheckIn({
      eventId,
      scannedValue,
      scanType,
      scannerId,
      clientScanId,
      source: "online",
      secondaryValue
    });
    const adminDisplayName = session.name ? `Admin (${session.name})` : "Admin (Organizer)";
    const scannerName = isAdminUser ? adminDisplayName : session.name || authCheck.scannerName || "Gate Scanner";
    broadcastToEventStream(eventId, {
      type: "SCAN_EVENT",
      eventId,
      scan: {
        id: "scan-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        event_id: eventId,
        student_id: result.student?.id || null,
        scanned_value: scannedValue,
        scan_type: scanType,
        result: result.status === "SUCCESS" || result.status === "IDEMPOTENT_SUCCESS" ? "success" : result.status === "DUPLICATE_CHECKIN" ? "duplicate" : "invalid",
        reason: result.message,
        scanner_id: isAdminUser ? session.userId : scannerId || session.userId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        student: result.student,
        scanner: {
          id: isAdminUser ? session.userId : scannerId || session.userId,
          name: scannerName
        }
      },
      student: result.student,
      scanner: {
        id: isAdminUser ? session.userId : scannerId || session.userId,
        name: scannerName
      },
      isCheckIn: result.status === "SUCCESS" || result.status === "IDEMPOTENT_SUCCESS",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json(result);
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.post("/api/scan/batch-sync", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    const { eventId, scans, deviceUuid } = req.body;
    if (!eventId || !Array.isArray(scans)) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid payload format. eventId and scans array are required." });
      return;
    }
    if (scans.length > 500) {
      res.status(400).json({
        error: "PAYLOAD_TOO_LARGE",
        message: "Batch sync limit is 500 scans per request."
      });
      return;
    }
    const authCheck = await dbService.validateScannerEventAccess(session.userId, eventId);
    if (!authCheck.authorized) {
      res.status(403).json({
        error: "FORBIDDEN",
        code: "SCANNER_REVOKED",
        message: authCheck.reason || "Scanner access has been revoked or expired for this event."
      });
      return;
    }
    const incomingDeviceUuid = req.headers["x-device-uuid"] || deviceUuid || req.body?.device_uuid;
    if (!enforceDeviceBinding(session, incomingDeviceUuid, res)) {
      return;
    }
    const scannerId = authCheck.scannerId || (session.role === "ADMIN" ? session.userId : void 0);
    const results = [];
    for (const scan of scans) {
      const clientScanId = scan.client_scan_id;
      const scannedVal = scan.scanned_value;
      const scanType = scan.scan_type || "QR";
      if (!clientScanId || !scannedVal) {
        results.push({
          client_scan_id: clientScanId || "unknown",
          success: false,
          status: "INVALID_PAYLOAD",
          message: "Missing client_scan_id or scanned_value in queued item."
        });
        continue;
      }
      try {
        const outcome = await dbService.processCheckIn({
          eventId,
          scannedValue: scannedVal,
          scanType,
          scannerId,
          clientScanId,
          source: "offline_sync"
        });
        if (outcome.status === "DUPLICATE_CHECKIN") {
          results.push({
            client_scan_id: clientScanId,
            success: false,
            status: "POST_SYNC_DUPLICATE_CONFLICT",
            conflict_reason: outcome.message || "Already checked in by another terminal prior to sync arrival.",
            student: outcome.student,
            check_in_at: outcome.check_in_at,
            message: "POST-SYNC CONFLICT \u2014 Attendee was already checked in on the cloud."
          });
        } else {
          results.push({
            client_scan_id: clientScanId,
            success: outcome.success,
            status: outcome.status,
            server_check_in_id: outcome.check_in_id,
            student: outcome.student,
            check_in_at: outcome.check_in_at,
            message: outcome.message
          });
        }
      } catch (itemErr) {
        console.error(`[BatchSync] Error processing scan ${clientScanId}:`, itemErr);
        results.push({
          client_scan_id: clientScanId,
          success: false,
          status: "SERVER_ERROR",
          message: itemErr.message || "Unexpected server error during check-in processing."
        });
      }
    }
    res.json({
      success: true,
      processed: results.length,
      device_uuid: deviceUuid,
      results
    });
  } catch (err) {
    console.error("Batch sync endpoint error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.get("/api/events/:id/scans", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    if (session.role === "SCANNER" && session.eventId !== req.params.id) {
      res.status(403).json({ error: "FORBIDDEN", message: "Unauthorized event access." });
      return;
    }
    const adminId = session.role === "ADMIN" ? session.userId : void 0;
    const { result, scannerId, search } = req.query;
    const limit = req.query.limit !== void 0 ? parseInt(req.query.limit, 10) : void 0;
    const offset = req.query.offset !== void 0 ? parseInt(req.query.offset, 10) : void 0;
    const scans = await dbService.getScanHistory(req.params.id, adminId, {
      result,
      scannerId,
      search,
      limit,
      offset
    });
    res.json({ scans, total: scans.length });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.delete("/api/events/:id/scans", requireScannerOrAdmin, async (req, res) => {
  try {
    const session = req.user;
    if (session.role === "SCANNER" && session.eventId !== req.params.id) {
      res.status(403).json({ error: "FORBIDDEN", message: "Unauthorized event access." });
      return;
    }
    const { scanIds } = req.body || {};
    const result = await dbService.clearScanHistory(req.params.id, {
      scanIds: Array.isArray(scanIds) ? scanIds : void 0
    });
    broadcastToEventStream(req.params.id, {
      type: "LOGS_CLEARED",
      eventId: req.params.id,
      scanIds: Array.isArray(scanIds) ? scanIds : void 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({
      success: true,
      message: scanIds && scanIds.length > 0 ? `Successfully cleared ${result.count} selected scan record(s).` : `Successfully cleared all ${result.count} scan record(s).`,
      count: result.count
    });
  } catch (err) {
    res.status(400).json({ error: "ERROR", message: err.message });
  }
});
app.get("/api/events/:id/activity", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const limit = req.query.limit !== void 0 ? parseInt(req.query.limit, 10) : 50;
    const offset = req.query.offset !== void 0 ? parseInt(req.query.offset, 10) : 0;
    const logs = await dbService.getActivityLogs(req.params.id, admin.userId, limit, offset);
    res.json({ logs });
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
app.delete("/api/events/:id/activity", requireAdminAuth, async (_req, res) => {
  res.status(403).json({
    error: "AUDIT_LOG_IMMUTABLE",
    message: "Audit logs are strictly immutable and cannot be deleted."
  });
});
app.post("/api/events/:id/export-token", requireAdminAuth, async (req, res) => {
  try {
    const admin = req.user;
    const event = await dbService.getEventById(req.params.id, admin.userId);
    if (!event) {
      res.status(404).json({ error: "NOT_FOUND", message: "Event not found or unauthorized." });
      return;
    }
    const token = `exp_${import_crypto2.default.randomBytes(24).toString("hex")}`;
    exportTokens.set(token, {
      eventId: req.params.id,
      adminId: admin.userId,
      expiresAt: Date.now() + 60 * 1e3
      // 60s single-use TTL
    });
    res.json({ token, expiresIn: 60 });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});
app.get("/api/events/:id/export", async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Valid export token is required." });
      return;
    }
    const tokenData = exportTokens.get(token);
    if (!tokenData || tokenData.eventId !== req.params.id || tokenData.expiresAt < Date.now()) {
      if (tokenData) exportTokens.delete(token);
      res.status(403).json({ error: "FORBIDDEN", message: "Export token is invalid or has expired." });
      return;
    }
    exportTokens.delete(token);
    const csvContent = await dbService.generateAttendanceCSV(tokenData.eventId, tokenData.adminId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="admitto-attendance-${req.params.id.substring(0, 8)}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(403).json({ error: "FORBIDDEN", message: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!sbUrl || !sbKey || sbUrl.includes("placeholder") || sbKey.includes("placeholder")) {
      console.error("[FATAL] Production startup aborted: Supabase credentials are missing or placeholder in production environment.");
      process.exit(1);
    }
  }
  const distPath = import_path2.default.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production" || import_fs2.default.existsSync(import_path2.default.join(distPath, "index.html")) && (process.argv[1]?.includes("dist") || !process.argv[1]?.endsWith("server.ts"));
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("[ADMITTO Server] Production mode active.");
    const indexPath = import_path2.default.join(distPath, "index.html");
    if (import_fs2.default.existsSync(indexPath)) {
      app.use(import_express.default.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      app.get("/", (_req, res) => {
        res.json({
          service: "ADMITTO Backend API",
          status: "online",
          health: "/api/health",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ADMITTO Server] Live and running on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer().catch((err) => {
    console.error("Failed to start ADMITTO server:", err);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activeSessions,
  authLimiter,
  boundScannerDevices,
  broadcastToEventStream,
  enforceDeviceBinding,
  invalidateUserSessions,
  requestAccessLimiter,
  resetScannerDeviceBindings,
  scanLimiter
});
//# sourceMappingURL=server.cjs.map
