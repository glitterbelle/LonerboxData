"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import "../styles/globals.css"; // Ensure this path is correct

type IndividualClaim = {
  Name: string;
  "Arabic Name": string;
  "Date of death": string;
  "Orient Affiliation": string;
  "Orient additional info": string;
  "Al-Qassam profile": string;
  "Additional Info": string;
  Verdict: string;
};

export default function OrganizationsPage() {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const [filteredData, setFilteredData] = useState<IndividualClaim[]>([]);
  const [filters, setFilters] = useState({
    orientAffiliation: '',
    verdict: '',
  });

  // Load CSV data
  useEffect(() => {
    fetch("/lonerbox_palestinian_police_data.csv")
      .then((response) => response.text())
      .then((csvText) => {
        Papa.parse<IndividualClaim>(csvText, {
          header: true,
          complete: (result) => {
            setData(result.data);
            setFilteredData(result.data);
          },
        });
      });
  }, []);

  // Update filtered data based on filters
  useEffect(() => {
    const filtered = data.filter((entry) => {
      const matchesOrientAffiliation = !filters.orientAffiliation || entry["Orient Affiliation"] === filters.orientAffiliation;
      const matchesVerdict = !filters.verdict || entry.Verdict === filters.verdict;
      return matchesOrientAffiliation && matchesVerdict;
    });
    setFilteredData(filtered);
  }, [filters, data]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-200">Organizations</h1>
      <div className="flex justify-center mb-4">
        <div className="mr-4">
          <label className="block text-gray-200 mb-2" htmlFor="orientAffiliation">Orient Affiliation</label>
          <select
            id="orientAffiliation"
            className="block w-full bg-gray-700 text-gray-200 border border-gray-600 rounded py-2 px-3"
            value={filters.orientAffiliation}
            onChange={(e) => handleFilterChange('orientAffiliation', e.target.value)}
          >
            <option value="">All</option>
            {/* Add options dynamically based on data */}
            {[...new Set(data.map(item => item["Orient Affiliation"]))].map((affiliation, index) => (
              <option key={index} value={affiliation}>{affiliation}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-200 mb-2" htmlFor="verdict">Verdict</label>
          <select
            id="verdict"
            className="block w-full bg-gray-700 text-gray-200 border border-gray-600 rounded py-2 px-3"
            value={filters.verdict}
            onChange={(e) => handleFilterChange('verdict', e.target.value)}
          >
            <option value="">All</option>
            {/* Add options dynamically based on data */}
            {[...new Set(data.map(item => item.Verdict))].map((verdict, index) => (
              <option key={index} value={verdict}>{verdict}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-600 bg-gray-800 text-gray-100">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-center">Name</th>
              <th className="border px-4 py-2 text-center">Arabic Name</th>
              <th className="border px-4 py-2 text-center">Date of death</th>
              <th className="border px-4 py-2 text-center">Orient Affiliation</th>
              <th className="border px-4 py-2 text-center">Orient additional info</th>
              <th className="border px-4 py-2 text-center">Al-Qassam profile</th>
              <th className="border px-4 py-2 text-center">Verdict</th>
              <th className="border px-4 py-2 text-center notes">Additional Info</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
                  <td className="border px-4 py-2 text-center">{row.Name}</td>
                  <td className="border px-4 py-2 text-center">{row["Arabic Name"]}</td>
                  <td className="border px-4 py-2 text-center">{row["Date of death"]}</td>
                  <td className="border px-4 py-2 text-center">{row["Orient Affiliation"]}</td>
                  <td className="border px-4 py-2">{row["Orient additional info"]}</td>
                  <td className="border px-4 py-2 text-center">{row["Al-Qassam profile"]}</td>
                  <td className="border px-4 py-2 text-center">{row.Verdict}</td>
                  <td className="border px-4 py-2 notes">{row["Additional Info"]}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-4">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}