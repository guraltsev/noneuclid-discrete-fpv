export type XrSessionStatus =
  | "unknown"
  | "unsupported"
  | "insecure-context"
  | "available"
  | "entering"
  | "active"
  | "ended"
  | "failed";

export interface XrSessionState {
  readonly status: XrSessionStatus;
  readonly label: string;
  readonly secureContext: boolean;
  readonly immersiveVrSupported: boolean;
  readonly failureMessage?: string;
}

export interface XrNavigatorLike {
  readonly xr?: {
    isSessionSupported(mode: "immersive-vr"): Promise<boolean>;
    requestSession?(mode: "immersive-vr", options?: XRSessionInit): Promise<XRSession>;
  };
}

const labels: Record<XrSessionStatus, string> = {
  unknown: "Checking VR support",
  unsupported: "VR unsupported",
  "insecure-context": "VR requires HTTPS or localhost",
  available: "VR available",
  entering: "Entering VR",
  active: "VR active",
  ended: "VR ended",
  failed: "VR failed",
};

export function createXrSessionState(
  status: XrSessionStatus,
  options: {
    readonly secureContext?: boolean;
    readonly immersiveVrSupported?: boolean;
    readonly failureMessage?: string;
  } = {},
): XrSessionState {
  return {
    status,
    label: status === "failed" && options.failureMessage ? `${labels.failed}: ${options.failureMessage}` : labels[status],
    secureContext: options.secureContext ?? status !== "insecure-context",
    immersiveVrSupported: options.immersiveVrSupported ?? (status === "available" || status === "active"),
    failureMessage: options.failureMessage,
  };
}

export function statusLabel(status: XrSessionStatus, failureMessage?: string): string {
  return createXrSessionState(status, { failureMessage }).label;
}

export async function detectXrSessionState(
  navigatorLike: XrNavigatorLike,
  secureContext: boolean,
): Promise<XrSessionState> {
  if (!secureContext) {
    return createXrSessionState("insecure-context", {
      secureContext: false,
      immersiveVrSupported: false,
    });
  }

  if (!navigatorLike.xr) {
    return createXrSessionState("unsupported", {
      secureContext,
      immersiveVrSupported: false,
    });
  }

  try {
    const supported = await navigatorLike.xr.isSessionSupported("immersive-vr");

    return createXrSessionState(supported ? "available" : "unsupported", {
      secureContext,
      immersiveVrSupported: supported,
    });
  } catch (error) {
    return createXrSessionState("failed", {
      secureContext,
      immersiveVrSupported: false,
      failureMessage: readableError(error),
    });
  }
}

export function transitionXrSessionState(
  state: XrSessionState,
  status: XrSessionStatus,
  failureMessage?: string,
): XrSessionState {
  return createXrSessionState(status, {
    secureContext: state.secureContext,
    immersiveVrSupported: status === "unsupported" ? false : state.immersiveVrSupported,
    failureMessage,
  });
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Unable to check immersive VR support.";
}
