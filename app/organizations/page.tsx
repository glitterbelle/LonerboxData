"use client";

import { useState, useEffect, useRef, SetStateAction } from "react";
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

type OrientClaimSummary = {
  claim: string;
  count: number;
};

type LossSummary = {
  claim: string;
  militia: number;
  civilian: number;
  total: number;
};

const groups = ["Army of Islam", "Fatah", "Hamas", "PIJ", "PRC", "Unaffiliated", "Warrior"];

export default function OrganizationsPage() {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const [orientClaims, setOrientClaims] = useState<OrientClaimSummary[]>([]);
  const [lossSummary, setLossSummary] = useState<LossSummary[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pieRef = useRef<SVGSVGElement | null>(null);
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
          complete: (result: { data: IndividualClaim[]; }) => {
            console.log("Parsed data:", result.data); // Debugging log
            setData(result.data);
            generateOrientClaims(result.data);
            generateLossSummary(result.data);
          },
        });
      })
      .catch((error) => console.error("Error fetching CSV:", error)); // Debugging log
  }, []);

  // Generate orient claims summary from data
  const generateOrientClaims = (claims: IndividualClaim[]) => {
    const claimMap: Record<string, OrientClaimSummary> = {};

    claims.forEach((claim) => {
      const orientClaim = claim["Orient Affiliation"]?.trim();
      if (orientClaim) {
        if (!claimMap[orientClaim]) {
          claimMap[orientClaim] = {
            claim: orientClaim,
            count: 0,
          };
        }
        claimMap[orientClaim].count += 1;
      } 
    });

    const claimSummary = Object.values(claimMap).sort((a, b) => a.claim.localeCompare(b.claim));
    console.log("Generated orient claims:", claimSummary); // Debugging log
    setOrientClaims(claimSummary);
  };

  // Generate loss summary from data
  const generateLossSummary = (claims: IndividualClaim[]) => {
    const summaryMap: Record<string, LossSummary> = {};

    groups.forEach((group) => {
      summaryMap[group] = {
        claim: group,
        militia: 0,
        civilian: 0,
        total: 0,
      };
    });

    claims.forEach((claim) => {
      const orientClaim = claim["Orient Affiliation"]?.trim();

      if (orientClaim) {
        const group = groups.find(g => orientClaim.includes(g));
        if (group) {
          if (orientClaim.includes("Civilian") || orientClaim.includes("Unaffiliated")) {
            summaryMap[group].civilian += 1;
          } else {
            summaryMap[group].militia += 1;
          }
          summaryMap[group].total += 1;
        }
      }
    });

    const summary = Object.values(summaryMap).sort((a, b) => a.claim.localeCompare(b.claim));
    console.log("Generated loss summary:", summary); // Debugging log
    setLossSummary(summary);
  };

  // Create the D3 bar chart
  useEffect(() => {
    if (lossSummary.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };

    svg.attr("width", width).attr("height", height);

    const x = d3.scaleBand()
      .domain(lossSummary.map(d => d.claim))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(lossSummary, (d: { total: any; }) => d.total) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const colorMap: Record<string, string> = {
      "Army of Islam": "white",
      "Fatah": "yellow",
      "Hamas": "green",
      "PIJ": "black and yellow stripes",
      "PRC": "black and white stripes",
      "Unaffiliated": "grey",
      "Warrior": "red"
    };

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
      .data(lossSummary)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", (d: { claim: any; }) => x(d.claim)!)
      .attr("y", (d: { total: any; }) => y(d.total))
      .attr("width", x.bandwidth())
      .attr("height", (d: { total: any; }) => y(0) - y(d.total))
      .attr("fill", (d: { claim: string | number; }) => colorMap[d.claim] || "grey");

  }, [lossSummary]);

  // Create the D3 pie chart for Militia Losses by Orient Affiliation
  useEffect(() => {
    if (lossSummary.length === 0) return;

    const pieSvg = d3.select(pieRef.current);
    const width = 800;
    const height = 400;
    const radius = Math.min(width, height) / 2;
    const color = d3.scaleOrdinal()
      .domain(groups)
      .range(["white", "yellow", "green", "black", "black", "grey", "red"]);

    const pie = d3.pie<LossSummary>().value((d: { militia: any; }) => d.militia);
    const arc = d3.arc<d3.PieArcDatum<LossSummary>>()
      .innerRadius(0)
      .outerRadius(radius);

    const pieGroup = pieSvg.attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = pieGroup.selectAll("path")
      .data(pie(lossSummary))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", (d: { data: { claim: any; }; }) => color(d.data.claim));

    const totalMilitia = d3.sum(lossSummary, (d: { militia: any; }) => d.militia);

    pieGroup.selectAll("text")
      .data(pie(lossSummary))
      .enter().append("text")
      .attr("transform", (d: any) => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text((d: { data: { claim: any; militia: number; }; }) => `${d.data.claim}: ${((d.data.militia / totalMilitia) * 100).toFixed(1)}% (${d.data.militia})`);

  }, [lossSummary]);

  // Create the D3 pie chart for Militant vs Civilian Casualties
  useEffect(() => {
    if (lossSummary.length === 0) return;

    const pieSvg2 = d3.select(pieRef2.current);
    const width = 800;
    const height = 400;
    const radius = Math.min(width, height) / 2;
    const color = d3.scaleOrdinal()
      .domain(["Militia", "Civilian"])
      .range(["blue", "orange"]);

    const totalMilitia = d3.sum(lossSummary, (d: { militia: any; }) => d.militia);
    const totalCivilian = d3.sum(lossSummary, (d: { civilian: any; }) => d.civilian);

    const data = [
      { label: "Militia", value: totalMilitia },
      { label: "Civilian", value: totalCivilian }
    ];

    const pie = d3.pie<{ label: string; value: number }>().value((d: { value: any; }) => d.value);
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
      .attr("fill", (d: { data: { label: any; }; }) => color(d.data.label));

    pieGroup.selectAll("text")
      .data(pie(data))
      .enter().append("text")
      .attr("transform", (d: any) => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text((d: { data: { label: any; value: number; }; }) => `${d.data.label}: ${((d.data.value / (totalMilitia + totalCivilian)) * 100).toFixed(1)}% (${d.data.value})`);

  }, [lossSummary]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-10 text-center text-gray-200">Orient Claims Summary</h1>
      <div className="overflow-x-auto mb-10">
        <table className="table-auto w-full border-collapse border border-gray-600 bg-gray-800 text-gray-100">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-center">Orient Affiliation</th>
              <th className="border px-4 py-2 text-center">Count</th>
            </tr>
          </thead>
          <tbody>
            {orientClaims.length > 0 ? (
              orientClaims.map((claim, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
                  <td className="border px-4 py-2 text-center">{claim.claim}</td>
                  <td className="border px-4 py-2 text-center">{claim.count}</td>
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
      <div className="overflow-x-auto mb-10">
        <table className="table-auto w-full border-collapse border border-gray-600 bg-gray-800 text-gray-100">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-center">Orient Affiliation</th>
              <th className="border px-4 py-2 text-center">Militia</th>
              <th className="border px-4 py-2 text-center">Civilian</th>
              <th className="border px-4 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {lossSummary.length > 0 ? (
              lossSummary.map((summary, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
                  <td className="border px-4 py-2 text-center">{summary.claim}</td>
                  <td className="border px-4 py-2 text-center">{summary.militia}</td>
                  <td className="border px-4 py-2 text-center">{summary.civilian}</td>
                  <td className="border px-4 py-2 text-center">{summary.total}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-4">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Deaths by Orient Affiliation</h2>
      <svg ref={svgRef}></svg>
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Militia Losses by Orient Affiliation</h2>
      <div className="flex justify-center mb-10">
        <div className="p-4 bg-gray-700 rounded-lg shadow-lg border border-gray-600">
          <svg ref={pieRef}></svg>
        </div>
      </div>
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Militant vs Civilian Casualties</h2>
      <div className="flex justify-center mb-10">
        <div className="p-4 bg-gray-700 rounded-lg shadow-lg border border-gray-600">
          <svg ref={pieRef2}></svg>
        </div>
      </div>
    </div>
  );
}