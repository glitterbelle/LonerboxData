"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as d3 from "d3";
import "../../styles/globals.css"; // Ensure this path is correct

type IndividualClaim = {
  Name: string;
  "Date of death": string;
  "Orient claim": string;
  "Orient note": string;
  "al-Qassam entry": string;
  Verdict: string;
  "Additional notes": string;
};

type VerdictSummary = {
  verdict: string;
  count: number;
};

export default function VerdictsPage() {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const [verdicts, setVerdicts] = useState<VerdictSummary[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load CSV data
  useEffect(() => {
    fetch("/cast_lead_lonerbox_data.csv")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        Papa.parse<IndividualClaim>(csvText, {
          header: true,
          complete: (result) => {
            console.log("Parsed data:", result.data); // Debugging log
            setData(result.data);
            generateVerdicts(result.data);
          },
        });
      })
      .catch((error) => console.error("Error fetching CSV:", error)); // Debugging log
  }, []);

  // Generate verdicts summary from data
  const generateVerdicts = (claims: IndividualClaim[]) => {
    const verdictMap: Record<string, VerdictSummary> = {};

    claims.forEach((claim) => {
      const verdict = claim.Verdict?.trim();
      if (verdict) {
        if (!verdictMap[verdict]) {
          verdictMap[verdict] = {
            verdict,
            count: 0,
          };
        }
        verdictMap[verdict].count += 1;
      }
    });

    const verdictSummary = Object.values(verdictMap);
    console.log("Generated verdicts:", verdictSummary); // Debugging log
    setVerdicts(verdictSummary);
  };

  // Create the D3 bar chart
  useEffect(() => {
    if (verdicts.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };

    svg.attr("width", width).attr("height", height);

    const x = d3.scaleBand()
      .domain(verdicts.map(d => d.verdict))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(verdicts, d => d.count) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(verdicts.map(d => d.verdict));

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.selectAll(".bar")
      .data(verdicts)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.verdict)!)
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.count))
      .attr("fill", d => color(d.verdict));

  }, [verdicts]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-200">Verdicts Summary</h1>
      <div className="overflow-x-auto mb-10">
        <table className="table-auto w-full border-collapse border border-gray-600 bg-gray-800 text-gray-100">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-center">Verdict</th>
              <th className="border px-4 py-2 text-center">Count</th>
            </tr>
          </thead>
          <tbody>
            {verdicts.length > 0 ? (
              verdicts.map((verdict, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
                  <td className="border px-4 py-2 text-center">{verdict.verdict}</td>
                  <td className="border px-4 py-2 text-center">{verdict.count}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-center py-4">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Deaths by Verdict</h2>
      <svg ref={svgRef}></svg>
    </div>
  );
}