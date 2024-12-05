"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as d3 from "d3";
import "../../styles/globals.css"; // Ensure this path is correct

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

type LossSummary = {
  claim: string;
  militia: number;
  civilian: number;
  total: number;
};

export default function MilitantVsCivilianPage() {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const [lossSummary, setLossSummary] = useState<LossSummary[]>([]);
  const pieRef2 = useRef<SVGSVGElement | null>(null);

  // Load CSV data
  useEffect(() => {
    fetch("/lonerbox_palestinian_police_data.csv")
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
            setData(result.data);
            generateLossSummary(result.data);
          },
        });
      })
      .catch((error) => console.error("Error fetching CSV:", error));
  }, []);

  // Generate loss summary from data
  const generateLossSummary = (claims: IndividualClaim[]) => {
    const summaryMap: Record<string, LossSummary> = {};

    claims.forEach((claim) => {
      const orientClaim = claim["Orient Affiliation"]?.trim();

      if (orientClaim) {
        if (!summaryMap[orientClaim]) {
          summaryMap[orientClaim] = {
            claim: orientClaim,
            militia: 0,
            civilian: 0,
            total: 0,
          };
        }
        if (orientClaim.includes("Civilian") || orientClaim.includes("Unaffiliated")) {
          summaryMap[orientClaim].civilian += 1;
        } else {
          summaryMap[orientClaim].militia += 1;
        }
        summaryMap[orientClaim].total += 1;
      }
    });

    const summary = Object.values(summaryMap);
    setLossSummary(summary);
  };

  // Create the D3 pie chart for Militant vs Civilian Casualties
  useEffect(() => {
    if (lossSummary.length === 0) return;

    const pieSvg2 = d3.select(pieRef2.current);
    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 150, bottom: 50, left: 50 };
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
    const color = d3.scaleOrdinal()
      .domain(["Militia", "Civilian"])
      .range(["blue", "orange"]);

    const totalMilitia = d3.sum(lossSummary, d => d.militia);
    const totalCivilian = d3.sum(lossSummary, d => d.civilian);

    const data = [
      { label: "Militia", value: totalMilitia },
      { label: "Civilian", value: totalCivilian }
    ];

    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const pieGroup = pieSvg2.attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = pieGroup.selectAll("path")
      .data(pie(data))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label));

    pieGroup.selectAll("text.label")
      .data(pie(data))
      .enter().append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "14px") // Increase font size
      .style("font-weight", "bold") // Make text bold
      .style("fill", "black") // Ensure text is readable
      .text(d => `${d.data.label}: ${((d.data.value / (totalMilitia + totalCivilian)) * 100).toFixed(1)}% (${d.data.value})`);

  }, [lossSummary]);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Militant vs Civilian Casualties</h2>
      <div className="flex justify-center items-center">
        <div className="p-4 bg-gray-700 rounded-lg shadow-lg border border-gray-600">
          <svg ref={pieRef2}></svg>
        </div>
      </div>
    </div>
  );
}