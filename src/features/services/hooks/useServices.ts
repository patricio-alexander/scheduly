"use client";

import { useState, useEffect, useCallback } from "react";
import type { Service } from "../types";
import * as serviceService from "../services/service-service";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, refetch: fetchServices };
}
