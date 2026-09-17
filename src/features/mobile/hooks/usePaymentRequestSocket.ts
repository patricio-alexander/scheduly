"use client";

import { useEffect } from "react";
import { getClientSocket } from "@/shared/utils/socket-client";
import type { MobilePaymentRequest } from "../types";

export function usePaymentRequestSocket(
  onRequest: (request: MobilePaymentRequest) => void,
  accountId: number | null,
) {
  useEffect(() => {
    if (!accountId) return;

    const socket = getClientSocket();
    socket.disconnect().connect();
    const handleRequest = (request: MobilePaymentRequest) => {
      onRequest(request);
    };

    socket.on("payroll:payment-requested", handleRequest);

    return () => {
      socket.off("payroll:payment-requested", handleRequest);
    };
  }, [accountId, onRequest]);
}
