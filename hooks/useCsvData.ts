"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

type IndividualClaim = {
  Name: string;
  Date: string;
  "Brigade Name": string;
  "Battalion Name": string;
  "Position/Role": string;
  Bio: string;
  "Cause of Death": string;
  Organization: string;
  "Battalion Casualties": string;
};

export function useCsvData(csvPath: string) {
  const [data, setData] = useState<IndividualClaim[]>([]);

  useEffect(() => {
    fetch(csvPath)
      .then((response) => response.text())
      .then((csvText) => {
        const parsed = Papa.parse<IndividualClaim>(csvText, { header: true });
        setData(parsed.data);
      })
      .catch((error) => console.error("Error loading CSV file:", error));
  }, [csvPath]);

  return data;
}
