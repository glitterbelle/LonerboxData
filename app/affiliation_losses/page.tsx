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

const groups = ["Army of Islam", "Fatah", "Hamas", "PIJ", "PRC", "Warrior"];

export default function PrototypePage() {
  const [data, setData] = useState<IndividualClaim[]>([]);
  const [lossSummary, setLossSummary] = useState<LossSummary[]>([]);
  const pieRef = useRef<SVGSVGElement | null>(null);

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

    const summary = Object.values(summaryMap)
      .filter(d => d.claim !== "Unaffiliated") // Remove "Unaffiliated"
      .sort((a, b) => a.militia - b.militia); // Sort by militia count (smallest to largest)
    setLossSummary(summary);
  };

  // Create the D3 pie chart for Militia Losses by Orient Affiliation
  useEffect(() => {
    if (lossSummary.length === 0) return;

    const pieSvg = d3.select(pieRef.current);
    const width = 800;
    const height = 400;
    const margin = { top: 50, right: 150, bottom: 50, left: 50 };
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
    const color = d3.scaleOrdinal()
      .domain(groups)
      .range(["white", "yellow", "green", "black", "black", "red"]);

    const pie = d3.pie<LossSummary>().value(d => d.militia);
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
      .attr("fill", d => color(d.data.claim));

    const totalMilitia = d3.sum(lossSummary, d => d.militia);

    const labelArc = d3.arc<d3.PieArcDatum<LossSummary>>()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    const labelPositions = pie(lossSummary).map((d, i) => {
      const pos = labelArc.centroid(d);
      pos[0] = radius * 1.1 * (midAngle(d) < Math.PI ? 1 : -1);
      pos[1] += i * 20 - (lossSummary.length * 10); // Adjust vertical position to avoid overlap
      return pos;
    });

    // Adjust label positions to avoid overlap
    const adjustLabelPositions = (positions: [number, number][]) => {
      const spacing = 20;
      for (let i = 1; i < positions.length; i++) {
        if (positions[i][1] - positions[i - 1][1] < spacing) {
          positions[i][1] = positions[i - 1][1] + spacing;
        }
      }
      return positions;
    };

    const adjustedLabelPositions = adjustLabelPositions(labelPositions);

    pieGroup.selectAll("polyline")
      .data(pie(lossSummary))
      .enter().append("polyline")
      .attr("points", (d, i) => {
        const pos = adjustedLabelPositions[i];
        return [arc.centroid(d), labelArc.centroid(d), pos];
      })
      .style("fill", "none")
      .style("stroke", "lightblue") // Change stroke color to light blue
      .style("stroke-width", "1px");

    pieGroup.selectAll("text.label")
      .data(pie(lossSummary))
      .enter().append("text")
      .attr("transform", (d, i) => `translate(${adjustedLabelPositions[i]})`)
      .attr("dy", "0.35em")
      .style("text-anchor", d => (midAngle(d) < Math.PI ? "start" : "end"))
      .style("font-size", "14px") // Increase font size
      .style("font-weight", "bold") // Make text bold
      .text(d => `${d.data.claim}: ${((d.data.militia / totalMilitia) * 100).toFixed(1)}% (${d.data.militia})`);

    function midAngle(d: d3.PieArcDatum<LossSummary>) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

  }, [lossSummary]);

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Militia Losses by Orient Affiliation</h2>
      <div className="flex justify-center items-center">
        <div className="p-4 bg-gray-700 rounded-lg shadow-lg border border-gray-600">
          <svg ref={pieRef}></svg>
        </div>
      </div>
    </div>
  );
}