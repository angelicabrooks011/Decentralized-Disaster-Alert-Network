import { describe, it, expect, beforeEach } from "vitest";
import { ClarityValue, cvToValue, stringAsciiCV, uintCV, tupleCV, intCV, buffCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_CATEGORY = 101;
const ERR_INVALID_GEOLOCATION = 102;
const ERR_INVALID_EVIDENCE_HASH = 103;
const ERR_INVALID_SEVERITY = 104;
const ERR_INVALID_STATUS = 105;
const ERR_ALERT_ALREADY_EXISTS = 106;
const ERR_ALERT_NOT_FOUND = 107;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_ALERT_TYPE = 115;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_ALERTS_EXCEEDED = 114;
const ERR_INVALID_REGION = 118;
const ERR_INVALID_PROOF = 119;
const ERR_INVALID_RESOLUTION = 120;

interface Alert {
  reporter: string;
  timestamp: number;
  category: string;
  geolocation: { lat: number; lon: number };
  evidenceHash: Uint8Array;
  severity: number;
  status: string;
  validationCount: number;
  bountyEarned: number;
  alertType: string;
  reporterRep: number;
  region: string;
  proofLevel: number;
  resolutionTime: number;
}

interface AlertUpdate {
  updateCategory: string;
  updateSeverity: number;
  updateStatus: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class AlertRegistryMock {
  state: {
    nextAlertId: number;
    maxAlerts: number;
    submissionFee: number;
    authorityContract: string | null;
    alerts: Map<number, Alert>;
    alertUpdates: Map<number, AlertUpdate>;
    alertsByHash: Map<string, number>;
  } = {
    nextAlertId: 0,
    maxAlerts: 10000,
    submissionFee: 100,
    authorityContract: null,
    alerts: new Map(),
    alertUpdates: new Map(),
    alertsByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextAlertId: 0,
      maxAlerts: 10000,
      submissionFee: 100,
      authorityContract: null,
      alerts: new Map(),
      alertUpdates: new Map(),
      alertsByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  submitAlert(
    category: string,
    geolocation: { lat: number; lon: number },
    evidenceHash: Uint8Array,
    severity: number,
    alertType: string,
    reporterRep: number,
    region: string,
    proofLevel: number,
    resolutionTime: number
  ): Result<number> {
    if (this.state.nextAlertId >= this.state.maxAlerts) return { ok: false, value: ERR_MAX_ALERTS_EXCEEDED };
    if (!["FLOOD", "FIRE", "EARTHQUAKE", "TORNADO"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (geolocation.lat < -90 || geolocation.lat > 90 || geolocation.lon < -180 || geolocation.lon > 180) return { ok: false, value: ERR_INVALID_GEOLOCATION };
    if (evidenceHash.length !== 32) return { ok: false, value: ERR_INVALID_EVIDENCE_HASH };
    if (severity < 1 || severity > 10) return { ok: false, value: ERR_INVALID_SEVERITY };
    if (!["CITIZEN", "SENSOR", "OFFICIAL"].includes(alertType)) return { ok: false, value: ERR_INVALID_ALERT_TYPE };
    if (reporterRep > 1000) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (!region || region.length > 50) return { ok: false, value: ERR_INVALID_REGION };
    if (proofLevel > 5) return { ok: false, value: ERR_INVALID_PROOF };
    if (resolutionTime <= 0) return { ok: false, value: ERR_INVALID_RESOLUTION };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const hashKey = evidenceHash.toString();
    if (this.state.alertsByHash.has(hashKey)) return { ok: false, value: ERR_ALERT_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.submissionFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextAlertId;
    const alert: Alert = {
      reporter: this.caller,
      timestamp: this.blockHeight,
      category,
      geolocation,
      evidenceHash,
      severity,
      status: "PENDING",
      validationCount: 0,
      bountyEarned: 0,
      alertType,
      reporterRep,
      region,
      proofLevel,
      resolutionTime,
    };
    this.state.alerts.set(id, alert);
    this.state.alertsByHash.set(hashKey, id);
    this.state.nextAlertId++;
    return { ok: true, value: id };
  }

  getAlert(id: number): Alert | null {
    return this.state.alerts.get(id) || null;
  }

  updateAlert(id: number, updateCategory: string, updateSeverity: number, updateStatus: string): Result<boolean> {
    const alert = this.state.alerts.get(id);
    if (!alert) return { ok: false, value: false };
    if (alert.reporter !== this.caller) return { ok: false, value: false };
    if (!["FLOOD", "FIRE", "EARTHQUAKE", "TORNADO"].includes(updateCategory)) return { ok: false, value: false };
    if (updateSeverity < 1 || updateSeverity > 10) return { ok: false, value: false };
    if (!["PENDING", "VALIDATED", "REJECTED", "RESOLVED"].includes(updateStatus)) return { ok: false, value: false };

    const updated: Alert = {
      ...alert,
      category: updateCategory,
      severity: updateSeverity,
      status: updateStatus,
      timestamp: this.blockHeight,
    };
    this.state.alerts.set(id, updated);
    this.state.alertUpdates.set(id, {
      updateCategory,
      updateSeverity,
      updateStatus,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getAlertCount(): Result<number> {
    return { ok: true, value: this.state.nextAlertId };
  }

  checkAlertExistence(hash: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.alertsByHash.has(hash.toString()) };
  }
}

describe("AlertRegistry", () => {
  let contract: AlertRegistryMock;

  beforeEach(() => {
    contract = new AlertRegistryMock();
    contract.reset();
  });

  it("submits an alert successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(1);
    const result = contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const alert = contract.getAlert(0);
    expect(alert?.category).toBe("FLOOD");
    expect(alert?.geolocation).toEqual({ lat: 40, lon: -74 });
    expect(alert?.severity).toBe(5);
    expect(alert?.status).toBe("PENDING");
    expect(alert?.alertType).toBe("CITIZEN");
    expect(alert?.reporterRep).toBe(100);
    expect(alert?.region).toBe("New York");
    expect(alert?.proofLevel).toBe(3);
    expect(alert?.resolutionTime).toBe(3600);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate alert hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(1);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    const result = contract.submitAlert(
      "FIRE",
      { lat: 34, lon: -118 },
      evidenceHash,
      7,
      "SENSOR",
      200,
      "Los Angeles",
      4,
      7200
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALERT_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const evidenceHash = new Uint8Array(32).fill(2);
    const result = contract.submitAlert(
      "EARTHQUAKE",
      { lat: 37, lon: -122 },
      evidenceHash,
      8,
      "OFFICIAL",
      300,
      "San Francisco",
      5,
      10800
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects alert submission without authority contract", () => {
    const evidenceHash = new Uint8Array(32).fill(3);
    const result = contract.submitAlert(
      "TORNADO",
      { lat: 41, lon: -87 },
      evidenceHash,
      6,
      "CITIZEN",
      150,
      "Chicago",
      2,
      5400
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid category", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(4);
    const result = contract.submitAlert(
      "INVALID",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CATEGORY);
  });

  it("rejects invalid geolocation", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(5);
    const result = contract.submitAlert(
      "FLOOD",
      { lat: 100, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GEOLOCATION);
  });

  it("rejects invalid evidence hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(31).fill(6);
    const result = contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EVIDENCE_HASH);
  });

  it("rejects invalid severity", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(7);
    const result = contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      11,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SEVERITY);
  });

  it("rejects invalid alert type", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(8);
    const result = contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "INVALID",
      100,
      "New York",
      3,
      3600
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ALERT_TYPE);
  });

  it("updates an alert successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(9);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    const result = contract.updateAlert(0, "FIRE", 7, "VALIDATED");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const alert = contract.getAlert(0);
    expect(alert?.category).toBe("FIRE");
    expect(alert?.severity).toBe(7);
    expect(alert?.status).toBe("VALIDATED");
    const update = contract.state.alertUpdates.get(0);
    expect(update?.updateCategory).toBe("FIRE");
    expect(update?.updateSeverity).toBe(7);
    expect(update?.updateStatus).toBe("VALIDATED");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent alert", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateAlert(99, "FIRE", 7, "VALIDATED");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-reporter", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(10);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateAlert(0, "FIRE", 7, "VALIDATED");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets submission fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setSubmissionFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.submissionFee).toBe(200);
    const evidenceHash = new Uint8Array(32).fill(11);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects submission fee change without authority contract", () => {
    const result = contract.setSubmissionFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct alert count", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash1 = new Uint8Array(32).fill(12);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash1,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    const evidenceHash2 = new Uint8Array(32).fill(13);
    contract.submitAlert(
      "FIRE",
      { lat: 34, lon: -118 },
      evidenceHash2,
      7,
      "SENSOR",
      200,
      "Los Angeles",
      4,
      7200
    );
    const result = contract.getAlertCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks alert existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const evidenceHash = new Uint8Array(32).fill(14);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    const result = contract.checkAlertExistence(evidenceHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(15);
    const result2 = contract.checkAlertExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects alert submission with max alerts exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxAlerts = 1;
    const evidenceHash1 = new Uint8Array(32).fill(17);
    contract.submitAlert(
      "FLOOD",
      { lat: 40, lon: -74 },
      evidenceHash1,
      5,
      "CITIZEN",
      100,
      "New York",
      3,
      3600
    );
    const evidenceHash2 = new Uint8Array(32).fill(18);
    const result = contract.submitAlert(
      "FIRE",
      { lat: 34, lon: -118 },
      evidenceHash2,
      7,
      "SENSOR",
      200,
      "Los Angeles",
      4,
      7200
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_ALERTS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});